import * as THREE from 'three';
import { Player } from './player.js';
import { MapGenerator } from '../Map/mapGenerator.js';

// --- 1. MENU SYSTEM & NAVIGATION ---
const panels = {
    title: document.getElementById('menu-title'),
    worlds: document.getElementById('menu-worlds'),
    mods: document.getElementById('menu-mods'),
    skin: document.getElementById('menu-skin'),
    settings: document.getElementById('menu-settings')
};

function showScreen(screenKey) {
    Object.keys(panels).forEach(key => {
        if (panels[key]) panels[key].classList.add('hidden');
    });

    if (panels[screenKey]) {
        panels[screenKey].classList.remove('hidden');
    }
}

function bindClick(id, callback) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            callback(e);
        });
    }
}

// Navigation Bindings
bindClick('btn-worlds', () => showScreen('worlds'));
bindClick('btn-mods', () => showScreen('mods'));
bindClick('btn-skin', () => showScreen('skin'));
bindClick('btn-settings', () => showScreen('settings'));

document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        showScreen('title');
    });
});

// --- 2. SKIN SELECTION SYSTEM ---
let selectedSkin = 'default';
document.querySelectorAll('.skin-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.skin-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedSkin = card.getAttribute('data-skin');
        
        const statusEl = document.getElementById('skin-status');
        if (statusEl) {
            statusEl.innerText = `Active Skin: ${selectedSkin.toUpperCase()}`;
        }
    });
});

// --- 3. MOD LOADER SYSTEM ---
const modFileInput = document.getElementById('mod-file-input');
const loadedModsList = document.getElementById('loaded-mods-list');

if (modFileInput) {
    modFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const scriptEl = document.createElement('script');
                scriptEl.textContent = event.target.result;
                document.body.appendChild(scriptEl);

                if (loadedModsList) {
                    loadedModsList.innerText = `Active Mod: ${file.name}`;
                }
                alert(`Loaded Mod: ${file.name}`);
            } catch (err) {
                console.error("Mod Load Error:", err);
                alert("Failed to run mod file.");
            }
        };

        reader.readAsText(file);
    });
}

// --- 4. BACKGROUND MUSIC ---
const bgMusic = new Audio('https://github.com/jergan-studio/JergBuilder/raw/refs/heads/main/Assets/monume-roblox-minecraft-fortnite-video-game-music-498036.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.3;

function playMusic() {
    bgMusic.play().catch(() => {});
}
window.addEventListener('click', () => playMusic(), { once: true });

// --- 5. HOTBAR & INVENTORY ---
const blockInventory = [
    { name: 'Grass', key: 'grass', color: '#557a2b' },
    { name: 'Gray', key: 'gray', color: '#808080' },
    { name: 'Blue', key: 'blue', color: '#1e90ff' },
    { name: 'Red', key: 'red', color: '#ff3333' },
    { name: 'Pink', key: 'pink', color: '#ff69b4' },
    { name: 'Green', key: 'green', color: '#2e8b57' },
    { name: 'Lime', key: 'lime', color: '#32cd32' },
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
        
        const num = document.createElement('span');
        num.className = 'hotbar-number';
        num.innerText = index + 1;

        const colorBox = document.createElement('div');
        colorBox.className = 'hotbar-color-preview';
        colorBox.style.backgroundColor = item.color;

        slot.appendChild(num);
        slot.appendChild(colorBox);
        hotbarEl.appendChild(slot);
    });
}

function selectSlot(index) {
    if (index >= 0 && index < blockInventory.length) {
        selectedSlotIndex = index;
        createHotbarUI();
    }
}

window.addEventListener('keydown', (e) => {
    const num = parseInt(e.key);
    if (!isNaN(num) && num >= 1 && num <= blockInventory.length) {
        selectSlot(num - 1);
    }
});

window.addEventListener('wheel', (e) => {
    if (document.pointerLockElement === renderer.domElement) {
        if (e.deltaY > 0) {
            selectSlot((selectedSlotIndex + 1) % blockInventory.length);
        } else {
            selectSlot((selectedSlotIndex - 1 + blockInventory.length) % blockInventory.length);
        }
    }
});

// --- 6. THREE.JS SCENE INITIALIZATION ---
let gameStarted = false;
let player = null;
let mapGenerator = null;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(30, 50, 30);
dirLight.castShadow = true;
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

createHotbarUI();

// --- 7. SETTINGS HANDLERS ---
const fovSlider = document.getElementById('fov-slider');
const fovVal = document.getElementById('fov-value');
if (fovSlider) {
    fovSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        if (fovVal) fovVal.innerText = val;
        camera.fov = parseInt(val);
        camera.updateProjectionMatrix();
    });
}

// --- 8. GAME LAUNCH & POINTER LOCK ---
function launchSingleplayer() {
    playMusic();

    if (!gameStarted) {
        try {
            const seed = `world_${Math.floor(Math.random() * 99999)}`;
            mapGenerator = new MapGenerator(scene, seed);
            mapGenerator.generate();

            player = new Player(scene, camera, mapGenerator);
            gameStarted = true;
        } catch (err) {
            console.error("Singleplayer Launch Error:", err);
        }
    }

    document.getElementById('ui-overlay')?.classList.add('hidden');
    renderer.domElement.requestPointerLock();
}

bindClick('btn-play-world', launchSingleplayer);

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== renderer.domElement) {
        document.getElementById('ui-overlay')?.classList.remove('hidden');
        showScreen('title');
    } else {
        document.getElementById('ui-overlay')?.classList.add('hidden');
    }
});

renderer.domElement.addEventListener('click', () => {
    if (gameStarted && document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
    }
});

// --- 9. BLOCK BREAK & PLACE CONTROLS ---
window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousedown', (e) => {
    if (!gameStarted || document.pointerLockElement !== renderer.domElement || !player || !mapGenerator) return;

    const target = player.getLookAtBlock();
    if (!target) return;

    if (e.button === 0) { // Left Click -> Break
        mapGenerator.removeBlock(target.targetBlock.x, target.targetBlock.y, target.targetBlock.z);
    } else if (e.button === 2) { // Right Click -> Place
        const activeKey = blockInventory[selectedSlotIndex].key;
        const selectedMaterial = mapGenerator.materials[activeKey] || mapGenerator.materials.grass;

        mapGenerator.addBlock(
            target.placeBlock.x, 
            target.placeBlock.y, 
            target.placeBlock.z, 
            selectedMaterial
        );
    }
});

// Window Resize
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
