import * as THREE from 'three';

export class MapGenerator {
    constructor(scene, seed) {
        this.scene = scene;
        this.seed = seed || 'default_seed';
        
        // Key: "x,y,z" -> block mesh object
        this.blocks = new Map();
        this.islandRadius = 20;

        // Texture Loading
        this.textureLoader = new THREE.TextureLoader();
        this.materials = {};
        this.initMaterials();
    }

    initMaterials() {
        // Custom grass texture
        const grassTex = this.textureLoader.load('Assets/Grass.png');
        grassTex.magFilter = THREE.NearestFilter;
        grassTex.minFilter = THREE.NearestFilter;

        this.materials.grass = new THREE.MeshStandardMaterial({ 
            map: grassTex, 
            roughness: 0.8 
        });

        this.materials.dirt = new THREE.MeshStandardMaterial({ 
            color: 0x5c4033, 
            roughness: 0.9 
        });

        this.materials.stone = new THREE.MeshStandardMaterial({ 
            color: 0x666666, 
            roughness: 0.7 
        });
    }

    generate() {
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);

        for (let x = -this.islandRadius; x <= this.islandRadius; x++) {
            for (let z = -this.islandRadius; z <= this.islandRadius; z++) {
                const dist = Math.sqrt(x * x + z * z);

                if (dist <= this.islandRadius) {
                    // Curved island height contours
                    const height = Math.floor(10 + Math.sin(x * 0.2) * 2.5 + Math.cos(z * 0.2) * 2.5);

                    for (let y = height - 4; y <= height; y++) {
                        let mat = this.materials.stone;
                        if (y === height) {
                            mat = this.materials.grass;
                        } else if (y > height - 3) {
                            mat = this.materials.dirt;
                        }

                        const block = new THREE.Mesh(boxGeo, mat);
                        block.position.set(x, y, z);
                        block.castShadow = true;
                        block.receiveShadow = true;

                        this.scene.add(block);
                        this.blocks.set(`${x},${y},${z}`, block);
                    }
                }
            }
        }
        console.log(`✅ [v1.2] Map generated with ${this.blocks.size} blocks.`);
    }

    // Fast lookup for vertical terrain height at position (X, Z)
    getTerrainHeight(x, z) {
        const gx = Math.round(x);
        const gz = Math.round(z);

        for (let y = 35; y >= -10; y--) {
            if (this.blocks.has(`${gx},${y},${gz}`)) {
                return y;
            }
        }
        return -100; // Void floor fallback
    }
}
