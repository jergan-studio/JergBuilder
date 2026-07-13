import * as THREE from 'three';

// Safe Module Imports - If these throw errors, check your actual folder names!
let generateMap, Player;
try {
    const mapMod = await import('../Map/mapGenerator.js');
    generateMap = mapMod.generateMap;
} catch(e) { console.error("Could not load mapGenerator.js. Check folder path!", e); }

try {
    const playerMod = await import('./player.js');
    Player = playerMod.Player;
} catch(e) { console.error("Could not load player.js. Check folder path!", e); }

let scene, camera, renderer, player;
let gameRunning = false;
const canvas = document.getElementById('gameCanvas');
const clock = new THREE.Clock();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(12, 24, 8);
    scene.add(dirLight);

    if (Player) {
        try { player = new Player(scene, camera); } catch(e) { console.error(e); }
    }

    setupMenuEvents();
    setupPointerLock();

    window.addEventListener('resize', onWindowResize);
    animate();
}

function setupPointerLock() {
    const escMenu = document.getElementById('escMenu');
    const hud = document.getElementById('hud');
    if (!canvas) return;

    canvas.addEventListener('click', () => {
        if (gameRunning) canvas.requestPointerLock();
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
        if (el) {
            el.addEventListener('click', callback);
        } else {
            console.warn(`Button ID "${id}" not found in HTML.`);
        }
    };

    // Main Menu Navigation Transitions
    bindClick('btnWorlds', () => {
        mainMenu.classList.add('hidden');
        worldsMenu.classList.remove('hidden');
    });

    bindClick('btnSkins', () => {
        mainMenu.classList.add('hidden');
        skinsMenu.classList.remove('hidden');
    });

    // Universal Back Buttons
    document.querySelectorAll('.btnBack').forEach(btn => {
        btn.addEventListener('click', () => {
            if (worldsMenu) worldsMenu.classList.add('hidden');
            if (skinsMenu) skinsMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        });
    });

    // World Selection Generation
    document.querySelectorAll('.world-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chosenWorldType = e.currentTarget.getAttribute('data-world');
            
            if (generateMap) {
                try { generateMap(scene, chosenWorldType); } catch (err) { console.error(err); }
            } else {
                console.warn("Map generator missing, simulating world start.");
            }
            
            if (worldsMenu) worldsMenu.classList.add('hidden');
            if (hud) hud.classList.remove('hidden');
            
            gameRunning = true; 
            if (canvas) canvas.requestPointerLock(); 
        });
    });

    // Skin Selection Configuration
    document.querySelectorAll('.skin-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const skinName = e.currentTarget.getAttribute('data-skin');
            if (player && typeof player.setSkin === 'function') {
                player.setSkin(skinName);
            }
            if (skinsMenu) skinsMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        });
    });

    // Custom Skin URL Injector
    bindClick('btnCustomSkin', () => {
        const url = prompt("Enter custom skin image URL (PNG/JPG):", "https://i.imgur.com/yourImage.png");
        if (url && player && typeof player.setSkin === 'function') {
            player.setSkin('custom', url);
            if (skinsMenu) skinsMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        }
    });

    // Pause Routing Controls
    bindClick('btnResume', () => {
        if (canvas) canvas.requestPointerLock();
    });

    bindClick('btnQuit', () => {
        gameRunning = false;
        if (document.pointerLockElement === canvas) document.exitPointerLock();
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

    if (gameRunning && player && typeof player.update === 'function') {
        player.update();
    }
    
    if (scene) {
        scene.traverse((child) => {
            if (child.isMesh && child.material && child.material.uniforms) {
                if (child.material.uniforms.uTime) child.material.uniforms.uTime.value = elapsedTime;
                if (child.material.uniforms.uCameraPosition && camera) child.material.uniforms.uCameraPosition.value.copy(camera.position);
            }
        });
    }
    
    if (renderer && scene && camera) renderer.render(scene, camera);
}

init();
