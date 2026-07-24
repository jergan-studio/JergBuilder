import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        this.pitchEuler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.speed = 5.0;
        this.jumpForce = 8.5;
        this.gravity = 25.0;
        this.isGrounded = false;

        // Player collision bounding dimensions
        this.playerWidth = 0.6;
        this.playerHeight = 1.8;

        this.playerGroup = new THREE.Group();
        this.scene.add(this.playerGroup);

        // Position camera inside player head bounds
        this.camera.position.set(0, 5, 0);
        this.camera.rotation.set(0, 0, 0);
        this.pitchEuler.setFromQuaternion(this.camera.quaternion);
        
        this.playerGroup.position.copy(this.camera.position);

        this.keys = { w: false, a: false, s: false, d: false };
        this.setupKeyboardListeners();
        this.setupMouseLook();
        this.loadCustomGLBModel();
    }

    loadCustomGLBModel() {
        const loader = new GLTFLoader();
        loader.load('https://raw.githubusercontent.com/jergan-studio/JergBuilder/main/Assets/jergplr.glb', 
            (gltf) => {
                this.customMesh = gltf.scene;
                this.customMesh.scale.set(1, 1, 1);
                this.customMesh.position.set(0, -1.8, 0);
                this.playerGroup.add(this.customMesh);
            },
            undefined,
            (error) => {
                const fallbackGeo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
                const fallbackMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
                this.customMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
                this.customMesh.position.y = -0.9;
                this.playerGroup.add(this.customMesh);
            }
        );
    }

    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'w') this.keys.w = true;
            if (e.key.toLowerCase() === 'a') this.keys.a = true;
            if (e.key.toLowerCase() === 's') this.keys.s = true;
            if (e.key.toLowerCase() === 'd') this.keys.d = true;
            if (e.key === ' ') this.jump();
        });

        window.addEventListener('keyup', (e) => {
            if (e.key.toLowerCase() === 'w') this.keys.w = false;
            if (e.key.toLowerCase() === 'a') this.keys.a = false;
            if (e.key.toLowerCase() === 's') this.keys.s = false;
            if (e.key.toLowerCase() === 'd') this.keys.d = false;
        });
    }

    setupMouseLook() {
        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.getElementById('gameCanvas')) {
                this.pitchEuler.y -= e.movementX * 0.0025;
                this.pitchEuler.x -= e.movementY * 0.0025;
                this.pitchEuler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitchEuler.x));
                
                this.camera.quaternion.setFromEuler(this.pitchEuler);
                
                if (this.customMesh) {
                    this.customMesh.rotation.y = this.pitchEuler.y;
                }
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement === document.getElementById('gameCanvas')) {
                if (e.button === 0 || e.button === 2) {
                    this.placeBlock();
                }
            }
        });
    }

    jump() {
        if (this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
        }
    }

    placeBlock() {
        const raycaster = new THREE.Raycaster();
        const centerScreen = new THREE.Vector2(0, 0); 
        raycaster.setFromCamera(centerScreen, this.camera);

        const intersects = raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const hit = intersects[0];
            if (hit.distance < 6) {
                const newBlockPos = new THREE.Vector3()
                    .copy(hit.point)
                    .add(hit.face.normal.clone().multiplyScalar(0.5))
                    .floor()
                    .addScalar(0.5); 

                const placedGeo = new THREE.BoxGeometry(1, 1, 1);
                const placedMat = new THREE.MeshLambertMaterial({ color: 0xd7ccc8 });
                const newMesh = new THREE.Mesh(placedGeo, placedMat);
                
                newMesh.position.copy(newBlockPos);
                this.scene.add(newMesh);
            }
        }
    }

    // --- AABB COLLISION HELPER METHODS ---

    getPlayerBoundingBox(pos) {
        const halfW = this.playerWidth / 2;
        return new THREE.Box3(
            new THREE.Vector3(pos.x - halfW, pos.y - this.playerHeight, pos.z - halfW),
            new THREE.Vector3(pos.x + halfW, pos.y, pos.z + halfW)
        );
    }

    getNearbyBlockBoxes() {
        const blockBoxes = [];
        const radius = 2; // Distance to check surrounding blocks
        const playerPos = this.camera.position;

        const minX = Math.floor(playerPos.x - radius);
        const maxX = Math.ceil(playerPos.x + radius);
        const minY = Math.floor(playerPos.y - this.playerHeight - radius);
        const maxY = Math.ceil(playerPos.y + radius);
        const minZ = Math.floor(playerPos.z - radius);
        const maxZ = Math.ceil(playerPos.z + radius);

        this.scene.traverse((child) => {
            if (child.isMesh && child !== this.customMesh) {
                const p = child.position;
                if (p.x >= minX && p.x <= maxX &&
                    p.y >= minY && p.y <= maxY &&
                    p.z >= minZ && p.z <= maxZ) {
                    
                    blockBoxes.push(new THREE.Box3().setFromObject(child));
                }
            }
        });

        return blockBoxes;
    }

    update(delta) {
        if (!delta) delta = 0.016;

        // Apply Gravity
        this.velocity.y -= this.gravity * delta;

        // Calculate Movement Vectors
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        forward.y = 0; right.y = 0;
        forward.normalize(); right.normalize();

        this.direction.z = Number(this.keys.w) - Number(this.keys.s);
        this.direction.x = Number(this.keys.d) - Number(this.keys.a);
        this.direction.normalize();

        const moveDelta = new THREE.Vector3();
        if (this.keys.w || this.keys.s) {
            moveDelta.addScaledVector(forward, this.direction.z * this.speed * delta);
        }
        if (this.keys.a || this.keys.d) {
            moveDelta.addScaledVector(right, this.direction.x * this.speed * delta);
        }
        moveDelta.y = this.velocity.y * delta;

        // Get static blocks near player
        const nearbyBlocks = this.getNearbyBlockBoxes();

        // --- STEP-BY-STEP AXIS COLLISION RESOLUTION ---

        // 1. Resolve Y-Axis (Vertical Collision & Floor Landing)
        this.camera.position.y += moveDelta.y;
        let playerBox = this.getPlayerBoundingBox(this.camera.position);

        this.isGrounded = false;
        for (const blockBox of nearbyBlocks) {
            if (playerBox.intersectsBox(blockBox)) {
                if (moveDelta.y < 0) { // Falling down
                    this.camera.position.y = blockBox.max.y + this.playerHeight;
                    this.velocity.y = 0;
                    this.isGrounded = true;
                } else if (moveDelta.y > 0) { // Hitting ceiling
                    this.camera.position.y = blockBox.min.y;
                    this.velocity.y = 0;
                }
                playerBox = this.getPlayerBoundingBox(this.camera.position);
            }
        }

        // 2. Resolve X-Axis (Horizontal Collision)
        this.camera.position.x += moveDelta.x;
        playerBox = this.getPlayerBoundingBox(this.camera.position);

        for (const blockBox of nearbyBlocks) {
            if (playerBox.intersectsBox(blockBox)) {
                if (moveDelta.x > 0) {
                    this.camera.position.x = blockBox.min.x - (this.playerWidth / 2);
                } else if (moveDelta.x < 0) {
                    this.camera.position.x = blockBox.max.x + (this.playerWidth / 2);
                }
                playerBox = this.getPlayerBoundingBox(this.camera.position);
            }
        }

        // 3. Resolve Z-Axis (Horizontal Collision)
        this.camera.position.z += moveDelta.z;
        playerBox = this.getPlayerBoundingBox(this.camera.position);

        for (const blockBox of nearbyBlocks) {
            if (playerBox.intersectsBox(blockBox)) {
                if (moveDelta.z > 0) {
                    this.camera.position.z = blockBox.min.z - (this.playerWidth / 2);
                } else if (moveDelta.z < 0) {
                    this.camera.position.z = blockBox.max.z + (this.playerWidth / 2);
                }
                playerBox = this.getPlayerBoundingBox(this.camera.position);
            }
        }

        // Keep player body group locked to camera position
        this.playerGroup.position.copy(this.camera.position);
    }
}
