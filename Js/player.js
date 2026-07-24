import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera, worldBlocks = []) {
        this.scene = scene;
        this.camera = camera;
        this.worldBlocks = worldBlocks; // Array/Map of voxel mesh blocks in scene

        // Player physical dimensions (Minecraft-style AABB)
        this.width = 0.6;
        this.height = 1.8;
        this.eyeHeight = 1.6;

        this.position = new THREE.Vector3(0, 10, 0);
        this.velocity = new THREE.Vector3();

        this.moveSpeed = 10;
        this.jumpForce = 11;
        this.gravity = 28;
        this.isGrounded = false;

        this.keys = { forward: false, backward: false, left: false, right: false, jump: false };
        this.pitch = 0;
        this.yaw = 0;

        // Player Model setup
        this.model = null;
        this.loadPlayerModel();

        // Bounding box for collisions
        this.boundingBox = new THREE.Box3();
        this.updateBoundingBox();

        this.setupControls();
    }

    loadPlayerModel() {
        const loader = new GLTFLoader();
        // GitHub raw URL for the glb file
        const modelUrl = 'https://raw.githubusercontent.com/jergan-studio/JergBuilder/main/jergplr.glb';

        loader.load(modelUrl, (gltf) => {
            this.model = gltf.scene;
            this.model.scale.set(1, 1, 1);
            this.scene.add(this.model);
            
            // Hide model in 1st person by default so camera isn't inside mesh
            this.model.visible = false; 
        }, undefined, (error) => {
            console.warn("Could not load player model glb, falling back to collision box:", error);
        });
    }

    setupControls() {
        window.addEventListener('keydown', (e) => this.updateKey(e.code, true));
        window.addEventListener('keyup', (e) => this.updateKey(e.code, false));

        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.yaw -= e.movementX * 0.002;
                this.pitch -= e.movementY * 0.002;
                this.pitch = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, this.pitch));
            }
        });
    }

    updateKey(code, isPressed) {
        switch (code) {
            case 'KeyW': case 'ArrowUp': this.keys.forward = isPressed; break;
            case 'KeyS': case 'ArrowDown': this.keys.backward = isPressed; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = isPressed; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = isPressed; break;
            case 'Space': this.keys.jump = isPressed; break;
        }
    }

    // Recalculates the player's bounding box based on current position
    updateBoundingBox() {
        const halfW = this.width / 2;
        this.boundingBox.set(
            new THREE.Vector3(this.position.x - halfW, this.position.y, this.position.z - halfW),
            new THREE.Vector3(this.position.x + halfW, this.position.y + this.height, this.position.z + halfW)
        );
    }

    // Checks collision against world objects/blocks
    checkCollisions(axis) {
        this.updateBoundingBox();

        // Target box for block intersection checks
        const blockBox = new THREE.Box3();

        for (let i = 0; i < this.worldBlocks.length; i++) {
            const block = this.worldBlocks[i];
            if (!block || !block.position) continue;

            // Assuming 1x1x1 unit blocks centered at block.position
            blockBox.setFromCenterAndSize(block.position, new THREE.Vector3(1, 1, 1));

            if (this.boundingBox.intersectsBox(blockBox)) {
                if (axis === 'x') {
                    if (this.velocity.x > 0) {
                        this.position.x = blockBox.min.x - this.width / 2;
                    } else if (this.velocity.x < 0) {
                        this.position.x = blockBox.max.x + this.width / 2;
                    }
                    this.velocity.x = 0;
                }

                if (axis === 'y') {
                    if (this.velocity.y < 0) { // Falling down onto block
                        this.position.y = blockBox.max.y;
                        this.velocity.y = 0;
                        this.isGrounded = true;
                    } else if (this.velocity.y > 0) { // Hitting head on block above
                        this.position.y = blockBox.min.y - this.height;
                        this.velocity.y = 0;
                    }
                }

                if (axis === 'z') {
                    if (this.velocity.z > 0) {
                        this.position.z = blockBox.min.z - this.width / 2;
                    } else if (this.velocity.z < 0) {
                        this.position.z = blockBox.max.z + this.width / 2;
                    }
                    this.velocity.z = 0;
                }

                this.updateBoundingBox();
            }
        }
    }

    update(delta) {
        // --- 1. HORIZONTAL INPUT ---
        const moveDir = new THREE.Vector3();
        if (this.keys.forward) moveDir.z -= 1;
        if (this.keys.backward) moveDir.z += 1;
        if (this.keys.left) moveDir.x -= 1;
        if (this.keys.right) moveDir.x += 1;

        moveDir.normalize();

        const euler = new THREE.Euler(0, this.yaw, 0, 'YXZ');
        moveDir.applyEuler(euler);

        this.velocity.x = moveDir.x * this.moveSpeed;
        this.velocity.z = moveDir.z * this.moveSpeed;

        // --- 2. JUMPING & GRAVITY ---
        if (this.isGrounded) {
            if (this.keys.jump) {
                this.velocity.y = this.jumpForce;
                this.isGrounded = false;
            }
        }

        this.velocity.y -= this.gravity * delta;

        // --- 3. AXIS-SEPARATED MOVEMENT & COLLISION ---
        // X Axis
        this.position.x += this.velocity.x * delta;
        this.checkCollisions('x');

        // Z Axis
        this.position.z += this.velocity.z * delta;
        this.checkCollisions('z');

        // Y Axis (Vertical)
        this.isGrounded = false; // Reset grounded check before Y movement
        this.position.y += this.velocity.y * delta;
        this.checkCollisions('y');

        // Safety void floor check (e.g. falling off world)
        if (this.position.y < -30) {
            this.position.set(0, 15, 0);
            this.velocity.set(0, 0, 0);
        }

        // --- 4. MODEL & CAMERA SYNC ---
        if (this.model) {
            this.model.position.copy(this.position);
            this.model.rotation.y = this.yaw;
        }

        // First-person camera positioning
        this.camera.position.set(
            this.position.x,
            this.position.y + this.eyeHeight,
            this.position.z
        );
        this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    }
}
