import * as THREE from 'three';
import { generateMap } from '../Map/mapGenerator.js';
import { Player } from './player.js';

let scene, camera, renderer, player;
let gameRunning = false;
const canvas = document.getElementById('gameCanvas');

function init() {
    // 1. Kick off the optimized fast-loading splash sequence
    runSplashSequence();

    // 2. Core Three.js Engine Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky Blue

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 3. Environment Illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // 4. Initialize Player Object Logic
    player = new Player(scene, camera);

    // 5. Setup Action Click Listeners
    setupMenuEvents();
    setupPointerLock();

    // 6. Handle Screen Resizing Dynamically
    window.addEventListener('resize', onWindowResize);
    
    // Begin rendering cycle
    animate();
}

function runSplashSequence() {
    const splash = document.getElementById('splashScreen');
    const mainMenu = document.getElementById('mainMenu');
    const barFill = document.getElementById('loadingBarFill');

    let progress = 0;
    // High-speed load configuration: Fills up fully in 600ms
    const loadingDuration = 600; 
    const intervalTime = 15; 
    const step = (intervalTime / loadingDuration) * 100;

    const loadingInterval = setInterval(() => {
        progress += step;
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);

            // Execute rapid clean transition
            splash.classList.add('fade-out');
            mainMenu.classList.remove('hidden');
            
            setTimeout(() => {
                splash.classList.add('hidden');
            }, 400); 
        }
        
        barFill.style.width = progress + '%';
    }, intervalTime);
}

function setupPointerLock() {
    const escMenu = document.getElementById('escMenu');
    const hud = document.getElementById('hud');

    canvas.addEventListener('click', () => {
        if (gameRunning) {
            canvas.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === canvas) {
            escMenu.classList.add('hidden');
            hud.classList.remove('hidden');
            gameRunning = true;
        } else {
            if (gameRunning) {
                escMenu.classList.remove('hidden');
                hud.classList.add('hidden');
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

    // Main Menu Nav Nodes
    document.getElementById('btnWorlds').addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        worldsMenu.classList.remove('hidden');
    });

    document.getElementById('btnSkins').addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        skinsMenu.classList.remove('hidden');
    });

    document.querySelectorAll('.btnBack').forEach(btn => {
        btn.addEventListener('click', () => {
            worldsMenu.classList.add('hidden');
            skinsMenu.classList.add('hidden');
            mainMenu.classList.remove('hidden');
        });
    });

    // World Selection Trigger
    document.querySelectorAll('.world-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chosenWorldType = e.target.getAttribute('data-world');
            generateMap(scene, chosenWorldType);
            
            worldsMenu.classList.add('hidden');
            hud.classList.remove('hidden');
            
            gameRunning = true; 
            canvas.requestPointerLock(); 
        });
    });

    // Preset Skins Selector System
    document.querySelectorAll('.skin-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            player.setSkin(e.target.getAttribute('data-skin'));
            skinsMenu.classList.add('hidden');
            mainMenu.classList.remove('hidden');
        });
    });

    // --- NEW: Custom Skin Integration Option ---
    // If you add a custom button or trigger, you can prompt the user for an image URL link!
    const customSkinBtn = document.getElementById('btnCustomSkin');
    if (customSkinBtn) {
        customSkinBtn.addEventListener('click', () => {
            const url = prompt("Enter custom skin image URL (PNG/JPG):", "https://i.imgur.com/yourImage.png");
            if (url) {
                player.setSkin('custom', url);
                skinsMenu.classList.add('hidden');
                mainMenu.classList.remove('hidden');
            }
        });
    }

    // Pause Menu Interaction Options
    document.getElementById('btnResume').addEventListener('click', () => {
        canvas.requestPointerLock();
    });

    document.getElementById('btnQuit').addEventListener('click', () => {
        escMenu.classList.add('hidden');
        mainMenu.classList.remove('hidden');
        gameRunning = false;
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (gameRunning) {
        player.update();
    }
    renderer.render(scene, camera);
}

init();
