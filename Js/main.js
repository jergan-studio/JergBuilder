import * as THREE from 'three';
import { generateMap } from '../Map/mapGenerator.js';
import { Player } from './player.js';

let scene, camera, renderer, player;
let gameRunning = false;
const canvas = document.getElementById('gameCanvas');

function init() {
    // 1. Kick off the automated studio intro sequence
    runSplashSequence();

    // 2. Core Three.js Engine Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Classic Minecraft Sky Blue

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
    
    // Begin underlying render loop ticker
    animate();
}

function runSplashSequence() {
    const splash = document.getElementById('splashScreen');
    const mainMenu = document.getElementById('mainMenu');

    // Display "Jergan Studio" for 2 seconds
    setTimeout(() => {
        // Trigger the smooth opacity fade transition defined in CSS
        splash.classList.add('fade-out');
        
        // Uncover the main menu behind it instantly during the fade
        mainMenu.classList.remove('hidden');
        
        // Wait 800ms for the animation to end, then hide splash completely from screen tree
        setTimeout(() => {
            splash.classList.add('hidden');
        }, 800);

    }, 2000);
}

function setupPointerLock() {
    const escMenu = document.getElementById('escMenu');
    const hud = document.getElementById('hud');

    // Clicking into the active viewport automatically targets browser lock
    canvas.addEventListener('click', () => {
        if (gameRunning) {
            canvas.requestPointerLock();
        }
    });

    // Handle when a player locks or escapes focus
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === canvas) {
            // Mouse locked -> clear pause screens, show crosshairs/HUD, resume simulation
            escMenu.classList.add('hidden');
            hud.classList.remove('hidden');
            gameRunning = true;
        } else {
            // Mouse unlocked (via ESC key) -> pause simulation, prompt control overlay
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

    // Top Level Nav Buttons Interaction
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

    // World Selection Trigger Execution
    document.querySelectorAll('.world-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chosenWorldType = e.target.getAttribute('data-world');
            
            // Build out voxel grid layout
            generateMap(scene, chosenWorldType);
            
            // Hide selection screen overlays, enable tracking updates
            worldsMenu.classList.add('hidden');
            hud.classList.remove('hidden');
            
            gameRunning = true; 
            canvas.request
