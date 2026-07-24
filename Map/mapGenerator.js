import * as THREE from 'three';

/**
 * Creates a fallback pixel-art grass texture (Green top, Tan bottom) via Canvas Data URL
 */
function createFallbackGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');

    // Dirt/Tan Base
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(0, 0, 16, 16);

    // Green Grass Top
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(0, 0, 16, 6);

    // Pixel detail accents
    ctx.fillStyle = '#388e3c';
    ctx.fillRect(2, 4, 2, 3);
    ctx.fillRect(8, 3, 3, 3);
    ctx.fillRect(13, 5, 2, 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

function createRandomFromSeed(seedStr) {
    let hash = 0;
    if (!seedStr || seedStr.length === 0) {
        seedStr = Math.random().toString();
    }
    
    for (let i = 0; i < seedStr.length; i++) {
        const char = seedStr.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    
    return function() {
        hash = (hash * 1664525 + 1013904223) | 0;
        return ((hash >>> 0) / 4294967296);
    };
}

export function generateMap(scene, mode = 'flat', seed = '') {
    // Clear existing environment meshes
    const meshesToRemove = [];
    scene.traverse((child) => {
        if (child.isMesh) {
            meshesToRemove.push(child);
        }
    });
    meshesToRemove.forEach(mesh => scene.remove(mesh));

    // Load texture with CORS header bypass and fallback protection
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';

    let grassTexture = createFallbackGrassTexture();

    // Try loading the official GitHub Grass asset
    textureLoader.load(
        'https://raw.githubusercontent.com/jergan-studio/JergBuilder/main/Assets/Grass.png',
        (loadedTexture) => {
            loadedTexture.magFilter = THREE.NearestFilter;
            loadedTexture.minFilter = THREE.NearestFilter;
            blockMaterial.map = loadedTexture;
            blockMaterial.needsUpdate = true;
            console.log("Loaded JergBuilder Grass.png asset successfully.");
        },
        undefined,
        (err) => {
            console.warn("Could not fetch remote Grass.png asset directly, applying procedural grass texture fallback.", err);
        }
    );

    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    const blockMaterial = new THREE.MeshLambertMaterial({ map: grassTexture });

    const worldSize = 32;
    const seededRandom = createRandomFromSeed(seed);

    const seedOffset1 = seededRandom() * 1000;
    const seedOffset2 = seededRandom() * 1000;

    for (let x = -worldSize / 2; x < worldSize / 2; x++) {
        for (let z = -worldSize / 2; z < worldSize / 2; z++) {
            let height = 1;

            if (mode === 'hills') {
                const frequency1 = 0.15;
                const frequency2 = 0.08;

                const baseNoise = Math.sin((x + seedOffset1) * frequency1) * Math.cos((z + seedOffset1) * frequency1);
                const largeNoise = Math.sin((x + seedOffset2) * frequency2) * Math.cos((z + seedOffset2) * frequency2) * 3;
                
                height = Math.max(1, Math.floor((baseNoise * 2) + largeNoise + 4));
            }

            for (let y = 0; y < height; y++) {
                const blockMesh = new THREE.Mesh(blockGeometry, blockMaterial);
                blockMesh.position.set(x + 0.5, y + 0.5, z + 0.5);
                scene.add(blockMesh);
            }
        }
    }
}
