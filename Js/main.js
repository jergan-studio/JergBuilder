import * as THREE from 'three';
import { Player } from './player.js';

// --- UI PANEL MANAGER ---
const panels = {
    title: document.getElementById('menu-title'),
    worlds: document.getElementById('menu-worlds'),
    skin: document.getElementById('menu-skin'),
    settings: document.getElementById('menu-settings')
};

function showScreen(screenKey) {
    Object.values(panels).forEach(p => p?.classList.add('hidden'));
    if (panels[screenKey]) panels[screenKey].classList.remove('hidden');
}

// Attach UI Event Listeners
document.getElementById('btn-worlds')?.addEventListener('click', () => showScreen('worlds'));
document.getElementById('btn-skin')?.addEventListener('click', () => showScreen('skin'));
document.getElementById('btn-settings')?.addEventListener('click', () => showScreen('settings'));
document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => showScreen('title'));
});

// --- THREE.JS SCENE SETUP ---
let gameStarted = false;
let player = null;

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

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Block Map & Terrain Generation
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
        const idx = worldBlocks.indexOf(block);
        if (idx !== -1) worldBlocks.splice(idx, 1);
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

// --- LAUNCH GAME ---
function launchGame() {
    if (!gameStarted) {
        generateTerrain();
        player = new Player(scene, camera, worldBlocks);
        gameStarted = true;
    }

    document.getElementById('ui-overlay')?.classList.add('hidden');
    renderer.domElement.requestPointerLock();
}

document.getElementById('btn-play-world')?.addEventListener('click', launchGame);

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

// Mouse actions for block placement and destruction
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('mousedown', (e) => {
    if (!gameStarted || document.pointerLockElement !== renderer.domElement || !player) return;

    const target = player.getLookAtBlock();
    if (!target) return;

    if (e.button === 0) {
        removeBlock(target.targetBlock.x, target.targetBlock.y, target.targetBlock.z);
    } else if (e.button === 2) {
        createBlock(target.placeBlock.x, target.placeBlock.y, target.placeBlock.z, grassMaterial);
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Main Loop
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (gameStarted && player) {
        player.update(delta);
    } else {
        const time = clock.getElapsedTime() * 0.15;
        camera.position.x = Math.sin(time) * 35;
        camera.position.z = Math.cos(time) * 35;
        camera.position.y = 20;
        camera.lookAt(0, 3, 0);
    }

    renderer.render(scene, camera);
}
animate();
