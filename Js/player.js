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
        this.eyeHeight = 1.6 * this.scale; // 0.8 units eye height

        this.position = new THREE.Vector3(0, 20, 0);
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

        // Raycasting for direct collision & block placement
        this.raycaster = new THREE.Raycaster();
        this.reachDistance = 8; 

        // Player Model
        this.model = null;
        this.loadPlayerModel();

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

            // Toggle 3rd Person View with '[' key
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

    // Helper to extract valid meshes from whatever worldBlocks contains
    getCollisionTargets() {
        if (!this.worldBlocks) return [];
        if (Array.isArray(this.worldBlocks)) return this.worldBlocks;
        if (this.worldBlocks.children) return this.worldBlocks.children;
        return [this.worldBlocks];
    }

    // --- RAYCAST-BASED DIRECT COLLISION SYSTEM ---
    resolveCollisions() {
        const targets = this.getCollisionTargets();
        if (targets.length === 0) return;

        // 1. GROUND / CEILING COLLISION (Y-AXIS)
        const feetPos = this.position.clone();
        feetPos.y += 0.1; // Raycast slightly above feet pointing down

        this.raycaster.set(feetPos, new THREE.Vector3(0, -1, 0));
        this.raycaster.far = 0.3; // Small distance check under feet

        const groundHits = this.raycaster.intersectObjects(targets, true);

        if (groundHits.length > 0 && this.velocity.y <= 0) {
            const hit = groundHits[0];
            this.position.y = hit.point.y;
            this.velocity.y = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        // 2. HORIZONTAL WALL COLLISION (X & Z AXIS)
        const directions = [
            new THREE.Vector3(1, 0, 0),  // Right
            new THREE.Vector3(-1, 0, 0), // Left
            new THREE.Vector3(0, 0, 1),  // Back
            new THREE.Vector3(0, 0, -1)  // Forward
        ];

        const rayOrigin = this.position.clone();
        rayOrigin.y += this.height * 0.5; // Cast from body center

        const wallRadius = this.width / 2;

        for (let dir of directions) {
            this.raycaster.set(rayOrigin, dir);
            this.raycaster.far = wallRadius + 0.05;

            const wallHits = this.raycaster.intersectObjects(targets, true);
            if (wallHits.length > 0) {
                const hit = wallHits[0];
                const overlap = (wallRadius + 0.05) - hit.distance;

                // Push player back away from the wall
                this.position.sub(dir.clone().multiplyScalar(overlap));
            }
        }
    }

    // --- RAYCAST FOR BLOCK PLACEMENT / DESTROYING ---
    getLookAtBlock() {
        const targets = this.getCollisionTargets();
        const headPosition = new THREE.Vector3(
            this.position.x,
            this.position.y + this.eyeHeight,
            this.position.z
        );

        const lookDir = new THREE.Vector3(0, 0, -1);
        lookDir.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));

        this.raycaster.set(headPosition, lookDir);
        this.raycaster.far = this.reachDistance;

        const intersects = this.raycaster.intersectObjects(targets, true);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const point = hit.point;
            const normal = hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0);

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

        // --- 2. JUMPING & GRAVITY ---
        if (this.isGrounded && this.keys.jump) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
        }

        this.velocity.y -= this.gravity * delta;

        // --- 3. APPLY VELOCITY & SOLVE COLLISIONS ---
        this.position.x += this.velocity.x * delta;
        this.position.z += this.velocity.z * delta;
        this.position.y += this.velocity.y * delta;

        this.resolveCollisions();

        // Respawn check if player falls out of bounds
        if (this.position.y <= -30) {
            this.position.set(0, 20, 0);
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
