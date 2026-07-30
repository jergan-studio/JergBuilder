import * as THREE from 'three';

export class FastMapGenerator {
    constructor(scene, maxBlocks = 100000) {
        this.scene = scene;
        this.geometry = new THREE.BoxGeometry(1, 1, 1);
        
        // Material map storing InstancedMesh for each block type
        this.instancedMeshes = {};
        this.maxBlocks = maxBlocks;
    }

    createInstancedGroup(materialKey, material) {
        const instancedMesh = new THREE.InstancedMesh(
            this.geometry,
            material,
            this.maxBlocks
        );
        instancedMesh.count = 0; // Number of active instances
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;
        
        this.scene.add(instancedMesh);
        this.instancedMeshes[materialKey] = instancedMesh;
    }

    addBlockInstance(materialKey, x, y, z) {
        const mesh = this.instancedMeshes[materialKey];
        if (!mesh) return;

        const dummy = new THREE.Object3D();
        dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
        dummy.updateMatrix();

        mesh.setMatrixAt(mesh.count, dummy.matrix);
        mesh.count++;
        mesh.instanceMatrix.needsUpdate = true;
    }
}
