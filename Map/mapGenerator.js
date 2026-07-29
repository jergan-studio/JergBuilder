import * as THREE from 'three';

export class MapGenerator {
    constructor(scene, seed) {
        this.scene = scene;
        this.seed = seed || 'default_seed';
        
        // Map to store block positions: key "x,y,z" -> block data
        this.blocks = new Map();
        this.islandRadius = 24;

        // Texture Loader
        this.textureLoader = new THREE.TextureLoader();
        this.materials = {};
        this.initMaterials();
    }

    initMaterials() {
        // Load custom Grass Texture from JergBuilder Assets
        const grassTexture = this.textureLoader.load('Assets/Grass.png');
        grassTexture.magFilter = THREE.NearestFilter;
        grassTexture.minFilter = THREE.NearestFilter;

        // Block Materials
        this.materials.grass = new THREE.MeshStandardMaterial({ 
            map: grassTexture,
            roughness: 0.8 
        });

        this.materials.dirt = new THREE.MeshStandardMaterial({ 
            color: 0x5c4033, 
            roughness: 0.9 
        });

        this.materials.stone = new THREE.MeshStandardMaterial({ 
            color: 0x777777, 
            roughness: 0.7 
        });
    }

    generate() {
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);

        for (let x = -this.islandRadius; x <= this.islandRadius; x++) {
            for (let z = -this.islandRadius; z <= this.islandRadius; z++) {
                const distFromCenter = Math.sqrt(x * x + z * z);

                if (distFromCenter <= this.islandRadius) {
                    // Generate height contour for island
                    const height = Math.floor(12 + Math.sin(x * 0.15) * 2.5 + Math.cos(z * 0.15) * 2.5);

                    // Build vertical column of blocks
                    for (let y = height - 5; y <= height; y++) {
                        let mat = this.materials.stone;
                        let type = 'stone';

                        if (y === height) {
                            mat = this.materials.grass;
                            type = 'grass';
                        } else if (y > height - 3) {
                            mat = this.materials.dirt;
                            type = 'dirt';
                        }

                        const block = new THREE.Mesh(boxGeo, mat);
                        block.position.set(x, y, z);
                        block.castShadow = true;
                        block.receiveShadow = true;

                        this.scene.add(block);

                        // Store block by string coordinate key for lightning-fast collision lookup
                        this.blocks.set(`${x},${y},${z}`, {
                            mesh: block,
                            type: type,
                            x: x,
                            y: y,
                            z: z
                        });
                    }
                }
            }
        }

        console.log(`✅ Terrain generated with ${this.blocks.size} blocks!`);
    }

    // --- COLLISION HELPER 1: Get Highest Solid Block at (X, Z) ---
    getTerrainHeight(x, z) {
        const gridX = Math.round(x);
        const gridZ = Math.round(z);

        // Search downward from maximum world height to find topmost block
        for (let y = 35; y >= -10; y--) {
            if (this.blocks.has(`${gridX},${y},${gridZ}`)) {
                return y;
            }
        }
        return -100; // Void floor fallback if player steps off island
    }

    // --- COLLISION HELPER 2: Check if Block Exists at (X, Y, Z) ---
    isBlockAt(x, y, z) {
        const gridX = Math.round(x);
        const gridY = Math.round(y);
        const gridZ = Math.round(z);
        return this.blocks.has(`${gridX},${gridY},${gridZ}`);
    }

    // --- BLOCK MANIPULATION HELPERS ---
    getBlock(x, y, z) {
        return this.blocks.get(`${Math.round(x)},${Math.round(y)},${Math.round(z)}`);
    }

    removeBlock(x, y, z) {
        const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
        const block = this.blocks.get(key);
        if (block) {
            this.scene.remove(block.mesh);
            this.blocks.delete(key);
        }
    }
}
