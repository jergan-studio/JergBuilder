import * as THREE from 'three';
import { generateMap } from '../Map/mapGenerator.js';
import { Player } from './player.js';

let scene, camera, renderer, player;
let gameRunning = false;
const canvas = document.getElementById('gameCanvas');

// Global engine clock to drive custom shader animations
const clock = new THREE.Clock();

function init() {
    // 1. Core Three.js Engine Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky Blue

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 2. Environment Illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(12, 24, 8);
    scene.add(dirLight);

    // 3. Initialize Player Object Logic Safely
    try {
        player = new Player(scene, camera);
    } catch (e) {
        console.error("Failed to initialize Player module. Check player.js exports:", e);
    }

    // 4. Setup Action Click and Input Event Systems
    setupMenuEvents();
    setupPointerLock();

    // 5. Handle Screen Resizing Dynamically
    window.addEventListener('resize', onWindowResize);

    // Begin continuous frame tick render loop
    animate();
}

function setupPointerLock() {
    const escMenu = document.getElementById('escMenu');
    const hud = document.getElementById('hud');

    if (!canvas) return;

    canvas.addEventListener('click', () => {
        // Only request pointer lock if a world has actually been loaded
        if (gameRunning) {
            canvas.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === canvas) {
            if (escMenu) escMenu.classList.add('hidden');
            if (hud) hud.classList.remove('hidden');
            gameRunning = true;
        } else {
            // If pointer lock drops while running, open pause window menu
            if (gameRunning) {
                if (escMenu) escMenu.classList.remove('hidden');
                if (hud) hud.classList.add('hidden');
            }
        }
    });
}

function setupMenuEvents() {
    const mainMenu = document.getElementById('mainMenu');
    const worldsMenu = document.getElementById('worldsMenu');
    const skinsMenu = document.getElementById('skinsMenu');
    const escMenu = document.getElementById('escMenu');
    const hud = document.getElementById('hud');

    const bindClick = (id, callback) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', callback);
    };

    // Main Menu Navigation Transitions
    bindClick('btnWorlds', () => {
        if (mainMenu && worldsMenu) {
            mainMenu.classList.add('hidden');
            worldsMenu.classList.remove('hidden');
        }
    });

    bindClick('btnSkins', () => {
        if (mainMenu && skinsMenu) {
            mainMenu.classList.add('hidden');
            skinsMenu.classList.remove('hidden');
        }
    });

    // Handle universal back button components cleanly
    document.querySelectorAll('.btnBack').forEach(btn => {
        btn.addEventListener('click', () => {
            if (worldsMenu) worldsMenu.classList.add('hidden');
            if (skinsMenu) skinsMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        });
    });

    // World Selection Selection Trigger Hooks
    document.querySelectorAll('.world-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // FIX: Use currentTarget to guarantee we read from the button element, even if inner text was clicked
            const chosenWorldType = e.currentTarget.getAttribute('data-world');
            
            try {
                generateMap(scene, chosenWorldType);
            } catch (err) {
                console.error("Map Generation script error:", err);
            }
            
            if (worldsMenu) worldsMenu.classList.add('hidden');
            if (hud) hud.classList.remove('hidden');
            
            // Set game running status before pointer lock request fires
            gameRunning = true; 
            if (canvas) canvas.requestPointerLock(); 
        });
    });

    // Skin Configuration Selection Elements
    document.querySelectorAll('.skin-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // FIX: Use currentTarget here to safely read the skin attribute 
            if (player && typeof player.setSkin === 'function') {
                player.setSkin(e.currentTarget.getAttribute('data-skin'));
            }
            if (skinsMenu) skinsMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        });
    });

    // Custom Image URL Injector Button Element
    bindClick('btnCustomSkin', () => {
        const url = prompt("Enter custom skin image URL (PNG/JPG):", "https://i.imgur.com/yourImage.png");
        if (url && player && typeof player.setSkin === 'function') {
            player.setSkin('custom', url);
            if (skinsMenu) skinsMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        }
    });

    // Esc Pause Panel Routing Menu Logic
    bindClick('btnResume', () => {
        if (canvas) canvas.requestPointerLock();
    });

    bindClick('btnQuit', () => {
        gameRunning = false;
        if (document.pointerLockElement === canvas) {
            document.exitPointerLock();
        }
        if (escMenu) escMenu.classList.add('hidden');
        if (hud) hud.classList.add('hidden');
        if (mainMenu) mainMenu.classList.remove('hidden');
    });
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    const elapsedTime = clock.getElapsedTime();

    // Allow internal player movement mechanics updates when system status is active
    if (gameRunning && player && typeof player.update === 'function') {
        player.update();
    }
    
    // Cycle all engine rendering geometries to pipe in updated PBR parameters
    if (scene) {
        scene.traverse((child) => {
            if (child.isMesh && child.material && child.material.uniforms) {
                if (child.material.uniforms.uTime) {
                    child.material.uniforms.uTime.value = elapsedTime;
                }
                if (child.material.uniforms.uCameraPosition && camera) {
                    child.material.uniforms.uCameraPosition.value.copy(camera.position);
                }
            }
        });
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Kickstart engine core
init();
