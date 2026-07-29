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
        const grassMat = new THREE.MeshStandardMaterial({ color: 0x55aa55 });
        const dirtMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });

        for (let x = -this.islandRadius; x <= this.islandRadius; x++) {
            for (let z = -this.islandRadius; z <= this.islandRadius; z++) {
                const dist = Math.sqrt(x * x + z * z);
                if (dist <= this.islandRadius) {
                    const block = new THREE.Mesh(boxGeo, grassMat);
                    block.position.set(x, 0, z);
                    this.scene.add(block);
                    this.blocks.set(`${x},0,${z}`, block);
                }
            }
        }
    }

    getTerrainHeight(x, z) {
        return 0;
    }
}
