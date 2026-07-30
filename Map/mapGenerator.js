import * as THREE from 'three';

export class MapGenerator {
    constructor(scene, seed) {
        this.scene = scene;
        this.seed = seed || 'default_seed';
        
        // Map lookup storing every active block position: "x,y,z" -> mesh
        this.blocks = new Map();
        this.islandRadius = 24;

        this.textureLoader = new THREE.TextureLoader();
        this.materials = {};
        this.initMaterials();
    }

    initMaterials() {
        // Main Grass Texture
        const grassTex = this.textureLoader.load('Assets/Grass.png');
        grassTex.magFilter = THREE.NearestFilter;
        grassTex.minFilter = THREE.NearestFilter;

        // Custom Water Texture
        const waterTex = this.textureLoader.load('Assets/image_2026-07-30_160548757.png');
        waterTex.magFilter = THREE.NearestFilter;
        waterTex.minFilter = THREE.NearestFilter;

        this.materials.grass = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.8 });
        this.materials.dirt = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
        this.materials.stone = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.7 });
        this.materials.water = new THREE.MeshStandardMaterial({ 
            map: waterTex, 
            roughness: 0.1, 
            transparent: true, 
            opacity: 0.85 
        });

        // Color Block Slots 4-8
        this.materials.red = new THREE.MeshStandardMaterial({ color: 0xff3333 });
        this.materials.pink = new THREE.MeshStandardMaterial({ color: 0xff66cc });
        this.materials.darkgreen = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
        this.materials.lightgreen = new THREE.MeshStandardMaterial({ color: 0x32cd32 });
        this.materials.yellow = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    }

    generate() {
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);

        // Generate full circular floating island map
        for (let x = -this.islandRadius; x <= this.islandRadius; x++) {
            for (let z = -this.islandRadius; z <= this.islandRadius; z++) {
                const dist = Math.sqrt(x * x + z * z);

                if (dist <= this.islandRadius) {
                    // Curved natural terrain contours
                    const height = Math.floor(10 + Math.sin(x * 0.15) * 3 + Math.cos(z * 0.15) * 3);

                    for (let y = height - 5; y <= height; y++) {
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
        console.log(`✅ Full Map generated: ${this.blocks.size} blocks loaded into spatial index.`);
    }

    // Direct vertical ground height query
    getTerrainHeight(x, z) {
        const gx = Math.round(x);
        const gz = Math.round(z);

        for (let y = 35; y >= -20; y--) {
            if (this.blocks.has(`${gx},${y},${gz}`)) {
                return y;
            }
        }
        return -100; // Void space
    }
}
