import * as THREE from 'three';
import { Player } from './player.js';
import { MapGenerator } from '../Map/mapGenerator.js';

// --- 1. UI MANAGER ---
const panels = {
    title: document.getElementById('menu-title'),
    worlds: document.getElementById('menu-worlds'),
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

bindClick('#btn-worlds', () => showScreen('worlds'));
bindClick('#btn-skin', () => showScreen('skin'));
bindClick('#btn-settings', () => showScreen('settings'));

document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        showScreen('title');
    });
});

// --- 2. INVENTORY & HOTBAR SYSTEM ---
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

// Hotkey listeners (1-8 & scroll wheel)
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

// --- 3. THREE.JS ENGINE SETUP ---
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

// --- 4. GAME START LOGIC ---
function launchGame() {
    if (!gameStarted) {
        const seed = `seed_${Math.floor(Math.random() * 100000)}`;
        mapGenerator = new MapGenerator(scene, seed);
        mapGenerator.generate();

        player = new Player(scene, camera, mapGenerator);
        gameStarted = true;
    }

    document.getElementById('ui-overlay')?.classList.add('hidden');
    renderer.domElement.requestPointerLock();
}

bindClick('#btn-play-world', launchGame);

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

// --- 5. BLOCK ACTION CONTROLS ---
window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousedown', (e) => {
    if (!gameStarted || document.pointerLockElement !== renderer.domElement || !player || !mapGenerator) return;

    const target = player.getLookAtBlock();
    if (!target) return;

    if (e.button === 0) { // Left Click -> Break Block
        mapGenerator.removeBlock(target.targetBlock.x, target.targetBlock.y, target.targetBlock.z);
    } else if (e.button === 2) { // Right Click -> Place Active Selected Block
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

// Resize Handler
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
