import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera, mapGenerator) {
        this.scene = scene;
        this.camera = camera;
        this.mapGenerator = mapGenerator;

        // Position & Movement
        this.position = new THREE.Vector3(0, 20, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        // Physical Dimensions (Bounding Box)
        this.radius = 0.35;
        this.height = 1.8;

        // Physics Tuning
        this.speed = 7.5;
        this.jumpForce = 10.0;
        this.gravity = 26.0;
        this.onGround = false;

        // Camera System: 0 = First Person | 1 = Third Person Back | 2 = Second Person Front
        this.viewMode = 0;
        this.cameraDistance = 4.0;

        // Inputs
        this.keys = { forward: false, backward: false, left: false, right: false, jump: false };

        this.mesh = null;
        this.loadModel();
        this.setupInputs();
    }

    loadModel() {
        const loader = new GLTFLoader();
        loader.load(
            './jergplr.glb',
            (gltf) => {
                if (this.mesh) this.scene.remove(this.mesh);

                this.mesh = gltf.scene;
                this.mesh.scale.set(1.0, 1.0, 1.0);

                this.mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.scene.add(this.mesh);
                console.log("✅ jergplr.glb loaded successfully!");
            },
            undefined,
            (err) => {
                console.warn("⚠️ Fallback player active.");
                this.createFallbackMesh();
            }
        );
    }

    createFallbackMesh() {
        this.mesh = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 });
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), mat);
        head.position.y = 1.4;
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.0, 16), mat);
        body.position.y = 0.5;
        this.mesh.add(head, body);
        this.scene.add(this.mesh);
    }

    setupInputs() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyW') this.keys.forward = true;
            if (e.code === 'KeyS') this.keys.backward = true;
            if (e.code === 'KeyA') this.keys.left = true;
            if (e.code === 'KeyD') this.keys.right = true;
            if (e.code === 'Space') this.keys.jump = true;

            // Camera View Hotkey ]
            if (e.code === 'BracketRight') {
                this.viewMode = (this.viewMode + 1) % 3;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'KeyW') this.keys.forward = false;
            if (e.code === 'KeyS') this.keys.backward = false;
            if (e.code === 'KeyA') this.keys.left = false;
            if (e.code === 'KeyD') this.keys.right = false;
            if (e.code === 'Space') this.keys.jump = false;
        });

        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                const sensitivity = 0.002;
                this.rotation.y -= e.movementX * sensitivity;
                this.rotation.x -= e.movementY * sensitivity;
                this.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.rotation.x));
            }
        });
    }

    update(delta) {
        if (!delta || delta > 0.1) delta = 0.016;

        // 1. Compute Input Vector
        const moveDir = new THREE.Vector3();
        if (this.keys.forward) moveDir.z -= 1;
        if (this.keys.backward) moveDir.z += 1;
        if (this.keys.left) moveDir.x -= 1;
        if (this.keys.right) moveDir.x += 1;
        moveDir.normalize();

        const yaw = this.rotation.y;
        this.velocity.x = (moveDir.x * Math.cos(yaw) - moveDir.z * Math.sin(yaw)) * this.speed;
        this.velocity.z = (moveDir.x * Math.sin(yaw) + moveDir.z * Math.cos(yaw)) * this.speed;

        // 2. Apply Gravity & Jumping
        if (!this.onGround) {
            this.velocity.y -= this.gravity * delta;
        } else if (this.keys.jump) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }

        // 3. Move Horizontally with Collision Checks
        const nextX = this.position.x + this.velocity.x * delta;
        const nextZ = this.position.z + this.velocity.z * delta;

        if (!this.checkWallCollision(nextX, this.position.y, this.position.z)) {
            this.position.x = nextX;
        }
        if (!this.checkWallCollision(this.position.x, this.position.y, nextZ)) {
            this.position.z = nextZ;
        }

        // 4. Move Vertically with Ground Surface Landing & Step-Up
        this.position.y += this.velocity.y * delta;

        let terrainY = -100;
        if (this.mapGenerator && typeof this.mapGenerator.getTerrainHeight === 'function') {
            terrainY = this.mapGenerator.getTerrainHeight(this.position.x, this.position.z);
        }

        const standingHeight = terrainY + 1.0;

        // Check if player is standing on or stepping onto a block surface
        if (this.position.y <= standingHeight) {
            this.position.y = standingHeight;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // 5. Void Fall Protection (Respawn back on island)
        if (this.position.y < -20) {
            console.log("⚠️ Player fell into the void. Respawning...");
            this.position.set(0, 20, 0);
            this.velocity.set(0, 0, 0);
        }

        // 6. Update Model Mesh & Camera
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.rotation.y;
            this.mesh.visible = (this.viewMode !== 0);
        }

        this.updateCamera();
    }

    // Prevents player from walking into solid block walls
    checkWallCollision(targetX, targetY, targetZ) {
        if (!this.mapGenerator || !this.mapGenerator.blocks) return false;

        const feetY = Math.floor(targetY);
        const headY = Math.floor(targetY + this.height - 0.2);

        for (let y = feetY; y <= headY; y++) {
            const gx = Math.round(targetX);
            const gz = Math.round(targetZ);

            if (this.mapGenerator.blocks.has(`${gx},${y},${gz}`)) {
                return true; // Solid wall block detected
            }
        }
        return false;
    }

    updateCamera() {
        if (!this.camera) return;

        const eyePos = this.position.clone();
        eyePos.y += 1.5; // Eye height offset

        if (this.viewMode === 0) {
            this.camera.position.copy(eyePos);
            this.camera.rotation.copy(this.rotation);
        } else {
            const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);

            if (this.viewMode === 1) {
                // 3rd Person Back
                const camPos = eyePos.clone().sub(forwardDir.clone().multiplyScalar(this.cameraDistance));
                camPos.y += 0.6;
                this.camera.position.copy(camPos);
                this.camera.lookAt(eyePos);
            } else if (this.viewMode === 2) {
                // 2nd Person Front
                const camPos = eyePos.clone().add(forwardDir.clone().multiplyScalar(this.cameraDistance));
                camPos.y += 0.6;
                this.camera.position.copy(camPos);
                this.camera.lookAt(eyePos);
            }
        }
    }
}
