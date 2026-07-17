import * as THREE from 'three';

/**
 * Simple pseudo-random hash generator for seed parsing
 * @param {string} seedStr 
 * @returns {function} A seeded random number generator function
 */
function createRandomFromSeed(seedStr) {
    let hash = 0;
    if (seedStr.length === 0) return Math.random;
    
    for (let i = 0; i < seedStr.length; i++) {
        const char = seedStr.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    
    return function() {
        const x = Math.sin(hash++) * 10000;
        return x - Math.floor(x);
    };
}

/**
 * Generates the map grid environment for JergBuilder
 * @param {THREE.Scene} scene The active game scene
 * @param {string} mode 'flat' or 'hills'
 * @param {string} seed The world generation seed string
 */
export function generateMap(scene, mode = 'flat', seed = '') {
    // Clear out any old procedural meshes from the scene first
    const meshesToRemove = [];
    scene.traverse((child) => {
        if (child.isMesh && child !== scene.userData.playerMesh) {
            meshesToRemove.push(child);
        }
    });
    meshesToRemove.forEach(mesh => scene.remove(mesh));

    // Initialize our texture loader and pixelated grass texture
    const textureLoader = new THREE.TextureLoader();
    const grassTexture = textureLoader.load('https://github.com/jergan-studio/JergBuilder/blob/main/Assets/Grass.png?raw=true');
    
    // Set texturing properties to keep your pixel art sharp
    grassTexture.magFilter = THREE.NearestFilter;
    grassTexture.minFilter = THREE.NearestFilter;
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;

    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    const blockMaterial = new THREE.MeshLambertMaterial({ map: grassTexture });

    const worldSize = 32; // Size of the generation grid box
    const seededRandom = createRandomFromSeed(seed);

    // Grid Generation Loop
    for (let x = -worldSize / 2; x < worldSize / 2; x++) {
        for (let z = -worldSize / 2; z < worldSize / 2; z++) {
            let height = 1; // Default flat baseline height

            if (mode === 'hills') {
                // Generate simple undulating hill formulas based on coordinates and our custom seed hash multiplier
                const frequency1 = 0.1;
                const frequency2 = 0.05;
                const seedOffset = seededRandom() * 100;

                const baseNoise = Math.sin((x + seedOffset) * frequency1) * Math.cos((z + seedOffset) * frequency1);
                const largeNoise = Math.sin((x + seedOffset) * frequency2) * 3;
                
                // Final calculation mapping noise onto clean block increments
                height = Math.max(1, Math.floor((baseNoise * 2) + largeNoise + 3));
            }

            // Build the block stack vertically up to the computed height limit
            for (let y = 0; y < height; y++) {
                const blockMesh = new THREE.Mesh(blockGeometry, blockMaterial);
                
                // Offset by 0.5 to align blocks cleanly to the integer grid positions
                blockMesh.position.set(x + 0.5, y + 0.5, z + 0.5);
