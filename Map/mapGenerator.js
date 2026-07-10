import * as THREE from 'three';

export function generateMap(scene) {
    // Standard size for a block
    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    // Simple green material for grass blocks
    const grassMaterial = new THREE.MeshLambertMaterial({ color: 0x557a2b });

    const mapSize = 10;

    // Build a basic grid of blocks
    for (let x = 0; x < mapSize; x++) {
        for (let z = 0; z < mapSize; z++) {
            const block = new THREE.Mesh(blockGeometry, grassMaterial);
            
            // Position blocks right next to each other on a flat grid
            block.position.set(x, 0, z);
            
            scene.add(block);
        }
    }
    console.log("Map generation complete!");
}
