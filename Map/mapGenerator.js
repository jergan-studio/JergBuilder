import * as THREE from 'three';

/**
 * Seedable Pseudo-Random Number Generator (PRNG)
 * Uses a linear congruential generator (LCG) to generate deterministic values based on seed.
 */
class SeededRandom {
    constructor(seed = Math.random()) {
        this.setSeed(seed);
    }

    setSeed(seed) {
        if (typeof seed === 'string') {
            let h = 2166136261;
            for (let i = 0; i < seed.length; i++) {
                h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
            }
            this.seed = h >>> 0;
        } else {
            this.seed = Math.abs(seed) || 12345;
        }
    }

    // Returns float between 0 and 1
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
}

/**
 * Simple 2D Perlin/Value Noise Generator driven by Seed
 */
class FastNoise {
    constructor(prng) {
        this.prng = prng;
        this.perm = new Uint8Array(512);
        this.init();
    }

    init() {
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        
        // Shuffle using PRNG
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(this.prng.next() * (i + 1));
            const temp = p[i];
            p[i] = p[j];
            p[j] = temp;
        }

        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
        }
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    get2D(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;

        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);

        const u = this.fade(xf);
        const v = this.fade(yf);

        const aa = this.perm[this.perm[X] + Y];
        const ab = this.perm[this.perm[X] + Y + 1];
        const ba = this.perm[this.perm[X + 1] + Y];
        const bb = this.perm[this.perm[X + 1] + Y + 1];

        const x1 = this.lerp(u, aa / 255, ba / 255);
        const x2 = this.lerp(u, ab / 255, bb / 255);

        return this.lerp(v, x1, x2);
    }
}

export class MapGenerator {
    constructor(scene, seed = 'JergBuilder_Default_Seed') {
        this.scene = scene;
        this.seed = seed;
        this.mapSize = 24; // 24x24 chunk size
        
        this.prng = new SeededRandom(this.seed);
        this.noise = new FastNoise(this.prng);

        this.blockGeometry = new THREE.BoxGeometry(1, 1, 1);
        this.materials = this.initMaterials();

        this.worldBlocks = [];
        this.blockMap = new Map();
    }

    // Set up textures using your Grass texture URL
    initMaterials() {
        const textureLoader = new THREE.TextureLoader();

        // High-quality nearest pixel filtering for voxel style
        const grassTexture = textureLoader.load(
            'https://github.com/jergan-studio/JergBuilder/blob/main/Assets/Grass.png?raw=true',
            (tex) => {
                tex.magFilter = THREE.NearestFilter;
                tex.minFilter = THREE.NearestFilter;
            }
        );

        const grassMat = new THREE.MeshLambertMaterial({ map: grassTexture });
        const dirtMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
        const stoneMat = new THREE.MeshLambertMaterial({ color: 0x777777 });

        return {
            grass: grassMat,
            dirt: dirtMat,
            stone: stoneMat
        };
    }

    // Change seed and regenerate map
    setSeed(newSeed) {
        this.seed = newSeed;
        this.prng.setSeed(newSeed);
        this.noise = new FastNoise(this.prng);
    }

    // Generate terrain based on seed noise
    generate(seedOverride = null) {
        if (seedOverride !== null) {
            this.setSeed(seedOverride);
        }

        this.clearMap();

        const halfSize = Math.floor(this.mapSize / 2);

        for (let x = -halfSize; x < halfSize; x++) {
            for (let z = -halfSize; z < halfSize; z++) {
                // Perlin Noise height calculation
                const nx = x * 0.08;
                const nz = z * 0.08;
                const rawHeight = this.noise.get2D(nx + 100, nz + 100);
                
                // Map height to range [2, 10]
                const maxTerrainHeight = Math.floor(rawHeight * 8) + 2;

                for (let y = 0; y <= maxTerrainHeight; y++) {
                    let mat = this.materials.stone;

                    if (y === maxTerrainHeight) {
                        mat = this.materials.grass; // Top layer is Grass Texture
                    } else if (y >= maxTerrainHeight - 2) {
                        mat = this.materials.dirt; // Dirt layer
                    }

                    this.addBlock(x, y, z, mat);
                }
            }
        }

        console.log(`Map generated with seed: "${this.seed}" (${this.worldBlocks.length} blocks)`);
        return this.worldBlocks;
    }

    addBlock(x, y, z, material = this.materials.grass) {
        const key = `${x},${y},${z}`;
        if (this.blockMap.has(key)) return null;

        const block = new THREE.Mesh(this.blockGeometry, material);
        block.position.set(x + 0.5, y + 0.5, z + 0.5);
        block.castShadow = true;
        block.receiveShadow = true;

        this.scene.add(block);
        this.worldBlocks.push(block);
        this.blockMap.set(key, block);

        return block;
    }

    removeBlock(x, y, z) {
        const key = `${x},${y},${z}`;
        const block = this.blockMap.get(key);
        if (block) {
            this.scene.remove(block);
            const idx = this.worldBlocks.indexOf(block);
            if (idx !== -1) this.worldBlocks.splice(idx, 1);
            this.blockMap.delete(key);
        }
    }

    clearMap() {
        this.worldBlocks.forEach(block => {
            this.scene.remove(block);
        });
        this.worldBlocks = [];
        this.blockMap.clear();
    }
}
