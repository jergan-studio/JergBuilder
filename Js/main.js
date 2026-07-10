import * as THREE from 'three';
import { generateMap } from '../Map/mapGenerator.js';
import { Player } from './player.js';

let scene, camera, renderer, player;
let gameRunning = false;

function init() {
    // 1. Initialize UI Flow (Splash Screen -> Main Menu)
    runSplashSequence();

    // 2. Core engine foundations setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    player = new Player(scene, camera);

    setupMenuEvents();

    window.addEventListener('resize', onWindowResize);
    
    // Quick escape key back to menus via [
    window.addEventListener('keydown', (e) => {
        if (e.key === '[') {
            gameRunning = false;
            document.getElementById('mainMenu').classList.remove('hidden');
            document.getElementById('hud').classList.add('hidden');
        }
    });

    // Run underlying draw cycle, but positions won't advance until gameRunning becomes true
    animate();
}

function runSplashSequence() {
    const splash = document.getElementById('splashScreen');
    const mainMenu = document.getElementById('mainMenu');

    // Display "Jergan Studio" for 2.5 seconds, then transition cleanly to Main Menu
    setTimeout(() => {
        splash.classList.add('fade-out');
        
        // Fully remove splash asset visibility properties after CSS transition finishes
        setTimeout(() => {
            splash.classList.add('hidden');
            mainMenu.classList.remove('hidden');
        }, 1000);

    }, 2500);
}

function setupMenuEvents() {
    const mainMenu = document.getElementById('mainMenu');
    const worldsMenu = document.getElementById('worldsMenu');
    const skinsMenu = document.getElementById('skinsMenu');
    const hud = document.getElementById('hud');

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

    // Clicking a world loads the map and starts the gameplay
    document.querySelectorAll('.world-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chosenWorldType = e.target.getAttribute('data-world');
            
            // Build the architecture layer
            generateMap(scene, chosenWorldType);
            
            // Close down selection menu layers, enable player viewport active state
            worldsMenu.classList.add('hidden');
            hud.classList.remove('hidden');
            
            gameRunning = true; 
        });
    });

    document.querySelectorAll('.skin-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chosenSkin = e.target.getAttribute('data-skin');
            player.setSkin(chosenSkin);
            
            skinsMenu.classList.add('hidden');
            mainMenu.classList.remove('hidden');
        });
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
