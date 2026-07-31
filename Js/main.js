import * as THREE from 'three';
import { Player } from './player.js';
import { MapGenerator } from '../Map/mapGenerator.js';
import { NetworkManager } from './network.js';

// --- 1. UI NAVIGATION MANAGER ---
const panels = {
    title: document.getElementById('menu-title'),
    worlds: document.getElementById('menu-worlds'),
    multiplayer: document.getElementById('menu-multiplayer'),
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

function bindClick(selector, callback) {
    const el = document.querySelector(selector);
    if (el) {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            callback(e);
        });
    }
}

// Bind Menu Buttons
bindClick('#btn-worlds', () => showScreen('worlds'));
bindClick('#btn-multiplayer', () => showScreen('multiplayer'));
bindClick('#btn-mods', () => showScreen('mods'));
bindClick('#btn-skin', () => showScreen('skin'));
bindClick('#btn-settings', () => showScreen('settings'));

// Back Buttons
document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        showScreen('title');
    });
});

// --- 2. MOD LOADER SYSTEM ---
const modFileInput = document.getElementById('mod-file-input');
const loadedModsList = document.getElementById('loaded-mods-list');

if (modFileInput) {
    modFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const modScriptCode = event.target.result;

            try {
                const scriptEl = document.createElement('script');
                scriptEl.textContent = modScriptCode;
                document.body.appendChild(scriptEl);

                if (loadedModsList) {
                    loadedModsList.innerText = `Active Mod: ${file.name}`;
                }
                alert(`Successfully loaded mod: ${file.name}`);
            } catch (err) {
                console.error("Error executing mod script:", err);
                alert("Failed to execute mod file. Check console for details.");
            }
        };

        reader.readAsText(file);
    });
}

// --- 3. BACKGROUND MUSIC SYSTEM ---
const bgMusic = new Audio('https://github.com/jergan-studio/JergBuilder/raw/refs/heads/main/Assets/monume-roblox-minecraft-fortnite-video-game-music-498036.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.3;

function playMusic() {
    bgMusic.play().catch(err => {
        console.log("Audio awaiting user interaction:", err);
    });
}

window.addEventListener('click', () => playMusic(), { once: true });

// --- 4. INVENTORY & HOTBAR SYSTEM ---
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

// --- 5. THREE.JS SCENE SETUP ---
let gameStarted = false;
let player = null;
let mapGenerator = null;
let networkManager = null;

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

// --- 6. GAME LAUNCHERS ---

// Singleplayer Launcher
function launchSingleplayer() {
    playMusic();

    if (!gameStarted) {
        try {
            const seed = `seed_${Math.floor(Math.random() * 100000)}`;
            mapGenerator = new MapGenerator(scene, seed);
            mapGenerator.generate();

            player = new Player(scene, camera, mapGenerator);
            gameStarted = true;
        } catch (err) {
            console.error("Singleplayer launch error:", err);
        }
    }

    document.getElementById('ui-overlay')?.classList.add('hidden');
    renderer.domElement.requestPointerLock();
}

// Multiplayer Server Launcher
function launchMultiplayer() {
    playMusic();

    const serverUrl = document.getElementById('server-url')?.value || 'https://jergbserver.onrender.com';
    const username = document.getElementById('player-username')?.value || `Player_${Math.floor(Math.random() * 1000)}`;

    if (!gameStarted) {
        try {
            // Local Map & Player setup
            mapGenerator = new MapGenerator(scene, 'JergBuilder_Default');
            mapGenerator.generate();

            player = new Player(scene, camera, mapGenerator);

            // Connect to JergBServer
            networkManager = new NetworkManager({
                scene: scene,
                renderer: renderer,
                player: player,
                mapGenerator: mapGenerator
            }, serverUrl, username);

            gameStarted = true;
        } catch (err) {
            console.error("Multiplayer launch error:", err);
        }
    }

    document.getElementById('ui-overlay')?.classList.add('hidden');
    renderer.domElement.requestPointerLock();
}

bindClick('#btn-play-world', launchSingleplayer);
bindClick('#btn-connect-server', launchMultiplayer);

// --- 7. CONTROLS & POINTER LOCK ---
document.addEventListener('pointerlockchange', () => {
    const chatInput = document.getElementById('chat-input');
    if (document.activeElement === chatInput) return;

    if (document.pointerLockElement !== renderer.domElement) {
        document.getElementById('ui-overlay')?.classList.remove('hidden');
        showScreen('title');
    } else {
        document.getElementById('ui-overlay')?.classList.add('hidden');
    }
});

renderer.domElement.addEventListener('click', () => {
    if (gameStarted && document.pointerLockElement !== renderer.domElement) {
        const chatInput = document.getElementById('chat-input');
        if (document.activeElement !== chatInput) {
            renderer.domElement.requestPointerLock();
        }
    }
});

// Block Place / Break with Network Broadcasting
window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousedown', (e) => {
    if (!gameStarted || document.pointerLockElement !== renderer.domElement || !player || !mapGenerator) return;

    const target = player.getLookAtBlock();
    if (!target) return;

    if (e.button === 0) { // Left Click -> Break
        const bx = target.targetBlock.x;
        const by = target.targetBlock.y;
        const bz = target.targetBlock.z;

        mapGenerator.removeBlock(bx, by, bz);

        if (networkManager && networkManager.socket) {
            networkManager.socket.emit('blockBreak', { x: bx, y: by, z: bz });
        }

    } else if (e.button === 2) { // Right Click -> Place
        const activeKey = blockInventory[selectedSlotIndex].key;
        const selectedMaterial = mapGenerator.materials[activeKey] || mapGenerator.materials.grass;

        const px = target.placeBlock.x;
        const py = target.placeBlock.y;
        const pz = target.placeBlock.z;

        mapGenerator.addBlock(px, py, pz, selectedMaterial);

        if (networkManager && networkManager.socket) {
            networkManager.socket.emit('blockPlace', {
                x: px,
                y: py,
                z: pz,
                material: activeKey
            });
        }
    }
});

// Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- 8. GAME ANIMATION & RENDER LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (gameStarted && player) {
        player.update(delta);

        // Update remote player transforms from multiplayer socket
        if (networkManager) {
            networkManager.update();
        }
    } else {
        // Camera orbit for main menu backdrop
        const time = clock.getElapsedTime() * 0.15;
        camera.position.set(Math.sin(time) * 25, 18, Math.cos(time) * 25);
        camera.lookAt(0, 2, 0);
    }

    renderer.render(scene, camera);
}

animate();
