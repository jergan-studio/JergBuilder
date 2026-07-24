import * as THREE from 'three';

let generateMap = null;
let Player = null;

let scene, camera, renderer, player;
let gameRunning = false;

const canvas = document.getElementById('gameCanvas');
const clock = new THREE.Clock();

// Safely load dynamic modules in the background without blocking UI initialization
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

async function init() {
    // 1. Initialize UI events immediately
    setupMenuEvents();

    // 2. Load background modules
    await safelyLoadModules();

    // 3. Setup Three.js Scene
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

    setupPointerLock();

    window.addEventListener('resize', onWindowResize);
    animate();
}

function setupPointerLock() {
    if (!canvas) return;

    canvas.addEventListener('click', () => {
        if (gameRunning) {
            canvas.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        const escMenu = document.getElementById('escMenu');
        const hud = document.getElementById('hud');

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
    let selectedGamemode = 'creative';

    const hideAllMenus = () => {
        ['mainMenu', 'worldsMenu', 'skinsMenu', 'settingsMenu', 'escMenu'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
    };

    const showMenu = (id) => {
        hideAllMenus();
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    };

    // Event Delegation to handle all button clicks safely
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = btn.id;
        const action = btn.getAttribute('data-action');

        // --- OPEN WORLDS MENU ---
        if (id === 'btnWorlds' || action === 'open-worlds') {
            e.preventDefault();
            showMenu('worldsMenu');
            return;
        }

        // --- OPEN SKINS MENU ---
        if (id === 'btnSkins' || action === 'open-skins') {
            e.preventDefault();
            showMenu('skinsMenu');
            return;
        }

        // --- OPEN SETTINGS MENU ---
        if (id === 'btnSettingsMenu' || action === 'open-settings') {
            e.preventDefault();
            showMenu('settingsMenu');
            return;
        }

        // --- BACK TO MAIN MENU ---
        if (btn.classList.contains('btnBack') || action === 'go-back') {
            e.preventDefault();
            showMenu('mainMenu');
            return;
        }

        // --- MODE TOGGLES ---
        if (id === 'modeCreative' || action === 'mode-creative') {
            e.preventDefault();
            selectedGamemode = 'creative';
            const creativeBtn = document.getElementById('modeCreative');
            const survivalBtn = document.getElementById('modeSurvival');
            if (creativeBtn) { creativeBtn.style.backgroundColor = "#4caf50"; creativeBtn.style.color = "black"; creativeBtn.style.opacity = "1"; }
            if (survivalBtn) { survivalBtn.style.backgroundColor = "#333"; survivalBtn.style.opacity = "0.5"; survivalBtn.style.color = "white"; }
            return;
        }

        if (id === 'modeSurvival' || action === 'mode-survival') {
            e.preventDefault();
            selectedGamemode = 'survival';
            const creativeBtn = document.getElementById('modeCreative');
            const survivalBtn = document.getElementById('modeSurvival');
            if (survivalBtn) { survivalBtn.style.backgroundColor = "#f44336"; survivalBtn.style.color = "white"; survivalBtn.style.opacity = "1"; }
            if (creativeBtn) { creativeBtn.style.backgroundColor = "#333"; creativeBtn.style.opacity = "0.5"; creativeBtn.style.color = "white"; }
            return;
        }

        // --- SELECT PRESET WORLD ---
        if (btn.classList.contains('world-select') || action === 'select-world') {
            e.preventDefault();
            const worldSlot = btn.getAttribute('data-world') || 'world1';
            if (generateMap) {
                try { generateMap(scene, 'flat', worldSlot); } catch (err) { console.error(err); }
            }
            updateHud("CREATIVE MODE", '#4caf50');
            launchGame();
            return;
        }

        // --- CREATE WORLD ---
        if (id === 'btnCreateWorld' || action === 'create-world') {
            e.preventDefault();
            const seedInput = document.getElementById('worldSeed');
            const rawSeedValue = seedInput ? seedInput.value : "";
            if (generateMap) {
                try { generateMap(scene, 'hills', rawSeedValue); } catch (err) { console.error(err); }
            }
            updateHud(`${selectedGamemode.toUpperCase()} MODE`, selectedGamemode === 'survival' ? '#f44336' : '#4caf50');
            launchGame();
            return;
        }

        // --- PAUSE MENU ACTIONS ---
        if (id === 'btnResume' || action === 'resume-game') {
            e.preventDefault();
            hideAllMenus();
            const hud = document.getElementById('hud');
            if (hud) hud.classList.remove('hidden');
            if (canvas) canvas.requestPointerLock();
            gameRunning = true;
            return;
        }

        if (id === 'btnQuit' || action === 'quit-game') {
            e.preventDefault();
            gameRunning = false;
            if (document.pointerLockElement === canvas) document.exitPointerLock();
            hideAllMenus();
            const hud = document.getElementById('hud');
            if (hud) hud.classList.add('hidden');
            showMenu('mainMenu');
            return;
        }
    });

    function updateHud(text, bgColor) {
        const hudDisplay = document.getElementById('hudGamemodeDisplay');
        if (hudDisplay) {
            hudDisplay.innerText = text;
            hudDisplay.style.backgroundColor = bgColor;
        }
    }

    function launchGame() {
        hideAllMenus();
        const hud = document.getElementById('hud');
        if (hud) hud.classList.remove('hidden');

        if (Player) {
            try { 
                player = new Player(scene, camera); 
            } catch(e) { 
                console.error("Player initiation exception:", e); 
            }
        }

        gameRunning = true; 
        if (canvas) canvas.requestPointerLock(); 
    }
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

// Start immediately on DOM Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
} else {
    init();
}
