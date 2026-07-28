import * as THREE from 'three';
import { Player } from './player.js';
import { MapGenerator } from '../Map/mapGenerator.js';

// --- 1. ROBUST UI MANAGER ---
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

// Function to attach click listeners safely to multiple possible button IDs
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

// Bind Title Buttons
bindClick('#btn-worlds, #worlds-btn', () => showScreen('worlds'));
bindClick('#btn-skin, #select-skin-btn', () => showScreen('skin'));
bindClick('#btn-settings, #settings-btn', () => showScreen('settings'));

// Bind Back Buttons
document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        showScreen('title');
    });
});

// --- 2. THREE.JS ENGINE SETUP ---
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

// --- 3. GAME START LOGIC ---
function launchGame() {
    if (!gameStarted) {
        try {
            const seed = `seed_${Math.floor(Math.random() * 100000)}`;
            mapGenerator = new MapGenerator(scene, seed);
            mapGenerator.generate();

            player = new Player(scene, camera, mapGenerator);
            gameStarted = true;
        } catch (err) {
            console.error("Error launching game engine:", err);
        }
    }

    document.getElementById('ui-overlay')?.classList.add('hidden');
    renderer.domElement.requestPointerLock();
}

bindClick('#btn-play-world', launchGame);

// Escape Key Handler (ESC returns to title)
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== renderer.domElement) {
        document.getElementById('ui-overlay')?.classList.remove('hidden');
        showScreen('title');
    } else {
        document.getElementById('ui-overlay')?.classList.add('hidden');
    }
});

// Canvas click re-locks pointer while playing
renderer.domElement.addEventListener('click', () => {
    if (gameStarted && document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
    }
});

// --- 4. BLOCK CONTROLS ---
window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousedown', (e) => {
    if (!gameStarted || document.pointerLockElement !== renderer.domElement || !player || !mapGenerator) return;

    const target = player.getLookAtBlock();
    if (!target) return;

    if (e.button === 0) { // Left Click -> Destroy
        mapGenerator.removeBlock(target.targetBlock.x, target.targetBlock.y, target.targetBlock.z);
    } else if (e.button === 2) { // Right Click -> Place
        mapGenerator.addBlock(
            target.placeBlock.x, 
            target.placeBlock.y, 
            target.placeBlock.z, 
            mapGenerator.materials.grass
        );
    }
});

// Resize
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
