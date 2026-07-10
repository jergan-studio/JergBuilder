import * as THREE from 'three';

// Holds references to active block meshes so we can delete them when switching worlds
let builtBlocks = [];

export function generateMap(scene, worldType = 'flat') {
    // Clear out any old map blocks from the current scene to prevent memory stacking
    builtBlocks.forEach(block => scene.remove(block));
    builtBlocks = [];

    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    const mapSize = 16; // Defines grid size (16x16)

    for (let x = 0; x < mapSize; x++) {
        for (let z = 0; z < mapSize; z++) {
            
            let heightLimit = 1; 
            let baseColor = 0x557a2b; // Default Grass Green

            // Map layout differences calculation
            if (worldType === 'hills') {
                // Procedural sinus calculation to simulate rising and rolling peaks
                heightLimit = Math.floor(Math.sin(x * 0.4) * 2 + Math.cos(z * 0.4) * 2) + 3;
                baseColor = 0x7a552b; // Set lower layers to dirt brown
            }

            for (let y = 0; y < heightLimit; y++) {
                let currentMatColor = baseColor;
                
                // If it's a hilly map, turn only the highest layer green (like natural grass)
                if (worldType === 'hills' && y === heightLimit - 1) {
                    currentMatColor = 0x557a2b; 
                }

                const material = new THREE.MeshLambertMaterial({ color: currentMatColor });
                const blockMesh = new THREE.Mesh(blockGeometry, material);
                
                // Position voxels flush right alongside each other
                blockMesh.position.set(x, y, z);
                
                scene.add(blockMesh);
                builtBlocks.push(blockMesh); // Save tracking reference
            }
        }
    }
    console.log(`Successfully generated world blueprint: "${worldType}"`);
}
