import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera, worldBlocks = []) {
        this.scene = scene;
        this.camera = camera;
        // Supports both Array [] and Map / Object {} voxel structures
        this.worldBlocks = worldBlocks;

        // Player physical dimensions (width: 0.6m, height: 1.8m)
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

        // Bounding box for player
        this.boundingBox = new THREE.Box3();

        this.setupControls();
    }

    loadPlayerModel() {
        const loader = new GLTFLoader();
        const modelUrl = 'https://raw.githubusercontent.com/jergan-studio/JergBuilder/main/jergplr.glb';

        loader.load(modelUrl, (gltf) => {
            this.model = gltf.scene;
            this.model.scale.set(1, 1, 1);
            this.scene.add(this.model);
            this.model.visible = false; // Hide model in 1st person
        }, undefined, (error) => {
            console.warn("Could not load player model glb:", error);
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

    // Helper: checks if a voxel block exists at integer coordinate (x, y, z)
    isBlockAt(x, y, z) {
        const bx = Math.floor(x);
        const by = Math.floor(y);
        const bz = Math.floor(z);

        // 1. If worldBlocks is a Map or Object keyed like "x,y,z"
        if (this.worldBlocks instanceof Map) {
            return this.worldBlocks.has(`${bx},${by},${bz}`);
        } else if (typeof this.worldBlocks === 'object' && !Array.isArray(this.worldBlocks)) {
            return !!this.worldBlocks[`${bx},${by},${bz}`];
        }

        // 2. If worldBlocks is an Array of Mesh blocks
        if (Array.isArray(this.worldBlocks)) {
            for (let i = 0; i < this.worldBlocks.length; i++) {
                const b = this.worldBlocks[i];
                if (b && b.position) {
                    if (Math.floor(b.position.x) === bx &&
                        Math.floor(b.position.y) === by &&
                        Math.floor(b.position.z) === bz) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // Recalculate AABB player bounding box
    updateBoundingBox() {
        const halfW = this.width / 2;
        this.boundingBox.set(
            new THREE.Vector3(this.position.x - halfW, this.position.y, this.position.z - halfW),
            new THREE.Vector3(this.position.x + halfW, this.position.y + this.height, this.position.z + halfW)
        );
    }

    // Grid-based AABB Collision Resolution
    checkCollisions(axis) {
        this.updateBoundingBox();

        const minX = Math.floor(this.boundingBox.min.x);
        const maxX = Math.floor(this.boundingBox.max.x);
        const minY = Math.floor(this.boundingBox.min.y);
        const maxY = Math.floor(this.boundingBox.max.y);
        const minZ = Math.floor(this.boundingBox.min.z);
        const maxZ = Math.floor(this.boundingBox.max.z);

        const blockBox = new THREE.Box3();

        // Check only voxels immediately surrounding the player
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    if (this.isBlockAt(x, y, z)) {
                        blockBox.set(
                            new THREE.Vector3(x, y, z),
                            new THREE.Vector3(x + 1, y + 1, z + 1)
                        );

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
                                if (this.velocity.y < 0) { // Landing on top of block
                                    this.position.y = blockBox.max.y;
                                    this.velocity.y = 0;
                                    this.isGrounded = true;
                                } else if (this.velocity.y > 0) { // Hitting block ceiling
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
            }
        }
    }

    update(delta) {
        // --- 1. MOVEMENT INPUT ---
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

        // --- 2. JUMP & GRAVITY ---
        if (this.isGrounded && this.keys.jump) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
        }

        this.velocity.y -= this.gravity * delta;

        // --- 3. SEPARATE AXIS RESOLUTION ---
        // X Movement & Collision
        this.position.x += this.velocity.x * delta;
        this.checkCollisions('x');

        // Z Movement & Collision
        this.position.z += this.velocity.z * delta;
        this.checkCollisions('z');

        // Y Movement & Collision
        this.isGrounded = false;
        this.position.y += this.velocity.y * delta;
        this.checkCollisions('y');

        // Ground level fallback (prevents falling below y = 0 if map generation hasn't completed)
        if (this.position.y <= 0) {
            this.position.y = 0;
            this.velocity.y = 0;
            this.isGrounded = true;
        }

        // --- 4. CAMERA & MODEL UPDATES ---
        if (this.model) {
            this.model.position.copy(this.position);
            this.model.rotation.y = this.yaw;
        }

        this.camera.position.set(
            this.position.x,
            this.position.y + this.eyeHeight,
            this.position.z
        );
        this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    }
}
