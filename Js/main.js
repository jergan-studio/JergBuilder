import * as THREE from 'three';
import { Player } from './player.js';
import { MapGenerator } from '../Map/mapGenerator.js';

// 0. EXPOSE GLOBALS FOR MODS
window.THREE = THREE;

// Detect device type
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// --- 1. HOTBAR SYSTEM ---
const blockInventory = [
    { name: 'Grass', key: 'grass', color: '#557a2b' },
    { name: 'Gray', key: 'gray', color: '#808080' },
    { name: 'Blue', key: 'blue', color: '#1e90ff' },
    { name: 'Red', key: 'red', color: '#ff3333' },
    { name: 'Yellow', key: 'yellow', color: '#ffd700' }
];

let selectedSlotIndex = 0;

function createHotbarUI() {
    const hotbarEl = document.getElementById('hotbar');
    if (!hotbarEl) return;
    hotbarEl.innerHTML = '';

    blockInventory.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.className = `hotbar-slot ${index === selectedSlotIndex ? 'active' : ''}`;
        
        const colorBox = document.createElement('div');
        colorBox.className = 'hotbar-color-preview';
        colorBox.style.backgroundColor = item.color;

        slot.appendChild(colorBox);

        const activateSlot = (e) => {
            e.preventDefault();
            selectedSlotIndex = index;
            createHotbarUI();
        };

        slot.addEventListener('click', activateSlot);
        slot.addEventListener('touchstart', activateSlot);

        hotbarEl.appendChild(slot);
    });
}

createHotbarUI();

// Hotbar keyboard shortcuts
window.addEventListener('keydown', (e) => {
    const num = parseInt(e.key);
    if (!isNaN(num) && num >= 1 && num <= blockInventory.length) {
        selectedSlotIndex = num - 1;
        createHotbarUI();
    }
});

// --- 2. THREE.JS SCENE SETUP ---
let gameStarted = false;
let player = null;
let mapGenerator = null;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
window.scene = scene; // Expose scene globally for mods

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(30, 50, 30);
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// --- 3. MOD LOADER (FILE SCRIPT INJECTION) ---
const modFileInput = document.getElementById('mod-file-input');
if (modFileInput) {
    modFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const script = document.createElement('script');
                script.textContent = e.target.result;
                document.body.appendChild(script);
                console.log(`Mod loaded: ${file.name}`);
            } catch (err) {
                console.error(`Failed to load mod ${file.name}:`, err);
            }
        };
        reader.readAsText(file);
    });
}

// --- 4. TOUCH CONTROLS ---
function setupTouchControls() {
    const joystickZone = document.getElementById('joystick-zone');
    const joystickKnob = document.getElementById('joystick-knob');
    const cameraPad = document.getElementById('touch-camera-pad');

    if (!joystickZone || !cameraPad) return;

    let joystickActive = false;
    let originX = 0, originY = 0;

    function simulateKey(code, key, type) {
        window.dispatchEvent(new KeyboardEvent(type, {
            bubbles: true,
            code: key,
            key: key,
            keyCode: code
        }));
    }

    // Joystick Touch Events
    joystickZone.addEventListener('touchstart', (e) => {
        joystickActive = true;
        const touch = e.touches[0];
        const rect = joystickZone.getBoundingClientRect();
        originX = rect.left + rect.width / 2;
        originY = rect.top + rect.height / 2;
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (!joystickActive) return;

        const touch = e.touches[0];
        const dx = touch.clientX - originX;
        const dy = touch.clientY - originY;
        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 35);
        const angle = Math.atan2(dy, dx);

        const knobX = Math.cos(angle) * dist + 30;
        const knobY = Math.sin(angle) * dist + 30;
        joystickKnob.style.transform = `translate(\({knobX - 30}px,\){knobY - 30}px)`;

        simulateKey(87, 'KeyW', dy < -8 ? 'keydown' : 'keyup');
        simulateKey(83, 'KeyS', dy > 8 ? 'keydown' : 'keyup');
        simulateKey(65, 'KeyA', dx < -8 ? 'keydown' : 'keyup');
        simulateKey(68, 'KeyD', dx > 8 ? 'keydown' : 'keyup');
    }, { passive: false });

    window.addEventListener('touchend', () => {
        if (!joystickActive) return;
        joystickActive = false;
        joystickKnob.style.transform = 'translate(0px, 0px)';

        simulateKey(87, 'KeyW', 'keyup');
        simulateKey(83, 'KeyS', 'keyup');
        simulateKey(65, 'KeyA', 'keyup');
        simulateKey(68, 'KeyD', 'keyup');
    });

    // Mobile Action Buttons
    document.getElementById('btn-mobile-jump')?.addEventListener('touchstart', (e) => {
        e.preventDefault();
        simulateKey(32, 'Space', 'keydown');
    });
    document.getElementById('btn-mobile-jump')?.addEventListener('touchend', (e) => {
        e.preventDefault();
        simulateKey(32, 'Space', 'keyup');
    });

    document.getElementById('btn-mobile-break')?.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleBlockAction(0); // Mine
    });

    document.getElementById('btn-mobile-place')?.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleBlockAction(2); // Build
    });

    // Touch Camera Rotation
    let lastTouchX = 0, lastTouchY = 0;
    cameraPad.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
    });

    cameraPad.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastTouchX;
        const deltaY = touch.clientY - lastTouchY;

        window.dispatchEvent(new MouseEvent('mousemove', {
            movementX: deltaX * 1.8,
            movementY: deltaY * 1.8,
            bubbles: true
        }));

        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
    });
}

function handleBlockAction(buttonType) {
    if (!gameStarted || !player || !mapGenerator) return;

    const target = player.getLookAtBlock();
    if (!target) return;

    if (buttonType === 0) { // Mine
        mapGenerator.removeBlock(target.targetBlock.x, target.targetBlock.y, target.targetBlock.z);
    } else if (buttonType === 2) { // Place
        const activeKey = blockInventory[selectedSlotIndex].key;
        const mat = mapGenerator.materials[activeKey] || mapGenerator.materials.grass;
        mapGenerator.addBlock(target.placeBlock.x, target.placeBlock.y, target.placeBlock.z, mat);
    }
}

// PC Controls
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('mousedown', (e) => {
    if (isTouchDevice) return;
    if (document.pointerLockElement !== renderer.domElement) return;
    handleBlockAction(e.button);
});

// --- 5. LAUNCH GAME ---
function launchGame() {
    if (!gameStarted) {
        try {
            mapGenerator = new MapGenerator(scene, 'JergBuilder_World');
            mapGenerator.generate();

            player = new Player(scene, camera, mapGenerator);
            window.player = player;
            window.mapGenerator = mapGenerator;
            
            gameStarted = true;

            if (isTouchDevice) {
                setupTouchControls();
            }
        } catch (err) {
            console.error("Game Launch Error:", err);
        }
    }

    document.getElementById('ui-overlay')?.classList.add('hidden');

    if (isTouchDevice) {
        document.getElementById('touch-controls')?.classList.remove('hidden');
    } else {
        renderer.domElement.requestPointerLock();
    }
}

document.getElementById('btn-play-world')?.addEventListener('click', launchGame);

// PointerLock listener for PC
document.addEventListener('pointerlockchange', () => {
    if (!isTouchDevice) {
        if (document.pointerLockElement !== renderer.domElement) {
            document.getElementById('ui-overlay')?.classList.remove('hidden');
        } else {
            document.getElementById('ui-overlay')?.classList.add('hidden');
        }
    }
});

// Resize Event
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (gameStarted && player) {
        player.update(delta);
    } else {
        const time = clock.getElapsedTime() * 0.15;
        camera.position.set(Math.sin(time) * 25, 18, Math.cos(time) * 25);
        camera.lookAt(0, 2, 0);
    }

    renderer.render(scene, camera);
}

animate();
