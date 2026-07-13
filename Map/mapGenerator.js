import * as THREE from 'three';

// Global reference tracker to properly wipe old map blocks from memory when changing worlds
let currentWorldMesh = null;

/**
 * Generates and injects a 3D block environment into the active Three.js scene.
 * @param {THREE.Scene} scene - The main engine render scene.
 * @param {string} worldType - The chosen configuration layout ('flat' or 'hills').
 */
export function generateMap(scene, worldType) {
    // 1. Clear out any old existing world structures from memory to prevent overlapping overlays
    if (currentWorldMesh) {
        scene.remove(currentWorldMesh);
        if (currentWorldMesh.geometry) currentWorldMesh.geometry.dispose();
        if (currentWorldMesh.material) currentWorldMesh.material.dispose();
        currentWorldMesh = null;
    }

    // 2. Define our World Size Bound Constraints
    const gridSizeX = 32; // Width
    const gridSizeZ = 32; // Length
    const blocksArray = [];

    // 3. Procedural Map Coordinate Height Mapping Logic Loop
    for (let x = 0; x < gridSizeX; x++) {
        for (let z = 0; z < gridSizeZ; z++) {
            let height = 1; // Default Flat level baseline thickness

            if (worldType === 'hills') {
                // Generate natural high/low wave patterns mathematically using trigonometry waves
                height = Math.floor(
                    Math.sin(x * 0.2) * 3 + 
                    Math.cos(z * 0.2) * 3 + 4
                );
                // Ensure terrain heights never drop past bedrock bottom limit floor boundary
                if (height < 1) height = 1; 
            }

            // Stack voxel layers from bedrock up to calculated surface height
            for (let y = 0; y < height; y++) {
                let colorHex = 0x557a2b; // Default Organic Surface Grass Green

                if (worldType === 'hills') {
                    if (y === height - 1 && y > 4) {
                        colorHex = 0xffffff; // Snow peaks on tall hills
                    } else if (y < height - 1 && y > 2) {
                        colorHex = 0x8b5a2b; // Under-surface dirt layer brown
                    } else if (y <= 2) {
                        colorHex = 0x708090; // Deep core stone bedrock gray
                    }
                } else {
                    // Flat World Variant Sub-layer design rules
                    if (y < height - 1) {
                        colorHex = 0x8b5a2b; // Lower bedrock block dirt elements
                    }
                }

                blocksArray.push({
                    x: x - gridSizeX / 2, // Centers map around (0,0,0) origin coordinate point
                    y: y,
                    z: z - gridSizeZ / 2,
                    color: new THREE.Color(colorHex)
                });
            }
        }
    }

    // 4. Instanced Mesh Allocation (Renders thousands of blocks inside a single high-performance draw call)
    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    // Uses standard Lambert material hooks so light illuminates the voxel edges beautifully
    const blockMaterial = new THREE.MeshLambertMaterial({
        vertexColors: true
    });

    const instancedMesh = new THREE.InstancedMesh(
        blockGeometry,
        blockMaterial,
        blocksArray.length
    );

    // Dummy coordinate spatial helper node to populate translation matrices
    const tempObject = new THREE.Object3D();

    // 5. Populate Instance Buffer Storage Matrix
    blocksArray.forEach((block, index) => {
        tempObject.position.set(block.x, block.y, block.z);
        tempObject.updateMatrix();
        
        // Push positional coordinate variables onto GPU memory stack array
        instancedMesh.setMatrixAt(index, tempObject.matrix);
        // Paint the specific instance block color
        instancedMesh.setColorAt(index, block.color);
    });

    // Notify the WebGL renderer pipeline that data arrays have updated
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
    }

    // Enable basic physics collision tracing indicators
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;

    // 6. Bind to active context scene viewport window
    scene.add(instancedMesh);
    currentWorldMesh = instancedMesh;
    
    console.log(`Successfully generated "${worldType}" world with ${blocksArray.length} voxel instances.`);
}
