import * as THREE from 'three';

// Safe module imports to prevent script failures if files are missing
let generateMap, Player;
try {
    const mapMod = await import('../Map/mapGenerator.js');
    generateMap = mapMod.generateMap;
} catch(e) { console.error("Could not load mapGenerator.js", e); }

try {
    const playerMod = await import('./player.js');
    Player = playerMod.Player;
} catch(e) { console.error("Could not load player.js", e); }

let scene, camera, renderer, player;
let gameRunning = false;
const canvas = document.getElementById('gameCanvas');
const clock = new THREE.Clock();

function init() {
    // 1. Core Three.js Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Classic Sky Blue

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 2. Scene Light Illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(12, 24, 8);
    scene.add(dirLight);

    // 3. Spawning Player Safely
    if (Player) {
        try { player = new Player(scene, camera); } catch(e) { console.error(e); }
    }

    // 4. Input and Interactivity Systems Initialization
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
        if (gameRunning) canvas.requestPointerLock();
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
    const escMenu = document.getElementById('escMenu');
    const hud = document.getElementById('hud');
    const seedInput = document.getElementById('worldSeed');
    const hudGamemodeDisplay = document.getElementById('hudGamemodeDisplay');

    // Default configuration metrics for the setup engine console
    let selectedGamemode = 'creative';

    const bindClick = (id, callback) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', callback);
    };

    // Main Navigation Interactivity Routes
    bindClick('btnWorlds', () => {
        mainMenu.classList.add('hidden');
        worldsMenu.classList.remove('hidden');
    });

    bindClick('btnSkins', () => {
        mainMenu.classList.add('hidden');
        skinsMenu.classList.remove('hidden');
    });

    document.querySelectorAll('.btnBack').forEach(btn => {
        btn.addEventListener('click', () => {
            if (worldsMenu) worldsMenu.classList.add('hidden');
            if (skinsMenu) skinsMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        });
    });

    // Gamemode Selection Selector UI Switches
    const btnCreative = document.getElementById('modeCreative');
    const btnSurvival = document.getElementById('modeSurvival');

    if (btnCreative && btnSurvival) {
        btnCreative.addEventListener('click', () => {
            selectedGamemode = 'creative';
            btnCreative.style.opacity = "1";
            btnCreative.style.filter = "none";
            btnSurvival.style.opacity = "0.5";
            btnSurvival.style.filter = "grayscale(1)";
        });

        btnSurvival.addEventListener('click', () => {
            selectedGamemode = 'survival';
            btnSurvival.style.opacity = "1";
            btnSurvival.style.filter = "none";
            btnCreative.style.opacity = "0.5";
            btnCreative.style.filter = "grayscale(1)";
        });
    }

    // Launch Core Hook: Pre-saved World slots 1 and 2
    document.querySelectorAll('.world-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const worldSlot = e.currentTarget.getAttribute('data-world');
            
            // Fires static flat maps default assignments for slot indices
            if (generateMap) {
                try { generateMap(scene, 'flat', worldSlot); } catch (err) { console.error(err); }
            }

            if (hudGamemodeDisplay) hudGamemodeDisplay.innerText = "CREATIVE MODE";
            
            launchGame();
        });
    });

    // Launch Core Hook: Procedural generation console executor block
    bindClick('btnCreateWorld', () => {
        const rawSeedValue = seedInput ? seedInput.value : "";
        
        // Dynamically processes seed calculations inside custom noise math
        if (generateMap) {
            try { generateMap(scene, 'hills', rawSeedValue); } catch (err) { console.error(err); }
        }

        // Adjust in-game display overlay trackers
        if (hudGamemodeDisplay) {
            hudGamemodeDisplay.innerText = `${selectedGamemode} mode`;
            hudGamemodeDisplay.style.backgroundColor = selectedGamemode === 'survival' ? '#f44336' : '#4caf50';
        }

        launchGame();
    });

    function launchGame() {
        if (worldsMenu) worldsMenu.classList.add('hidden');
        if (hud) hud.classList.remove('hidden');
        gameRunning = true; 
        if (canvas) canvas.requestPointerLock(); 
    }

    // Skin Assignment System Interface
    document.querySelectorAll('.skin-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const skinName = e.currentTarget.getAttribute('data-skin');
            if (player && typeof player.setSkin === 'function') {
                player.setSkin(skinName);
            }
            if (skinsMenu) skinsMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        });
    });

    bindClick('btnCustomSkin', () => {
        const url = prompt("Enter skin URL:", "https://i.imgur.com/yourImage.png");
        if (url && player && typeof player.setSkin === 'function') {
            player.setSkin('custom', url);
            if (skinsMenu) skinsMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        }
    });

    // Pause Escape Overlay Control Maps
    bindClick('btnResume', () => {
        if (canvas) canvas.requestPointerLock();
    });

    bindClick('btnQuit', () => {
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
    const elapsedTime = clock.getElapsedTime();

    if (gameRunning && player && typeof player.update === 'function') {
        player.update();
    }
    
    if (scene) {
        scene.traverse((child) => {
            if (child.isMesh && child.material && child.material.uniforms) {
                if (child.material.uniforms.uTime) child.material.uniforms.uTime.value = elapsedTime;
                if (child.material.uniforms.uCameraPosition && camera) child.material.uniforms.uCameraPosition.value.copy(camera.position);
            }
        });
    }
    
    if (renderer && scene && camera) renderer.render(scene, camera);
}

// Initial engine configuration sequence activation
init();
