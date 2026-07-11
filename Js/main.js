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
    
    // 6. Engine initialization complete -> Run the splash exit sequence
    runSplashSequence();

    // Begin continuous frame tick render loop
    animate();
}

function runSplashSequence() {
    const splash = document.getElementById('splashScreen');
    const mainMenu = document.getElementById('mainMenu');
    const barFill = document.getElementById('loadingBarFill');

    if (!splash || !mainMenu || !barFill) {
        if (mainMenu) mainMenu.classList.remove('hidden');
        return;
    }

    let isFinished = false;

    // Direct transition routine out of the splash overlay
    function removeSplash() {
        if (isFinished) return;
        isFinished = true;
        
        barFill.style.width = '100%';
        splash.classList.add('fade-out');
        mainMenu.classList.remove('hidden');
        
        // Wait exactly 5 seconds for the CSS opacity transition to complete
        setTimeout(() => {
            splash.classList.add('hidden');
            splash.removeEventListener('click', removeSplash);
        }, 5000); 
    }

    // Allow user to click to force-skip instantly if desired
    splash.style.cursor = 'pointer';
    splash.addEventListener('click', removeSplash);

    // Snap the bar forward instantly and start the 5-second fade on resource ready
    barFill.style.width = '100%';
    setTimeout(removeSplash, 100); 
}

function setupPointerLock() {
    const escMenu = document.getElementById('escMenu');
    const hud = document.getElementById('hud');

    if (!canvas) return;

    canvas.addEventListener('click', () => {
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
            if (gameRunning) {
                if (escMenu) escMenu.classList.remove('hidden');
                if (hud) hud.classList.add('hidden');
                gameRunning = false;
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

    // Main Menu Navigation
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

    document.querySelectorAll('.btnBack').forEach(btn => {
        btn.addEventListener('click', () => {
            if (worldsMenu) worldsMenu.classList.add('hidden');
            if (skinsMenu) skinsMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        });
    });

    // World Selection Generation Interface
    document.querySelectorAll('.world-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chosenWorldType = e.target.getAttribute('data-world');
            
            try {
                generateMap(scene, chosenWorldType);
            } catch (err) {
                console.error("Map Generation script error:", err);
            }
            
            if (worldsMenu) worldsMenu.classList.add('hidden');
            if (hud) hud.classList.remove('hidden');
            
            gameRunning = true; 
            if (canvas) canvas.requestPointerLock(); 
        });
    });

    // Preset Skins Selector System
    document.querySelectorAll('.skin-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (player && typeof player.setSkin === 'function') {
                player.setSkin(e.target.getAttribute('data-skin'));
            }
            if (skinsMenu) skinsMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        });
    });

    // External Custom URL Image Skin Injector
    bindClick('btnCustomSkin', () => {
        const url = prompt("Enter custom skin image URL (PNG/JPG):", "https://i.imgur.com/yourImage.png");
        if (url && player && typeof player.setSkin === 'function') {
            player.setSkin('custom', url);
            if (skinsMenu) skinsMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        }
    });

    // Pause Menu Options
    bindClick('btnResume', () => {
        if (canvas) canvas.requestPointerLock();
    });

    bindClick('btnQuit', () => {
        if (escMenu) escMenu.classList.add('hidden');
        if (mainMenu) mainMenu.classList.remove('hidden');
        gameRunning = false;
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

    if (gameRunning && player && typeof player.update === 'function') {
        player.update();
    }
    
    // Scan all active meshes to sync PBR variables dynamically
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

init();
