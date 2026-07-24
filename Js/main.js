import * as THREE from 'three';

let generateMap = null;
let Player = null;

async function safelyLoadModules() {
    try {
        const mapMod = await import('../Map/mapGenerator.js');
        generateMap = mapMod.generateMap;
    } catch (e) { console.error("Could not load Map/mapGenerator.js", e); }

    try {
        const playerMod = await import('./player.js');
        Player = playerMod.Player;
    } catch (e) { console.error("Could not load Js/player.js", e); }
}

let scene, camera, renderer, player;
let gameRunning = false;
let currentProfile = 'desktop'; 
const canvas = document.getElementById('gameCanvas');
const clock = new THREE.Clock();

async function init() {
    await safelyLoadModules();

    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        currentProfile = 'mobile';
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa5d6a7); 

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    if (canvas) {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
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
        if (gameRunning && currentProfile === 'desktop') {
            canvas.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        if (currentProfile !== 'desktop') return;
        
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
    const seedInput = document.getElementById('worldSeed');
    const hudGamemodeDisplay = document.getElementById('hudGamemodeDisplay');

    let selectedGamemode = 'creative';

    const safeBindClick = (id, callback) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', callback);
    };

    // FIXED BUTTON CLICKS: Adding/Removing utility classes cleanly
    safeBindClick('btnWorlds', () => {
        if (mainMenu) mainMenu.classList.add('hidden');
        if (worldsMenu) worldsMenu.classList.remove('hidden');
    });

    safeBindClick('btnSkins', () => {
        if (mainMenu) mainMenu.classList.add('hidden');
        if (skinsMenu) skinsMenu.classList.remove('hidden');
    });

    document.querySelectorAll('.btnBack').forEach(btn => {
        btn.addEventListener('click', () => {
            if (worldsMenu) worldsMenu.classList.add('hidden');
            if (skinsMenu) skinsMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        });
    });

    const btnCreative = document.getElementById('modeCreative');
    const btnSurvival = document.getElementById('modeSurvival');

    if (btnCreative && btnSurvival) {
        btnCreative.addEventListener('click', () => {
            selectedGamemode = 'creative';
            btnCreative.style.backgroundColor = "#4caf50"; btnCreative.style.color = "black";
            btnSurvival.style.backgroundColor = "#333"; btnSurvival.style.opacity = "0.5";
        });

        btnSurvival.addEventListener('click', () => {
            selectedGamemode = 'survival';
            btnSurvival.style.backgroundColor = "#f44336"; btnSurvival.style.color = "white";
            btnCreative.style.backgroundColor = "#333"; btnCreative.style.opacity = "0.5";
        });
    }

    document.querySelectorAll('.world-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const worldSlot = e.currentTarget.getAttribute('data-world');
            if (generateMap) {
                try { generateMap(scene, 'flat', worldSlot); } catch (err) { console.error(err); }
            }
            if (hudGamemodeDisplay) {
                hudGamemodeDisplay.innerText = "CREATIVE MODE";
                hudGamemodeDisplay.style.backgroundColor = '#4caf50';
            }
            launchGame();
        });
    });

    safeBindClick('btnCreateWorld', () => {
        const rawSeedValue = seedInput ? seedInput.value : "";
        if (generateMap) {
            try { generateMap(scene, 'hills', rawSeedValue); } catch (err) { console.error(err); }
        }
        if (hudGamemodeDisplay) {
            hudGamemodeDisplay.innerText = `${selectedGamemode.toUpperCase()} MODE`;
            hudGamemodeDisplay.style.backgroundColor = selectedGamemode === 'survival' ? '#f44336' : '#4caf50';
        }
        launchGame();
    });

    function launchGame() {
        if (worldsMenu) worldsMenu.classList.add('hidden');
        if (hud) hud.classList.remove('hidden');

        if (Player) {
            try { 
                player = new Player(scene, camera); 
            } catch(e) { 
                console.error("Player initiation exception:", e); 
            }
        }

        gameRunning = true; 
        if (currentProfile === 'desktop' && canvas) canvas.requestPointerLock(); 
    }

    safeBindClick('btnResume', () => {
        if (escMenu) escMenu.classList.add('hidden');
        if (hud) hud.classList.remove('hidden');
        if (currentProfile === 'desktop' && canvas) canvas.requestPointerLock();
        gameRunning = true;
    });

    safeBindClick('btnQuit', () => {
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
    const delta = clock.getDelta();

    if (gameRunning && player && typeof player.update === 'function') {
        player.update(delta);
    }
    
    if (renderer && scene && camera) renderer.render(scene, camera);
}

init();
