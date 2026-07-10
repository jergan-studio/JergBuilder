import * as THREE from 'three';
import { generateMap } from '../Map/mapGenerator.js';
import { Player } from './player.js';

let scene, camera, renderer, player;
let gameRunning = false;
const canvas = document.getElementById('gameCanvas');

function init() {
    runSplashSequence();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    player = new Player(scene, camera);

    setupMenuEvents();
    setupPointerLock();

    window.addEventListener('resize', onWindowResize);
    
    animate();
}

function runSplashSequence() {
    const splash = document.getElementById('splashScreen');
    const mainMenu = document.getElementById('mainMenu');
    setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => {
            splash.classList.add('hidden');
            mainMenu.classList.remove('hidden');
        }, 1000);
    }, 2500);
}

function setupPointerLock() {
    const escMenu = document.getElementById('escMenu');
    const hud = document.getElementById('hud');

    // Click canvas to trigger pointer lock mechanism
    canvas.addEventListener('click', () => {
        if (gameRunning) {
            canvas.requestPointerLock();
        }
    });

    // Capture browser events when user activates or breaks out of lock focus state
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === canvas) {
            // Mouse locked successfully -> continue gameplay loop
            escMenu.classList.add('hidden');
            hud.classList.remove('hidden');
            gameRunning = true;
        } else {
            // Mouse unlocked (e.g., via ESC key press) -> Open menu pause options
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

    document.querySelectorAll('.world-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chosenWorldType = e.target.getAttribute('data-world');
            generateMap(scene, chosenWorldType);
            
            worldsMenu.classList.add('hidden');
            hud.classList.remove('hidden');
            
            gameRunning = true; 
            canvas.requestPointerLock(); // Auto-engage mouse lock on world start
        });
    });

    document.querySelectorAll('.skin-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            player.setSkin(e.target.getAttribute('data-skin'));
            skinsMenu.classList.add('hidden');
            mainMenu.classList.remove('hidden');
        });
    });

    // ESC Menu Options Actions
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
