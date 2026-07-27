import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera, worldBlocks = []) {
        this.scene = scene;
        this.camera = camera;
        this.worldBlocks = worldBlocks;

        // --- 1. SIZING & SCALE ---
        this.scale = 0.5;
        this.width = 0.6 * this.scale;     // 0.3 units wide
        this.height = 1.8 * this.scale;    // 0.9 units tall
        this.eyeHeight = 1.6 * this.scale; // 0.8 units eye height

        // Spawn position
        this.position = new THREE.Vector3(0, 20, 0);
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

        // Raycasting for block targeting / placing
        this.raycaster = new THREE.Raycaster();
        this.reachDistance = 8;

        // Player Model
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

            // Toggle 3rd Person View with '['
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

    // Automatically retrieves valid terrain meshes from scene or worldBlocks
    getTerrainMeshes() {
        let meshes = [];

        if (Array.isArray(this.worldBlocks) && this.worldBlocks.length > 0) {
            meshes = this.worldBlocks;
        } else if (this.worldBlocks && this.worldBlocks.children) {
            meshes = this.worldBlocks.children;
        } else {
            // Search full scene for mesh terrain
            this.scene.traverse((child) => {
                if (child.isMesh && child !== this.model && !this.isDescendantOf(child, this.model)) {
                    meshes.push(child);
                }
            });
        }
        return meshes;
    }

    isDescendantOf(object, parent) {
        if (!parent) return false;
        let obj = object.parent;
        while (obj) {
            if (obj === parent) return true;
            obj = obj.parent;
        }
        return false;
    }

    // --- RAYCAST TARGETING (FOR BLOCK PLACEMENT / DESTROYING) ---
    getLookAtBlock() {
        const meshes = this.getTerrainMeshes();
        if (meshes.length === 0) return null;

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
            const normal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);

            // Apply world rotation of object if transformed
            if (hit.object) {
                normal.applyQuaternion(hit.object.getWorldQuaternion(new THREE.Quaternion()));
            }

            // Target block to break
            const targetBlock = new THREE.Vector3(
                Math.floor(point.x - normal.x * 0.4),
                Math.floor(point.y - normal.y * 0.4),
                Math.floor(point.z - normal.z * 0.4)
            );

            // Adjacent position to place a new block
            const placeBlock = new THREE.Vector3(
                Math.floor(point.x + normal.x * 0.4),
                Math.floor(point.y + normal.y * 0.4),
                Math.floor(point.z + normal.z * 0.4)
            );

            return { targetBlock, placeBlock, hit };
        }

        return null;
    }

    // --- ROBUST COLLISION SYSTEM ---
    resolveCollisions() {
        const meshes = this.getTerrainMeshes();
        if (meshes.length === 0) return;

        const halfW = this.width / 2;

        // 1. VERTICAL (GROUND / CEILING) COLLISION
        const checkPoints = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(halfW * 0.8, 0, halfW * 0.8),
            new THREE.Vector3(-halfW * 0.8, 0, halfW * 0.8),
            new THREE.Vector3(halfW * 0.8, 0, -halfW * 0.8),
            new THREE.Vector3(-halfW * 0.8, 0, -halfW * 0.8)
        ];

        let landed = false;

        for (let pt of checkPoints) {
            const rayOrigin = this.position.clone().add(pt);
            rayOrigin.y += 0.4; // Cast down starting inside lower torso

            this.raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
            this.raycaster.far = 0.5;

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

        // 2. HORIZONTAL WALL COLLISION (X & Z)
        const heights = [0.2, this.height * 0.5, this.height - 0.1];
        const directions = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1)
        ];

        for (let h of heights) {
            const center = this.position.clone();
            center.y += h;

            for (let dir of directions) {
                this.raycaster.set(center, dir);
                this.raycaster.far = halfW + 0.08;

                const hits = this.raycaster.intersectObjects(meshes, true);

                if (hits.length > 0) {
                    const hit = hits[0];
                    const overlap = (halfW + 0.08) - hit.distance;
                    this.position.sub(dir.clone().multiplyScalar(overlap));
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

        // --- 3. SUB-STEP PHYSICS MOVEMENT (PREVENTS NOCLIP TUNNELING) ---
        const steps = Math.max(1, Math.ceil(Math.abs(this.velocity.y * delta) / 0.2));
        const subDelta = delta / steps;

        for (let i = 0; i < steps; i++) {
            this.position.x += (this.velocity.x * subDelta);
            this.position.z += (this.velocity.z * subDelta);
            this.position.y += (this.velocity.y * subDelta);

            this.resolveCollisions();
        }

        // Void fallback safety
        if (this.position.y <= -30) {
            this.position.set(0, 25, 0);
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
