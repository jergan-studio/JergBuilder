import * as THREE from 'three';
import { Player } from './player.js';
import { MapGenerator } from './mapGenerator.js';

// --- 1. STATE & UI ELEMENTS ---
let gameStarted = false;
let player = null;
let mapGenerator = null;

// Get Title Screen UI Elements (matching your title menu buttons)
const titleOverlay = document.getElementById('title-overlay') || document.body;
const worldsBtn = document.getElementById('worlds-btn') || document.querySelector('button:nth-child(1)');
const selectSkinBtn = document.getElementById('select-skin-btn') || document.querySelector('button:nth-child(2)');
const settingsBtn = document.getElementById('settings-btn') || document.querySelector('button:nth-child(3)');

// --- 2. THREE.JS SCENE, CAMERA, & RENDERER SETUP ---
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
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(30, 50, 30);
dirLight.castShadow = true;
scene.add(dirLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// --- 3. GAME START / INITIALIZATION FUNCTION ---
function startGame() {
    if (gameStarted) return;

    // 1. Generate Map
    if (typeof MapGenerator === 'function') {
        mapGenerator = new MapGenerator(scene);
        if (typeof mapGenerator.generate === 'function') {
            mapGenerator.generate();
        }
    }

    // 2. Initialize Player
    player = new Player(scene, camera, mapGenerator);

    // 3. Hide Menu Overlay
    const menuContainer = document.getElementById('menu-container') || document.querySelector('.menu');
    if (menuContainer) {
        menuContainer.style.display = 'none';
    }

    // 4. Request Pointer Lock to capture mouse controls
    renderer.domElement.requestPointerLock();
    gameStarted = true;
}

// --- 4. TITLE BUTTON EVENT LISTENERS ---

// "Worlds" Button -> Starts/Loads World
if (worldsBtn) {
    worldsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startGame();
    });
}

// "Select Skin" Button
if (selectSkinBtn) {
    selectSkinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log("Opening Skin Selector...");
        // Add custom skin selection logic or modal display here
    });
}

// "Settings" Button
if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log("Opening Settings...");
        // Add settings panel toggle logic here
    });
}

// Re-engage pointer lock when clicking game canvas after game starts
renderer.domElement.addEventListener('click', () => {
    if (gameStarted && document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
    }
});

// Detect when player presses ESC to bring back the title overlay
document.addEventListener('pointerlockchange', () => {
    const menuContainer = document.getElementById('menu-container') || document.querySelector('.menu');
    if (document.pointerLockElement !== renderer.domElement) {
        if (menuContainer) menuContainer.style.display = 'flex';
    } else {
        if (menuContainer) menuContainer.style.display = 'none';
    }
});

// Prevent right-click context menu while playing
window.addEventListener('contextmenu', (e) => e.preventDefault());

// --- 5. BLOCK BREAK & PLACE CONTROLS ---
window.addEventListener('mousedown', (e) => {
    if (!gameStarted || document.pointerLockElement !== renderer.domElement || !player) return;

    const targetInfo = player.getLookAtBlock();
    if (!targetInfo) return;

    if (e.button === 0) {
        // Left Click -> Destroy Block
        if (mapGenerator && typeof mapGenerator.removeBlock === 'function') {
            mapGenerator.removeBlock(targetInfo.targetBlock.x, targetInfo.targetBlock.y, targetInfo.targetBlock.z);
        }
    } else if (e.button === 2) {
        // Right Click -> Place Block
        if (mapGenerator && typeof mapGenerator.addBlock === 'function') {
            mapGenerator.addBlock(targetInfo.placeBlock.x, targetInfo.placeBlock.y, targetInfo.placeBlock.z, 1);
        }
    }
});

// --- 6. WINDOW RESIZE HANDLER ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- 7. MAIN ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);

    if (gameStarted && player) {
        player.update(delta);
    } else {
        // Rotate camera around origin while on title screen for visual effect
        const time = clock.getElapsedTime() * 0.2;
        camera.position.x = Math.sin(time) * 30;
        camera.position.z = Math.cos(time) * 30;
        camera.position.y = 20;
        camera.lookAt(0, 5, 0);
    }

    renderer.render(scene, camera);
}

animate();
