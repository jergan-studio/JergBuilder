import * as THREE from 'three';
import { generateMap } from '../Map/mapGenerator.js';
import { Player } from './player.js';

let scene, camera, renderer, player;
let gameRunning = false;
const canvas = document.getElementById('gameCanvas');

function init() {
    // 1. Kick off the loading intro sequence
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
    const loadingDuration = 600; 
    const intervalTime = 15; 
    const step = (intervalTime / loadingDuration) * 100;
    
    let isSkipped = false;

    // Helper function to transition safely out of the splash screen
    function endSplash() {
        if (isSkipped) return;
        isSkipped = true;
        
        clearInterval(loadingInterval);
        barFill.style.width = '100%';
        
        splash.classList.add('fade-out');
        mainMenu.classList.remove('hidden');
        
        setTimeout(() => {
            splash.classList.add('hidden');
            // Remove the skip click listener to clean up memory
            splash.removeEventListener('click', handleSkipClick);
        }, 400); 
    }

    // Skip handler function for the click event
    function handleSkipClick() {
        endSplash();
    }

    // --- NEW: Add a click listener to the splash screen overlay to allow skipping ---
    splash.style.cursor = 'pointer'; // Visual hint that it can be clicked
    splash.addEventListener('click', handleSkipClick);

    const loadingInterval = setInterval(() => {
        progress += step;
        if (progress >= 100) {
            endSplash();
        } else if (!isSkipped) {
            barFill.style.width = progress + '%';
        }
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
