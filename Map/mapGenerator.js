import * as THREE from 'three';

// Retain tracker references to wipe old generated chunk elements correctly
let currentWorldMesh = null;

/**
 * Builds high-performance instanced map voxel sets.
 * @param {THREE.Scene} scene - Active container rendering scene hook.
 * @param {string} worldType - Selected geometry configuration matrix identifier.
 */
export function generateMap(scene, worldType) {
    // 1. Memory Cleanup: Safely purge active instances to make room for new maps
    if (currentWorldMesh) {
        scene.remove(currentWorldMesh);
        if (currentWorldMesh.geometry) currentWorldMesh.geometry.dispose();
        if (currentWorldMesh.material) currentWorldMesh.material.dispose();
        currentWorldMesh = null;
    }

    const gridSizeX = 32;
    const gridSizeZ = 32;
    const blocksArray = [];

    // 2. Procedural Array Loops
    for (let x = 0; x < gridSizeX; x++) {
        for (let z = 0; z < gridSizeZ; z++) {
            let height = 1; // Base thickness coordinate mapping

            if (worldType === 'hills') {
                // Creates procedural natural rolling hill logic values smoothly
                height = Math.floor(
                    Math.sin(x * 0.2) * 3 + 
                    Math.cos(z * 0.2) * 3 + 4
                );
                if (height < 1) height = 1;
            }

            for (let y = 0; y < height; y++) {
                let colorHex = 0x557a2b; // Standard Grass Voxel Green

                if (worldType === 'hills') {
                    if (y === height - 1 && y > 4) {
                        colorHex = 0xffffff; // Snow capped mountaintops
                    } else if (y < height - 1 && y > 2) {
                        colorHex = 0x8b5a2b; // Internal subsurface layers dirt brown
                    } else if (y <= 2) {
                        colorHex = 0x708090; // Lowest layers deep bedrock gray
                    }
                } else {
                    if (y < height - 1) {
                        colorHex = 0x8b5a2b; // Under-surface dirt for Flat variant
                    }
                }

                blocksArray.push({
                    x: x - gridSizeX / 2, // Map center alignment operations
                    y: y,
                    z: z - gridSizeZ / 2,
                    color: new THREE.Color(colorHex)
                });
            }
        }
    }

    // 3. Allocating Instanced Draw Arrays (Draws all voxels inside a single GPU call)
    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    const blockMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

    const instancedMesh = new THREE.InstancedMesh(
        blockGeometry,
        blockMaterial,
        blocksArray.length
    );

    const tempObject = new THREE.Object3D();

    blocksArray.forEach((block, index) => {
        tempObject.position.set(block.x, block.y, block.z);
        tempObject.updateMatrix();
        
        instancedMesh.setMatrixAt(index, tempObject.matrix);
        instancedMesh.setColorAt(index, block.color);
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;

    scene.add(instancedMesh);
    currentWorldMesh = instancedMesh;
    
    console.log(`[Jergcraft] Generated "${worldType}" terrain layout with ${blocksArray.length} blocks.`);
}
