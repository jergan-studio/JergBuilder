import * as THREE from 'three';

export class MapGenerator {
    constructor(scene, seed) {
        this.scene = scene;
        this.seed = seed || 'default_seed';
        this.blocks = new Map();
        this.islandRadius = 20;

        this.textureLoader = new THREE.TextureLoader();
        this.initMaterials();
    }

    initMaterials() {
        const grassTex = this.textureLoader.load('Assets/Grass.png');
        grassTex.magFilter = THREE.NearestFilter;
        grassTex.minFilter = THREE.NearestFilter;

        this.materials = {
            grass: new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.8 }),
            dirt: new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }),
            stone: new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.7 })
        };
    }

    generate() {
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);

        for (let x = -this.islandRadius; x <= this.islandRadius; x++) {
            for (let z = -this.islandRadius; z <= this.islandRadius; z++) {
                const dist = Math.sqrt(x * x + z * z);
                if (dist <= this.islandRadius) {
                    const height = Math.floor(10 + Math.sin(x * 0.2) * 2 + Math.cos(z * 0.2) * 2);

                    for (let y = height - 4; y <= height; y++) {
                        let mat = this.materials.stone;
                        if (y === height) mat = this.materials.grass;
                        else if (y > height - 3) mat = this.materials.dirt;

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
    }

    getTerrainHeight(x, z) {
        const gx = Math.round(x);
        const gz = Math.round(z);

        for (let y = 30; y >= -10; y--) {
            if (this.blocks.has(`${gx},${y},${gz}`)) {
                return y;
            }
        }
        return -100; // Void space offset if walking off island
    }
}
