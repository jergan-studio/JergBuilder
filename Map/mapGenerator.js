import * as THREE from 'three';

export class MapGenerator {
    constructor(scene, seed) {
        this.scene = scene;
        this.seed = seed;
        this.blocks = new Map();
        this.islandRadius = 20;
    }

    generate() {
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);
        const grassMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
        const dirtMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x777777 });

        // InstancedMesh or Group generation
        for (let x = -this.islandRadius; x <= this.islandRadius; x++) {
            for (let z = -this.islandRadius; z <= this.islandRadius; z++) {
                const distFromCenter = Math.sqrt(x * x + z * z);
                
                if (distFromCenter <= this.islandRadius) {
                    // Height curve for island
                    const height = Math.floor(12 + Math.sin(x * 0.2) * 2 + Math.cos(z * 0.2) * 2);

                    for (let y = height - 4; y <= height; y++) {
                        let mat = stoneMat;
                        if (y === height) mat = grassMat;
                        else if (y > height - 3) mat = dirtMat;

                        const block = new THREE.Mesh(boxGeo, mat);
                        block.position.set(x, y, z);
                        block.receiveShadow = true;
                        block.castShadow = true;
                        
                        this.scene.add(block);
                        this.blocks.set(`${x},${y},${z}`, block);
                    }
                }
            }
        }
    }

    // Helper used by Player.js to detect grass collision
    getTerrainHeight(x, z) {
        const gridX = Math.round(x);
        const gridZ = Math.round(z);

        // Find highest block at x, z coordinates
        for (let y = 30; y >= 0; y--) {
            if (this.blocks.has(`${gridX},${y},${gridZ}`)) {
                return y;
            }
        }
        return 10; // Default terrain floor height
    }
}
