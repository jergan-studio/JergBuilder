import * as THREE from 'three';
import { Player } from './player.js';

// --- 1. UI PANEL MANAGEMENT ---
const panels = {
    title: document.getElementById('menu-title') || document.getElementById('title-overlay'),
    worlds: document.getElementById('menu-worlds'),
    skin: document.getElementById('menu-skin'),
    settings: document.getElementById('menu-settings')
};

function showScreen(screenKey) {
    // Hide all UI screens
    Object.values(panels).forEach(panel => {
        if (panel) panel.classList.add('hidden');
    });

    // Display selected UI screen
    if (panels[screenKey]) {
        panels[screenKey].classList.remove('hidden');
    }
}

// Attach event listeners for Title Menu buttons
document.getElementById('worlds-btn')?.addEventListener('click', () => showScreen('worlds'));
document.getElementById('btn-worlds')?.addEventListener('click', () => showScreen('worlds'));

document.getElementById('select-skin-btn')?.addEventListener('click', () => showScreen('skin'));
document.getElementById('btn-skin')?.addEventListener('click', () => showScreen('skin'));

document.getElementById('settings-btn')?.addEventListener('click', () => showScreen('settings'));
document.getElementById('btn-settings')?.addEventListener('click', () => showScreen('settings'));

// Attach listeners for all "Back" buttons across sub-menus
document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => showScreen('title'));
});

// --- 2. THREE.JS SCENE & LIGHTING SETUP ---
let gameStarted = false;
let player = null;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue
scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Direct Sunlight & Ambient Lighting
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(40, 60, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// --- 3. TERRAIN & BLOCK DATA STORAGE ---
const worldBlocks = [];
const blockMap = new Map();

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const grassMaterial = new THREE.MeshLambertMaterial({ color: 0x557a2b });
const dirtMaterial = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
const stoneMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });

function createBlock(x, y, z, material = grassMaterial) {
    const key = `${x},${y},${z}`;
    if (blockMap.has(key)) return;

    const block = new THREE.Mesh(blockGeometry, material);
    block.position.set(x + 0.5, y + 0.5, z + 0.5);
    block.castShadow = true;
    block.receiveShadow = true;

    scene.add(block);
    worldBlocks.push(block);
    blockMap.set(key, block);
}

function removeBlock(x, y, z) {
    const key = `${x},${y},${z}`;
    const block = blockMap.get(key);
    if (block) {
        scene.remove(block);
        const index = worldBlocks.indexOf(block);
        if (index !== -1) worldBlocks.splice(index, 1);
        block.geometry.dispose();
        blockMap.delete(key);
    }
}

function generateTerrain() {
    const size = 16;
    for (let x = -size; x < size; x++) {
        for (let z = -size; z < size; z++) {
            createBlock(x, 0, z, stoneMaterial);
            createBlock(x, 1, z, dirtMaterial);
            createBlock(x, 2, z, grassMaterial);
        }
    }
}

// --- 4. GAME LAUNCH & POINTER LOCK CONTROL ---
function launchGame() {
    if (!gameStarted) {
        generateTerrain();
        player = new Player(scene, camera, worldBlocks);
        gameStarted = true;
    }

    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) uiOverlay.classList.add('hidden');
    renderer.domElement.requestPointerLock();
}

// Play World Trigger
document.getElementById('btn-play-world')?.addEventListener('click', launchGame);

// Toggle menu on Pointer Lock change (ESC Key)
document.addEventListener('pointerlockchange', () => {
    const uiOverlay = document.getElementById('ui-overlay');
    if (document.pointerLockElement !== renderer.domElement) {
        if (uiOverlay) uiOverlay.classList.remove('hidden');
        showScreen('title');
    } else {
        if (uiOverlay) uiOverlay.classList.add('hidden');
    }
});

// Click Canvas to lock pointer back into game
renderer.domElement.addEventListener('click', () => {
    if (gameStarted && document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
    }
});

// --- 5. BLOCK ACTION CONTROLS (BREAK / PLACE) ---
window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousedown', (e) => {
    if (!gameStarted || document.pointerLockElement !== renderer.domElement || !player) return;

    const target = player.getLookAtBlock();
    if (!target) return;

    if (e.button === 0) {
        // Left Click -> Break Block
        removeBlock(target.targetBlock.x, target.targetBlock.y, target.targetBlock.z);
    } else if (e.button === 2) {
        // Right Click -> Place Block
        createBlock(target.placeBlock.x, target.placeBlock.y, target.placeBlock.z, grassMaterial);
    }
});

// --- 6. RESIZE LISTENER & RENDER LOOP ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);

    if (gameStarted && player) {
        player.update(delta);
    } else {
        // Orbit view around world during menu screen
        const time = clock.getElapsedTime() * 0.15;
        camera.position.x = Math.sin(time) * 35;
        camera.position.z = Math.cos(time) * 35;
        camera.position.y = 20;
        camera.lookAt(0, 3, 0);
    }

    renderer.render(scene, camera);
}

animate();
