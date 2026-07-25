import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera, worldBlocks = []) {
        this.scene = scene;
        this.camera = camera;
        this.worldBlocks = worldBlocks;

        // --- 1. PROPORTIONAL SIZING & SCALE ---
        this.scale = 0.5; 
        this.width = 0.6 * this.scale;     // 0.3 units wide
        this.height = 1.8 * this.scale;    // 0.9 units tall
        this.eyeHeight = 1.6 * this.scale; // 0.8 units eye level

        // Spawn position elevated to avoid spawning inside/below terrain
        this.position = new THREE.Vector3(0, 30, 0);
        this.velocity = new THREE.Vector3();

        // Physics parameters
        this.moveSpeed = 8;
        this.jumpForce = 10;
        this.gravity = 28;
        this.isGrounded = false;

        // Camera Perspective Mode (false = 1st Person, true = 3rd Person)
        this.isThirdPerson = false;
        this.thirdPersonDistance = 4;

        this.keys = { forward: false, backward: false, left: false, right: false, jump: false };
        this.pitch = 0;
        this.yaw = 0;

        // Raycasting setup
        this.raycaster = new THREE.Raycaster();
        this.reachDistance = 8; 

        // Player GLTF Model
        this.model = null;
        this.loadPlayerModel();

        this.boundingBox = new THREE.Box3();
        this.setupControls();
    }

    loadPlayerModel() {
        const loader = new GLTFLoader();
        const modelUrl = 'https://raw.githubusercontent.com/jergan-studio/JergBuilder/main/jergplr.glb';

        loader.load(modelUrl, (gltf) => {
            this.model = gltf.scene;
            this.model.scale.set(this.scale, this.scale, this.scale);
            this.scene.add(this.model);
            this.model.visible = this.isThirdPerson;
        }, undefined, (error) => {
            console.warn("Could not load player model glb:", error);
        });
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.updateKey(e.code, true);

            // Toggle 3rd Person Camera View with the '[' key
            if (e.code === 'BracketLeft' || e.key === '[') {
                e.preventDefault();
                this.isThirdPerson = !this.isThirdPerson;
                if (this.model) {
                    this.model.visible = this.isThirdPerson;
                }
            }
        });

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

    // --- FLEXIBLE BLOCK LOOKUP ---
    isBlockAt(x, y, z) {
        if (!this.worldBlocks) return false;

        const bx = Math.floor(x);
        const by = Math.floor(y);
        const bz = Math.floor(z);

        const key1 = `${bx},${by},${bz}`;
        const key2 = `${bx}_${by}_${bz}`;

        // Map lookup
        if (this.worldBlocks instanceof Map) {
            return this.worldBlocks.has(key1) || this.worldBlocks.has(key2);
        } 
        // Object lookup
        else if (typeof this.worldBlocks === 'object' && !Array.isArray(this.worldBlocks)) {
            return !!(this.worldBlocks[key1] || this.worldBlocks[key2]);
        }

        // Array lookup
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

    // --- RAYCAST FOR BLOCK SELECTION / PLACEMENT ---
    getLookAtBlock(blockObjectsList = []) {
        const headPosition = new THREE.Vector3(
            this.position.x,
            this.position.y + this.eyeHeight,
            this.position.z
        );

        const lookDir = new THREE.Vector3(0, 0, -1);
        lookDir.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));

        this.raycaster.set(headPosition, lookDir);
        this.raycaster.far = this.reachDistance;

        const intersects = this.raycaster.intersectObjects(blockObjectsList, true);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const point = hit.point;
            const normal = hit.face.normal;

            const targetBlock = new THREE.Vector3(
                Math.floor(point.x - normal.x * 0.1),
                Math.floor(point.y - normal.y * 0.1),
                Math.floor(point.z - normal.z * 0.1)
            );

            const placeBlock = new THREE.Vector3(
                Math.floor(point.x + normal.x * 0.1),
                Math.floor(point.y + normal.y * 0.1),
                Math.floor(point.z + normal.z * 0.1)
            );

            return { targetBlock, placeBlock, hit };
        }

        return null;
    }

    updateBoundingBox() {
        const halfW = this.width / 2;
        this.boundingBox.set(
            new THREE.Vector3(this.position.x - halfW, this.position.y, this.position.z - halfW),
            new THREE.Vector3(this.position.x + halfW, this.position.y + this.height, this.position.z + halfW)
        );
    }

    checkCollisions(axis) {
        this.updateBoundingBox();

        const minX = Math.floor(this.boundingBox.min.x - 0.1);
        const maxX = Math.floor(this.boundingBox.max.x + 0.1);
        const minY = Math.floor(this.boundingBox.min.y - 0.1);
        const maxY = Math.floor(this.boundingBox.max.y + 0.1);
        const minZ = Math.floor(this.boundingBox.min.z - 0.1);
        const maxZ = Math.floor(this.boundingBox.max.z + 0.1);

        const blockBox = new THREE.Box3();

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    if (this.isBlockAt(x, y, z)) {
                        blockBox.set(
                            new THREE.Vector3(x, y, z),
                            new THREE.Vector3(x + 1, y + 1, z + 1)
                        );

                        if (this.boundingBox.intersectsBox(blockBox)) {
                            const margin = 0.001;

                            if (axis === 'x') {
                                if (this.velocity.x > 0) {
                                    this.position.x = blockBox.min.x - this.width / 2 - margin;
                                } else if (this.velocity.x < 0) {
                                    this.position.x = blockBox.max.x + this.width / 2 + margin;
                                }
                                this.velocity.x = 0;
                            }

                            if (axis === 'y') {
                                if (this.velocity.y < 0) {
                                    this.position.y = blockBox.max.y;
                                    this.velocity.y = 0;
                                    this.isGrounded = true;
                                } else if (this.velocity.y > 0) {
                                    this.position.y = blockBox.min.y - this.height - margin;
                                    this.velocity.y = 0;
                                }
                            }

                            if (axis === 'z') {
                                if (this.velocity.z > 0) {
                                    this.position.z = blockBox.min.z - this.width / 2 - margin;
                                } else if (this.velocity.z < 0) {
                                    this.position.z = blockBox.max.z + this.width / 2 + margin;
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

        // --- 3. AXIS COLLISION RESOLUTION ---
        this.position.x += this.velocity.x * delta;
        this.checkCollisions('x');

        this.position.z += this.velocity.z * delta;
        this.checkCollisions('z');

        this.isGrounded = false;
        this.position.y += this.velocity.y * delta;
        this.checkCollisions('y');

        // Floor safety boundary
        if (this.position.y <= -50) {
            this.position.set(0, 30, 0); // Respawn if fallen out of world
            this.velocity.set(0, 0, 0);
        }

        // --- 4. MODEL SYNC ---
        if (this.model) {
            this.model.position.copy(this.position);
            this.model.rotation.y = this.yaw;
            this.model.visible = this.isThirdPerson;
        }

        // --- 5. CAMERA UPDATE ---
        const headPosition = new THREE.Vector3(
            this.position.x,
            this.position.y + this.eyeHeight,
            this.position.z
        );

        if (this.isThirdPerson) {
            const cameraOffset = new THREE.Vector3(0, 0, this.thirdPersonDistance);
            const cameraEuler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
            cameraOffset.applyEuler(cameraEuler);

            this.camera.position.copy(headPosition).add(cameraOffset);
            this.camera.lookAt(headPosition);
        } else {
            this.camera.position.copy(headPosition);
            this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
        }
    }
}
