import * as THREE from 'three';
import { Player } from './player.js';
import { MapGenerator } from './mapGenerator.js';

// --- 1. UI NAVIGATION MANAGER ---
const panels = {
    title: document.getElementById('menu-title'),
    worlds: document.getElementById('menu-worlds'),
    skin: document.getElementById('menu-skin'),
    settings: document.getElementById('menu-settings')
};

function showScreen(screenKey) {
    // Hide all panels
    Object.values(panels).forEach(panel => {
        if (panel) panel.classList.add('hidden');
    });

    // Show selected panel
    if (panels[screenKey]) {
        panels[screenKey].classList.remove('hidden');
    }
}

// Hook up Title Screen buttons
document.getElementById('btn-worlds')?.addEventListener('click', () => showScreen('worlds'));
document.getElementById('btn-skin')?.addEventListener('click', () => showScreen('skin'));
document.getElementById('btn-settings')?.addEventListener('click', () => showScreen('settings'));

// Hook up all "Back" buttons
document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => showScreen('title'));
});

// --- 2. THREE.JS GAME SETUP ---
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
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// Launch World
function launchGame() {
    if (!mapGenerator) {
        mapGenerator = new MapGenerator(scene);
        if (typeof mapGenerator.generate === 'function') {
            mapGenerator.generate();
        }
    }

    if (!player) {
        player = new Player(scene, camera, mapGenerator);
    }

    // Hide UI Overlay
    document.getElementById('ui-overlay').classList.add('hidden');
    renderer.domElement.requestPointerLock();
    gameStarted = true;
}

// Play World Button Listener
document.getElementById('btn-play-world')?.addEventListener('click', () => {
    launchGame();
});

// Press ESC to return to Title Menu
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== renderer.domElement) {
        document.getElementById('ui-overlay').classList.remove('hidden');
        showScreen('title');
    } else {
        document.getElementById('ui-overlay').classList.add('hidden');
    }
});

// Click Canvas to Lock Pointer if Game is running
renderer.domElement.addEventListener('click', () => {
    if (gameStarted && document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
    }
});

// Block Place/Break Controls
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('mousedown', (e) => {
    if (!gameStarted || document.pointerLockElement !== renderer.domElement || !player) return;

    const target = player.getLookAtBlock();
    if (!target) return;

    if (e.button === 0 && mapGenerator?.removeBlock) {
        mapGenerator.removeBlock(target.targetBlock.x, target.targetBlock.y, target.targetBlock.z);
    } else if (e.button === 2 && mapGenerator?.addBlock) {
        mapGenerator.addBlock(target.placeBlock.x, target.placeBlock.y, target.placeBlock.z, 1);
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
        // Orbit Camera View while on Menu
        const time = clock.getElapsedTime() * 0.15;
        camera.position.x = Math.sin(time) * 35;
        camera.position.z = Math.cos(time) * 35;
        camera.position.y = 25;
        camera.lookAt(0, 5, 0);
    }

    renderer.render(scene, camera);
}
animate();
