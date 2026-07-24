import * as THREE from 'three';

let generateMap = null;
let Player = null;

let scene, camera, renderer, player;
let gameRunning = false;
let mobileModeEnabled = false;

const canvas = document.getElementById('gameCanvas');
const clock = new THREE.Clock();

// --- 1. MODULE LOADING ---
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

// --- 2. INITIALIZATION ---
function init() {
    // Auto-detect touch screen / mobile devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        mobileModeEnabled = true;
    }

    // Attach menu click listeners IMMEDIATELY before dynamic modules load
    setupMenuEvents();

    // Load dynamic Three.js modules in background
    safelyLoadModules();

    // Setup Three.js scene
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

// --- 3. DISPLAY HELPER FUNCTIONS ---
function hideMenu(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('hidden');
        el.style.display = 'none';
    }
}

function showMenu(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('hidden');
        // Standard overlays use flex, controls use block
        el.style.display = (id === 'hud' || id === 'mobileTouchControls') ? 'block' : 'flex';
    }
}

function hideAllMenus() {
    ['mainMenu', 'worldsMenu', 'skinsMenu', 'settingsMenu', 'escMenu'].forEach(id => hideMenu(id));
}

// --- 4. POINTER LOCK SETUP (PC ONLY) ---
function setupPointerLock() {
    if (!canvas) return;

    canvas.addEventListener('click', () => {
        if (gameRunning && !mobileModeEnabled) {
            canvas.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        if (mobileModeEnabled) return;

        if (document.pointerLockElement === canvas) {
            hideMenu('escMenu');
            showMenu('hud');
            gameRunning = true;
        } else {
            if (gameRunning) {
                showMenu('escMenu');
                hideMenu('hud');
            }
        }
    });
}

// --- 5. EVENT LISTENERS & MENU NAVIGATION ---
function setupMenuEvents() {
    let selectedGamemode = 'creative';

    const btnToggleMobile = document.getElementById('btnToggleMobile');
    if (btnToggleMobile) {
        btnToggleMobile.innerText = mobileModeEnabled ? "Mobile Controls: ON" : "Mobile Controls: OFF";
        btnToggleMobile.style.backgroundColor = mobileModeEnabled ? "#81c784" : "#333";
        btnToggleMobile.style.color = mobileModeEnabled ? "#1c1d31" : "#fff";
    }

    // Global click listener to avoid missing dynamic elements or bubbling bugs
    window.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = btn.id;
        const action = btn.getAttribute('data-action');

        // OPEN WORLDS MENU
        if (id === 'btnWorlds' || action === 'open-worlds' || btn.innerText.includes('Explore Worlds')) {
            e.preventDefault();
            hideAllMenus();
            showMenu('worldsMenu');
            return;
        }

        // OPEN SKINS MENU
        if (id === 'btnSkins' || action === 'open-skins' || btn.innerText.includes('Dress Up Skin')) {
            e.preventDefault();
            hideAllMenus();
            showMenu('skinsMenu');
            return;
        }

        // OPEN SETTINGS MENU
        if (id === 'btnSettingsMenu' || action === 'open-settings' || btn.innerText.includes('Settings')) {
            e.preventDefault();
            hideAllMenus();
            showMenu('settingsMenu');
            return;
        }

        // BACK TO MAIN MENU
        if (btn.classList.contains('btnBack') || action === 'go-back' || btn.innerText.includes('Back')) {
            e.preventDefault();
            hideAllMenus();
            showMenu('mainMenu');
            return;
        }

        // TOGGLE MOBILE CONTROLS
        if (id === 'btnToggleMobile' || action === 'toggle-mobile') {
            e.preventDefault();
            mobileModeEnabled = !mobileModeEnabled;
            btn.innerText = mobileModeEnabled ? "Mobile Controls: ON" : "Mobile Controls: OFF";
            btn.style.backgroundColor = mobileModeEnabled ? "#81c784" : "#333";
            btn.style.color = mobileModeEnabled ? "#1c1d31" : "#fff";
            return;
        }

        // SELECT CREATIVE MODE
        if (id === 'modeCreative' || action === 'mode-creative') {
            e.preventDefault();
            selectedGamemode = 'creative';
            const creativeBtn = document.getElementById('modeCreative');
            const survivalBtn = document.getElementById('modeSurvival');
            if (creativeBtn) { creativeBtn.style.backgroundColor = "#81c784"; creativeBtn.style.color = "#1c1d31"; creativeBtn.style.opacity = "1"; }
            if (survivalBtn) { survivalBtn.style.backgroundColor = "#333"; survivalBtn.style.opacity = "0.5"; survivalBtn.style.color = "#fff"; }
            return;
        }

        // SELECT SURVIVAL MODE
        if (id === 'modeSurvival' || action === 'mode-survival') {
            e.preventDefault();
            selectedGamemode = 'survival';
            const creativeBtn = document.getElementById('modeCreative');
            const survivalBtn = document.getElementById('modeSurvival');
            if (survivalBtn) { survivalBtn.style.backgroundColor = "#f44336"; survivalBtn.style.color = "#ffffff"; survivalBtn.style.opacity = "1"; }
            if (creativeBtn) { creativeBtn.style.backgroundColor = "#333"; creativeBtn.style.opacity = "0.5"; creativeBtn.style.color = "#fff"; }
            return;
        }

        // LAUNCH PRESET WORLD
        if (btn.classList.contains('world-select') || action === 'select-world') {
            e.preventDefault();
            const worldSlot = btn.getAttribute('data-world') || 'world1';
            if (generateMap) {
                try { generateMap(scene, 'flat', worldSlot); } catch (err) { console.error(err); }
            }
            updateHud("CREATIVE MODE", '#81c784');
            launchGame();
            return;
        }

        // CREATE NEW WORLD
        if (id === 'btnCreateWorld' || action === 'create-world') {
            e.preventDefault();
            const seedInput = document.getElementById('worldSeed');
            const rawSeedValue = seedInput ? seedInput.value : "";
            if (generateMap) {
                try { generateMap(scene, 'hills', rawSeedValue); } catch (err) { console.error(err); }
            }
            updateHud(`${selectedGamemode.toUpperCase()} MODE`, selectedGamemode === 'survival' ? '#f44336' : '#81c784');
            launchGame();
            return;
        }

        // OPEN PAUSE MENU (MOBILE BUTTON)
        if (action === 'open-pause' || id === 'btnMobilePause') {
            e.preventDefault();
            gameRunning = false;
            hideMenu('mobileTouchControls');
            showMenu('escMenu');
            return;
        }

        // RESUME GAME
        if (id === 'btnResume' || action === 'resume-game') {
            e.preventDefault();
            hideAllMenus();
            showMenu('hud');
            if (mobileModeEnabled) {
                showMenu('mobileTouchControls');
            } else if (canvas) {
                canvas.requestPointerLock();
            }
            gameRunning = true;
            return;
        }

        // QUIT TO MAIN MENU
        if (id === 'btnQuit' || action === 'quit-game') {
            e.preventDefault();
            gameRunning = false;
            if (document.pointerLockElement === canvas) document.exitPointerLock();
            hideAllMenus();
            hideMenu('hud');
            hideMenu('mobileTouchControls');
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
        showMenu('hud');

        if (mobileModeEnabled) {
            showMenu('mobileTouchControls');
        } else {
            hideMenu('mobileTouchControls');
        }

        if (Player) {
            try { 
                player = new Player(scene, camera); 
            } catch(e) { 
                console.error("Player initiation exception:", e); 
            }
        }

        gameRunning = true; 
        if (!mobileModeEnabled && canvas) canvas.requestPointerLock(); 
    }
}

// --- 6. RENDER & RESIZE LOOPS ---
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

// Safe bootstrap check
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
