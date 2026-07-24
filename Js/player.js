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

        // Player dimensions
        this.playerWidth = 0.5;
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
            () => {
                const fallbackGeo = new THREE.BoxGeometry(0.5, 1.8, 0.5);
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

    // --- COLLISION BOUNDING BOXES ---

    getPlayerBoundingBox(pos, skinY = 0) {
        const halfW = this.playerWidth / 2;
        return new THREE.Box3(
            new THREE.Vector3(pos.x - halfW, pos.y - this.playerHeight + skinY, pos.z - halfW),
            new THREE.Vector3(pos.x + halfW, pos.y - skinY, pos.z + halfW)
        );
    }

    getNearbyBlockBoxes() {
        const blockBoxes = [];
        const radius = 3;
        const playerPos = this.camera.position;

        this.scene.traverse((child) => {
            if (child.isMesh && child !== this.customMesh) {
                const p = child.position;
                if (Math.abs(p.x - playerPos.x) <= radius &&
                    Math.abs(p.y - playerPos.y) <= radius + 1 &&
                    Math.abs(p.z - playerPos.z) <= radius) {
                    
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

        // Calculate Movement Direction
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        forward.y = 0; right.y = 0;
        forward.normalize(); right.normalize();

        const inputZ = Number(this.keys.w) - Number(this.keys.s);
        const inputX = Number(this.keys.d) - Number(this.keys.a);

        const moveDelta = new THREE.Vector3();
        if (inputZ !== 0 || inputX !== 0) {
            const moveDir = new THREE.Vector3()
                .addScaledVector(forward, inputZ)
                .addScaledVector(right, inputX)
                .normalize();

            moveDelta.x = moveDir.x * this.speed * delta;
            moveDelta.z = moveDir.z * this.speed * delta;
        }
        moveDelta.y = this.velocity.y * delta;

        const nearbyBlocks = this.getNearbyBlockBoxes();

        // 1. RESOLVE Y-AXIS (VERTICAL LANDING)
        this.camera.position.y += moveDelta.y;
        let playerBox = this.getPlayerBoundingBox(this.camera.position, 0);

        this.isGrounded = false;
        for (const blockBox of nearbyBlocks) {
            if (playerBox.intersectsBox(blockBox)) {
                if (moveDelta.y < 0) { // Falling down onto floor
                    this.camera.position.y = blockBox.max.y + this.playerHeight;
                    this.velocity.y = 0;
                    this.isGrounded = true;
                } else if (moveDelta.y > 0) { // Hitting ceiling
                    this.camera.position.y = blockBox.min.y;
                    this.velocity.y = 0;
                }
                playerBox = this.getPlayerBoundingBox(this.camera.position, 0);
            }
        }

        // 2. RESOLVE X-AXIS (HORIZONTAL WALKING)
        // Use a tiny 0.05 Y-skin offset so floor blocks don't prevent horizontal walking!
        if (moveDelta.x !== 0) {
            this.camera.position.x += moveDelta.x;
            playerBox = this.getPlayerBoundingBox(this.camera.position, 0.05);

            for (const blockBox of nearbyBlocks) {
                if (playerBox.intersectsBox(blockBox)) {
                    if (moveDelta.x > 0) {
                        this.camera.position.x = blockBox.min.x - (this.playerWidth / 2);
                    } else if (moveDelta.x < 0) {
                        this.camera.position.x = blockBox.max.x + (this.playerWidth / 2);
                    }
                    playerBox = this.getPlayerBoundingBox(this.camera.position, 0.05);
                }
            }
        }

        // 3. RESOLVE Z-AXIS (HORIZONTAL WALKING)
        if (moveDelta.z !== 0) {
            this.camera.position.z += moveDelta.z;
            playerBox = this.getPlayerBoundingBox(this.camera.position, 0.05);

            for (const blockBox of nearbyBlocks) {
                if (playerBox.intersectsBox(blockBox)) {
                    if (moveDelta.z > 0) {
                        this.camera.position.z = blockBox.min.z - (this.playerWidth / 2);
                    } else if (moveDelta.z < 0) {
                        this.camera.position.z = blockBox.max.z + (this.playerWidth / 2);
                    }
                    playerBox = this.getPlayerBoundingBox(this.camera.position, 0.05);
                }
            }
        }

        // Keep player body group synced to camera position
        this.playerGroup.position.copy(this.camera.position);
    }
}
