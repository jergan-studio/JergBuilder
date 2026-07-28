import * as THREE from 'three';
import { Player } from './player.js';
import { MapGenerator } from '../Map/mapgenerator.js';

// --- 1. UI NAVIGATION SYSTEM ---
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

// Attach listeners for main title menu buttons
document.getElementById('btn-worlds')?.addEventListener('click', (e) => {
    e.stopPropagation();
    showScreen('worlds');
});

document.getElementById('btn-skin')?.addEventListener('click', (e) => {
    e.stopPropagation();
    showScreen('skin');
});

document.getElementById('btn-settings')?.addEventListener('click', (e) => {
    e.stopPropagation();
    showScreen('settings');
});

// Back buttons listener
document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        showScreen('title');
    });
});

// --- 2. THREE.JS SCENE SETUP ---
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

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(30, 50, 30);
light.castShadow = true;
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// --- 3. LAUNCH GAME & GENERATE SEEDED TERRAIN ---
function startGame() {
    if (!gameStarted) {
        // Initialize Map Generator with Seed
        const randomSeed = `seed_${Math.floor(Math.random() * 100000)}`;
        mapGenerator = new MapGenerator(scene, randomSeed);
        mapGenerator.generate();

        // Initialize Player with reference to mapGenerator
        player = new Player(scene, camera, mapGenerator);
        gameStarted = true;
    }

    document.getElementById('ui-overlay')?.classList.add('hidden');
    renderer.domElement.requestPointerLock();
}

document.getElementById('btn-play-world')?.addEventListener('click', (e) => {
    e.stopPropagation();
    startGame();
});

// Escape key menu toggle
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== renderer.domElement) {
        document.getElementById('ui-overlay')?.classList.remove('hidden');
        showScreen('title');
    } else {
        document.getElementById('ui-overlay')?.classList.add('hidden');
    }
});

// Lock mouse pointer on game canvas click
renderer.domElement.addEventListener('click', () => {
    if (gameStarted && document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
    }
});

// --- 4. CONTROLS FOR BREAKING & PLACING BLOCKS ---
window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousedown', (e) => {
    if (!gameStarted || document.pointerLockElement !== renderer.domElement || !player || !mapGenerator) return;

    const target = player.getLookAtBlock();
    if (!target) return;

    if (e.button === 0) {
        // Left Click -> Destroy Block
        mapGenerator.removeBlock(target.targetBlock.x, target.targetBlock.y, target.targetBlock.z);
    } else if (e.button === 2) {
        // Right Click -> Place Grass Block
        mapGenerator.addBlock(
            target.placeBlock.x, 
            target.placeBlock.y, 
            target.placeBlock.z, 
            mapGenerator.materials.grass
        );
    }
});

// Resize Event
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- 5. RENDER LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (gameStarted && player) {
        player.update(delta);
    } else {
        // Menu Background Orbit Camera View
        const t = clock.getElapsedTime() * 0.15;
        camera.position.set(Math.sin(t) * 25, 18, Math.cos(t) * 25);
        camera.lookAt(0, 2, 0);
    }

    renderer.render(scene, camera);
}

animate();
