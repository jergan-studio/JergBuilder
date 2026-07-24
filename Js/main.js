import * as THREE from 'three';

let generateMap = null;
let Player = null;

async function safelyLoadModules() {
    try {
        const mapMod = await import('../Map/mapGenerator.js');
        generateMap = mapMod.generateMap;
    } catch (e) { 
        console.error("Could not load Map/mapGenerator.js", e); 
    }

    try {
        const playerMod = await import('./player.js');
        Player = playerMod.Player;
    } catch (e) { 
        console.error("Could not load Js/player.js", e); 
    }
}

let scene, camera, renderer, player;
let gameRunning = false;

const canvas = document.getElementById('gameCanvas');
const clock = new THREE.Clock();

async function init() {
    await safelyLoadModules();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa5d6a7); 

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    if (canvas) {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

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
            }
        }
    });
}

function setupMenuEvents() {
    const mainMenu = document.getElementById('mainMenu');
    const worldsMenu = document.getElementById('worldsMenu');
    const skinsMenu = document.getElementById('skinsMenu');
    const settingsMenu = document.getElementById('settingsMenu');
    const escMenu = document.getElementById('escMenu');
    const hud = document.getElementById('hud');
    const seedInput = document.getElementById('worldSeed');
    const hudGamemodeDisplay = document.getElementById('hudGamemodeDisplay');

    let selectedGamemode = 'creative';

    const hideAll = () => {
        if (mainMenu) mainMenu.classList.add('hidden');
        if (worldsMenu) worldsMenu.classList.add('hidden');
        if (skinsMenu) skinsMenu.classList.add('hidden');
        if (settingsMenu) settingsMenu.classList.add('hidden');
        if (escMenu) escMenu.classList.add('hidden');
    };

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = btn.id;
        const action = btn.getAttribute('data-action');

        // NAVIGATE TO WORLDS
        if (id === 'btnWorlds' || action === 'open-worlds') {
            e.preventDefault();
            hideAll();
            if (worldsMenu) worldsMenu.classList.remove('hidden');
        }

        // NAVIGATE TO SKINS
        if (id === 'btnSkins' || action === 'open-skins') {
            e.preventDefault();
            hideAll();
            if (skinsMenu) skinsMenu.classList.remove('hidden');
        }

        // NAVIGATE TO SETTINGS
        if (id === 'btnSettingsMenu' || action === 'open-settings') {
            e.preventDefault();
            hideAll();
            if (settingsMenu) settingsMenu.classList.remove('hidden');
        }

        // BACK BUTTON
        if (btn.classList.contains('btnBack') || action === 'go-back') {
            e.preventDefault();
            hideAll();
            if (mainMenu) mainMenu.classList.remove('hidden');
        }

        // GAMEMODE: CREATIVE
        if (id === 'modeCreative' || action === 'mode-creative') {
            e.preventDefault();
            selectedGamemode = 'creative';
            btn.style.backgroundColor = "#4caf50";
            btn.style.color = "black";
            const surv = document.getElementById('modeSurvival');
            if (surv) { surv.style.backgroundColor = "#333"; surv.style.opacity = "0.5"; surv.style.
