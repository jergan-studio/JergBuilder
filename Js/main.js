function setupMenuEvents() {
    const mainMenu = document.getElementById('mainMenu');
    const worldsMenu = document.getElementById('worldsMenu');
    const skinsMenu = document.getElementById('skinsMenu');
    const escMenu = document.getElementById('escMenu');
    const hud = document.getElementById('hud');
    const seedInput = document.getElementById('worldSeed');
    const hudGamemodeDisplay = document.getElementById('hudGamemodeDisplay');

    // Default parameters for the generation console
    let selectedGamemode = 'creative';

    const bindClick = (id, callback) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', callback);
    };

    // Main Navigation Routing Loops
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

    // Gamemode Button Switches
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

    // Launch Handler: Existing Saved Slots (World 1 & World 2)
    document.querySelectorAll('.world-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const worldSlot = e.currentTarget.getAttribute('data-world');
            
            // Simulates loading predetermined flat seeds for static world slots
            if (generateMap) {
                try { generateMap(scene, 'flat', worldSlot); } catch (err) { console.error(err); }
            }

            if (hudGamemodeDisplay) hudGamemodeDisplay.innerText = "CREATIVE MODE";
            
            launchGame();
        });
    });

    // Launch Handler: New Custom World Engine Generator Trigger
    bindClick('btnCreateWorld', () => {
        const rawSeedValue = seedInput ? seedInput.value : "";
        
        // Generates dynamic hills variant using parameters selected by user
        if (generateMap) {
            try { generateMap(scene, 'hills', rawSeedValue); } catch (err) { console.error(err); }
        }

        // Apply mode settings straight into HUD overlay variables
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

    // Preset Skins Assignment Routers
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
