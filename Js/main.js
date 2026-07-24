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
let currentProfile = 'desktop'; 
let mobileModeEnabled = false;

const canvas = document.getElementById('gameCanvas');
const clock = new THREE.Clock();

async function init() {
    await safelyLoadModules();

    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        currentProfile = 'mobile';
        mobileModeEnabled = true;
    }

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
        if (gameRunning && currentProfile === 'desktop' && !mobileModeEnabled) {
            canvas.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        if (currentProfile !== 'desktop' || mobileModeEnabled) return;
        
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
    const mobileTouchControls = document.getElementById('mobileTouchControls');
    const seedInput = document.getElementById('worldSeed');
    const hudGamemodeDisplay = document.getElementById('hudGamemodeDisplay');
    const btnToggleMobile = document.getElementById('btnToggleMobile');

    let selectedGamemode = 'creative';

    const hideAllMenus = () => {
        if (mainMenu) mainMenu.classList.add('hidden');
        if (worldsMenu) worldsMenu.classList.add('hidden');
        if (skinsMenu) skinsMenu.classList.add('hidden');
        if (settingsMenu) settingsMenu.classList.add('hidden');
        if (escMenu) escMenu.classList.add('hidden');
    };

    // Global Event Delegation Listener
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = btn.id;
        const action = btn.getAttribute('data-action');

        // WORLD MENU SWITCHING
        if (id === 'btnWorlds' || action === 'open-worlds') {
            e.preventDefault();
            hideAllMenus();
            if (worldsMenu) worldsMenu.classList.remove('hidden');
            return;
        }

        // SKIN MENU SWITCHING
        if (id === 'btnSkins' || action === 'open-skins') {
            e.preventDefault();
            hideAllMenus();
            if (skinsMenu) skinsMenu.classList.remove('hidden');
            return;
        }

        // SETTINGS MENU SWITCHING
        if (id === 'btnSettingsMenu' || action === 'open-settings') {
            e.preventDefault();
            hideAllMenus();
            if (settingsMenu) settingsMenu.classList.remove('hidden');
            return;
        }

        // BACK BUTTONS
        if (btn.classList.contains('btnBack') || action === 'go-back') {
            e.preventDefault();
            hideAllMenus();
            if (mainMenu) mainMenu.classList.remove('hidden');
            return;
        }

        // MOBILE TOGGLE
        if (id === 'btnToggleMobile' || action === 'toggle-mobile') {
            e.preventDefault();
            mobileModeEnabled = !mobileModeEnabled;
            if (btnToggleMobile) {
                btnToggleMobile.innerText = mobileModeEnabled ? "Mobile Controls: ON" : "Mobile Controls: OFF";
                btnToggleMobile.style.backgroundColor = mobileModeEnabled ? "#81c784" : "#333";
                btnToggleMobile.style.color = mobileModeEnabled ? "#1c1d31" : "#fff";
            }
            return;
        }

        // GAMEMODE CREATIVE
        if (id === 'modeCreative' || action === 'mode-creative') {
            e.preventDefault();
            selectedGamemode = 'creative';
            const creativeBtn = document.getElementById('modeCreative');
            const survivalBtn = document.getElementById('modeSurvival');
            if (creativeBtn) { creativeBtn.style.backgroundColor = "#81c784"; creativeBtn.style.color = "#1c1d31"; creativeBtn.style.opacity = "1"; }
            if (survivalBtn) { survivalBtn.style.backgroundColor = "#333"; survivalBtn.style.opacity = "0.5"; survivalBtn.style.color = "#fff"; }
            return;
        }

        // GAMEMODE SURVIVAL
        if (id === 'modeSurvival' || action === 'mode-survival') {
            e.preventDefault();
            selectedGamemode = 'survival';
            const creativeBtn = document.getElementById('modeCreative');
            const survivalBtn = document.getElementById('modeSurvival');
            if (survivalBtn) { survivalBtn.style.backgroundColor = "#f44336"; survivalBtn.style.color = "#ffffff"; survivalBtn.style.opacity = "1"; }
            if (creativeBtn) { creativeBtn.style.backgroundColor = "#333"; creativeBtn.style.opacity = "0.5"; creativeBtn.style.color = "#fff"; }
            return;
        }

        // PRESET WORLD SELECTION
        if (btn.classList.contains('world-select') || action === 'select-world') {
            e.preventDefault();
            const worldSlot = btn.getAttribute('data-world') || 'world1';
            if (generateMap) {
                try { generateMap(scene, 'flat', worldSlot); } catch (err) { console.error(err); }
            }
            if (hudGamemodeDisplay) {
                hudGamemodeDisplay.innerText = "CREATIVE MODE";
                hudGamemodeDisplay.style.backgroundColor = '#81c784';
            }
            launchGame();
            return;
        }

        // CREATE NEW SEEDED WORLD
        if (id === 'btnCreateWorld' || action === 'create-world') {
            e.preventDefault();
            const rawSeedValue = seedInput ? seedInput.value : "";
            if (generateMap) {
                try { generateMap(scene, 'hills', rawSeedValue); } catch (err) { console.error(err); }
            }
            if (hudGamemodeDisplay) {
                hudGamemodeDisplay.innerText = `${selectedGamemode.toUpperCase()} MODE`;
                hudGamemodeDisplay.style.backgroundColor = selectedGamemode === 'survival' ? '#f44336' : '#81c784';
            }
            launchGame();
            return;
        }

        // PAUSE / RESUME / QUIT
        if (id === 'btnResume' || action === 'resume-game') {
            e.preventDefault();
            if (escMenu) escMenu.classList.add('hidden');
            if (hud) hud.classList.remove('hidden');
            if (currentProfile === 'desktop' && !mobileModeEnabled && canvas) {
                canvas.requestPointerLock();
            }
            gameRunning = true;
            return;
        }

        if (id === 'btnQuit' || action === 'quit-game') {
            e.preventDefault();
            gameRunning = false;
            if (document.pointerLockElement === canvas) document.exitPointerLock();
            hideAllMenus();
            if (hud) hud.classList.add('hidden');
            if (mobileTouchControls) {
                mobileTouchControls.classList.add('hidden');
                mobileTouchControls.style.display = 'none';
            }
            if (mainMenu) mainMenu.classList.remove('hidden');
            return;
        }
    });

    function launchGame() {
        hideAllMenus();
        if (hud) hud.classList.remove('hidden');

        if (mobileTouchControls) {
            if (mobileModeEnabled) {
                mobileTouchControls.classList.remove('hidden');
                mobileTouchControls.style.display = 'block';
            } else {
                mobileTouchControls.classList.add('hidden');
                mobileTouchControls.style.display = 'none';
            }
        }

        if (Player) {
            try { 
                player = new Player(scene, camera); 
            } catch(e) { 
                console.error("Player initiation exception:", e); 
            }
        }

        gameRunning = true; 
        if (currentProfile === 'desktop' && !mobileModeEnabled && canvas) {
            canvas.requestPointerLock(); 
        }
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
} else {
    init();
}
