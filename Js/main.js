import * as THREE from 'three';
import { Player } from './player.js';

// --- 1. UI NAVIGATION & PANEL STATE ---
const panels = {
    title: document.getElementById('menu-title') || document.getElementById('title-overlay'),
    worlds: document.getElementById('menu-worlds'),
    skin: document.getElementById('menu-skin'),
    settings: document.getElementById('menu-settings')
};

function showScreen(screenKey) {
    // Hide all UI panels
    Object.values(panels).forEach(panel => {
        if (panel) panel.classList.add('hidden');
    });

    // Show the targeted panel
    if (panels[screenKey]) {
        panels[screenKey].classList.remove('hidden');
    }
}

// Hook up Title Menu Buttons
document.getElementById('worlds-btn')?.addEventListener('click', () => showScreen('worlds'));
document.getElementById('btn-worlds')?.addEventListener('click', () => showScreen('worlds'));

document.getElementById('select-skin-btn')?.addEventListener('click', () => showScreen('skin'));
document.getElementById('btn-skin')?.addEventListener('click', () => showScreen('skin'));

document.getElementById('settings-btn')?.addEventListener('click', () => showScreen('settings'));
document.getElementById('btn-settings')?.addEventListener('click', () => showScreen('settings'));

// Hook up all "Back" buttons across menus
document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => showScreen('title'));
});

// --- 2. THREE.JS SCENE SETUP ---
let gameStarted = false;
let player = null;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lights
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(30, 50, 30);
dirLight.castShadow = true;
scene.add(dirLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// --- 3. TERRAIN & BLOCK MANAGEMENT ---
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

// --- 4. GAME LAUNCH LOGIC ---
function launchGame() {
    if (!gameStarted) {
        generateTerrain();
        player = new Player(scene, camera, worldBlocks);
        gameStarted = true;
    }

    // Hide UI overlay and lock mouse
    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) uiOverlay.classList.add('hidden');
    renderer.domElement.requestPointerLock();
}

// Play World Trigger
document.getElementById('btn-play-world')?.addEventListener('click', launchGame);

// Pointer Lock / Escape Key Menu Toggle
document.addEventListener('pointerlockchange', () => {
    const uiOverlay = document.getElementById('ui-overlay');
    if (document.pointerLockElement !== renderer.domElement) {
        if (uiOverlay) uiOverlay.classList.remove('hidden');
        showScreen('title');
    } else {
        if (uiOverlay) uiOverlay.classList.add('hidden');
    }
});

renderer.domElement.addEventListener('click', () => {
    if (gameStarted && document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
    }
});

// --- 5. CONTROLS FOR BLOCK BREAKING / PLACING ---
window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousedown', (e) => {
    if (!gameStarted || document.pointerLockElement !== renderer.domElement || !player) return;

    const target = player.getLookAtBlock();
    if (!target) return;

    if (e.button === 0) {
        // Left Click -> Break Block
        removeBlock(target.targetBlock.x, target.targetBlock.y, target.targetBlock.z);
    } else if (e.button === 2) {
        // Right Click -> Place
