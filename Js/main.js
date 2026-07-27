import * as THREE from 'three';
import { Player } from './player.js';

// --- 1. SCENE, CAMERA, & RENDERER SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue background
scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- 2. LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(50, 80, 30);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 150;
const d = 40;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
scene.add(dirLight);

// --- 3. WORLD GENERATION (BLOCK MAP) ---
// Container array to store active block meshes for collision and raycasting
const worldBlocks = [];
const blockMap = new Map(); // Key: "x,y,z" -> Mesh

// Materials & Geometries
const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const grassMaterial = new THREE.MeshLambertMaterial({ color: 0x557a2b });
const dirtMaterial = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
const stoneMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });

// Helper to add a block to the scene and world list
function createBlock(x, y, z, material = grassMaterial) {
    const key = `${x},${y},${z}`;
    if (blockMap.has(key)) return;

    const block = new THREE.Mesh(blockGeometry, material);
    block.position.set(x + 0.5, y + 0.5, z + 0.5); // Center block on integer coordinates
    block.castShadow = true;
    block.receiveShadow = true;

    scene.add(block);
    worldBlocks.push(block);
    blockMap.set(key, block);
}

// Helper to remove a block
function removeBlock(x, y, z) {
    const key = `${x},${y},${z}`;
    const block = blockMap.get(key);
    if (block) {
        scene.remove(block);
        
        // Remove from worldBlocks array
        const index = worldBlocks.indexOf(block);
        if (index !== -1) worldBlocks.splice(index, 1);

        block.geometry.dispose();
        blockMap.delete(key);
    }
}

// Build initial terrain ground platform (32x32 area)
function generateTerrain() {
    const size = 16;
    for (let x = -size; x < size; x++) {
        for (let z = -size; z < size; z++) {
            // Layer 0: Bedrock/Stone
            createBlock(x, 0, z, stoneMaterial);
            // Layer 1: Dirt
            createBlock(x, 1, z, dirtMaterial);
            // Layer 2: Grass surface
            createBlock(x, 2, z, grassMaterial);
        }
    }
}
generateTerrain();

// --- 4. PLAYER INSTANTIATION ---
const player = new Player(scene, camera, worldBlocks);

// --- 5. POINTER LOCK CONTROLS SETUP ---
const instructionsUI = document.createElement('div');
instructionsUI.style.position = 'absolute';
instructionsUI.style.top = '50%';
instructionsUI.style.left = '50%';
instructionsUI.style.transform = 'translate(-50%, -50%)';
instructionsUI.style.color = '#ffffff';
instructionsUI.style.fontFamily = 'sans-serif';
instructionsUI.style.fontSize = '20px';
instructionsUI.style.textAlign = 'center';
instructionsUI.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
instructionsUI.style.padding = '20px';
instructionsUI.style.borderRadius = '10px';
instructionsUI.style.cursor = 'pointer';
instructionsUI.innerHTML = 'Click to Play<br><span style="font-size: 14px;">WASD to Move | Space to Jump | Left Click: Break | Right Click: Place | [: Toggle 3rd Person</span>';
document.body.appendChild(instructionsUI);

instructionsUI.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === renderer.domElement) {
        instructionsUI.style.display = 'none';
    } else {
        instructionsUI.style.display = 'block';
    }
});

// Prevent right-click context menu while playing
window.addEventListener('contextmenu', (e) => e.preventDefault());

// --- 6. BLOCK PLACEMENT & DESTRUCTION CONTROLS ---
window.addEventListener('mousedown', (e) => {
    if (document.pointerLockElement !== renderer.domElement) return;

    const lookTarget = player.getLookAtBlock();
    if (!lookTarget) return;

    if (e.button === 0) {
        // Left Click -> Destroy Block
        removeBlock(
            lookTarget.targetBlock.x,
            lookTarget.targetBlock.y,
            lookTarget.targetBlock.z
        );
    } else if (e.button === 2) {
        // Right Click -> Place Block
        createBlock(
            lookTarget.placeBlock.x,
            lookTarget.placeBlock.y,
            lookTarget.placeBlock.z,
            grassMaterial
        );
    }
});

// --- 7. RESIZE LISTENER ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- 8. MAIN GAME LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1); // Cap delta time to avoid huge leaps
    player.update(delta);

    renderer.render(scene, camera);
}

animate();
