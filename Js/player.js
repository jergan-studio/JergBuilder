import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera, worldBlocks = []) {
        this.scene = scene;
        this.camera = camera;
        this.worldBlocks = worldBlocks; // Can be Mesh Array, Chunk Group, or Map

        // --- 1. SIZING & SCALE ---
        this.scale = 0.5;
        this.width = 0.6 * this.scale;     // 0.3 units wide
        this.height = 1.8 * this.scale;    // 0.9 units tall
        this.eyeHeight = 1.6 * this.scale; // 0.8 units eye height

        // Spawn position (start high above ground)
        this.position = new THREE.Vector3(0, 30, 0);
        this.velocity = new THREE.Vector3();

        // Movement Physics
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

        // Player Model setup
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

            // Toggle 3rd Person View with the '[' key
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

    // --- EXTRACT COLLISION MESHES FROM ANY MAP GENERATOR ---
    getCollisionMeshes() {
        if (!this.worldBlocks) return [];

        // If worldBlocks is passed as a THREE.Scene or THREE.Group chunk
        if (this.worldBlocks.children && Array.isArray(this.worldBlocks.children)) {
            return this.worldBlocks.children;
        }

        // If worldBlocks is an array of Meshes / InstancedMeshes
        if (Array.isArray(this.worldBlocks)) {
            return this.worldBlocks;
        }

        // Fallback to checking full scene children
        return this.scene.children.filter(child => child !== this.model && child.isMesh);
    }

    // --- ACCURATE MULTI-RAY COLLISION RESOLUTION ---
    resolveCollisions() {
        const meshes = this.getCollisionMeshes();
        if (meshes.length === 0) return;

        const halfW = this.width / 2;

        // 1. VERTICAL COLLISION (GROUND & FEET)
        // Check 5 points on feet (4 corners + center)
        const footOffsets = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(halfW, 0, halfW),
            new THREE.Vector3(-halfW, 0, halfW),
            new THREE.Vector3(halfW, 0, -halfW),
            new THREE.Vector3(-halfW, 0, -halfW)
        ];

        let landed = false;

        for (let offset of footOffsets) {
            const rayOrigin = this.position.clone().add(offset);
            rayOrigin.y += 0.2; // Start ray slightly inside player body

            this.raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
            this.raycaster.far = 0.3; // Check downward distance

            const hits = this.raycaster.intersectObjects(meshes, true);

            if (hits.length > 0 && this.velocity.y <= 0) {
                const hit = hits[0];
                this.position.y = hit.point.y;
                this.velocity.y = 0;
                this.isGrounded = true;
                landed = true;
                break;
            }
        }

        if (!landed) {
            this.isGrounded = false;
        }

        // 2. HORIZONTAL WALL COLLISION (X & Z AXES)
        const checkHeights = [0.2, this.height * 0.5, this.height - 0.1];
        const wallDirections = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1)
        ];

        for (let h of checkHeights) {
            const bodyCenter = this.position.clone();
            bodyCenter.y += h;

            for (let dir of wallDirections) {
                this.raycaster.set(bodyCenter, dir);
                this.raycaster.far = halfW + 0.05;

                const hits = this.raycaster.intersectObjects(meshes, true);

                if (hits.length > 0) {
                    const hit = hits[0];
                    const overlap = (halfW + 0.05) - hit.distance;

                    // Push player out of wall
                    this.position.sub(dir.clone().multiplyScalar(overlap));
                }
            }
        }
    }

    // --- RAYCAST FOR TARGETING / PLACING / BREAKING BLOCKS ---
    getLookAtBlock() {
        const meshes = this.getCollisionMeshes();
        const headPosition = new THREE.Vector3(
            this.position.x,
            this.position.y + this.eyeHeight,
            this.position.z
        );

        const lookDir = new THREE.Vector3(0, 0, -1);
        lookDir.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));

        this.raycaster.set(headPosition, lookDir);
        this.raycaster.far = this.reachDistance;

        const intersects = this.raycaster.intersectObjects(meshes, true);

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

        // Respawn if player falls into void
        if (this.position.y <= -30) {
            this.position.set(0, 30, 0);
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
