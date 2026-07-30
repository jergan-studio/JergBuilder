import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera, mapGenerator) {
        this.scene = scene;
        this.camera = camera;
        this.mapGenerator = mapGenerator;

        // Position & Rotation
        this.position = new THREE.Vector3(0, 18, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        // Player Collision Dimensions
        this.radius = 0.35;
        this.height = 1.8;

        // Physics Settings
        this.speed = 7.5;
        this.jumpForce = 10.0;
        this.gravity = 26.0;
        this.onGround = false;

        // Camera Perspectives: 0 = 1st Person | 1 = 3rd Person Back | 2 = 2nd Person Front
        this.viewMode = 0;
        this.cameraDistance = 4.0;

        // WASD Input Handling
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
            () => {
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
        // Keyboard Bindings (W A S D + Space)
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyW') this.keys.forward = true;
            if (e.code === 'KeyS') this.keys.backward = true;
            if (e.code === 'KeyA') this.keys.left = true;
            if (e.code === 'KeyD') this.keys.right = true;
            if (e.code === 'Space') this.keys.jump = true;

            // Camera Toggle Hotkey: ]
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

        // Mouse Look
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

        // 1. WASD Movement Directions Relative to Camera View
        const moveDir = new THREE.Vector3();
        if (this.keys.forward) moveDir.z -= 1;
        if (this.keys.backward) moveDir.z += 1;
        if (this.keys.left) moveDir.x -= 1;
        if (this.keys.right) moveDir.x += 1;
        moveDir.normalize();

        const yaw = this.rotation.y;
        this.velocity.x = (moveDir.x * Math.cos(yaw) - moveDir.z * Math.sin(yaw)) * this.speed;
        this.velocity.z = (moveDir.x * Math.sin(yaw) + moveDir.z * Math.cos(yaw)) * this.speed;

        // 2. Gravity and Jump Physics
        if (!this.onGround) {
            this.velocity.y -= this.gravity * delta;
        } else if (this.keys.jump) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }

        // 3. Wall Collision Checks (X and Z Movement)
        const nextX = this.position.x + this.velocity.x * delta;
        const nextZ = this.position.z + this.velocity.z * delta;

        if (!this.isCollidingAt(nextX, this.position.y, this.position.z)) {
            this.position.x = nextX;
        }
        if (!this.isCollidingAt(this.position.x, this.position.y, nextZ)) {
            this.position.z = nextZ;
        }

        // 4. Vertical Movement and Ground Landing
        this.position.y += this.velocity.y * delta;

        let terrainY = -100;
        if (this.mapGenerator && typeof this.mapGenerator.getTerrainHeight === 'function') {
            terrainY = this.mapGenerator.getTerrainHeight(this.position.x, this.position.z);
        }

        const groundLevel = terrainY + 1.0;

        if (this.position.y <= groundLevel) {
            this.position.y = groundLevel;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // 5. Falling Off Island Void Catch
        if (this.position.y < -25) {
            this.position.set(0, 20, 0);
            this.velocity.set(0, 0, 0);
        }

        // 6. Sync Player Model Mesh
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.rotation.y;
            this.mesh.visible = (this.viewMode !== 0);
        }

        this.updateCamera();
    }

    // Full AABB Check Against Surrounding Solid Blocks
    isCollidingAt(targetX, targetY, targetZ) {
        if (!this.mapGenerator || !this.mapGenerator.blocks) return false;

        const feetY = Math.floor(targetY);
        const headY = Math.floor(targetY + this.height - 0.1);

        for (let y = feetY; y <= headY; y++) {
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const gx = Math.round(targetX) + dx;
                    const gz = Math.round(targetZ) + dz;

                    if (this.mapGenerator.blocks.has(`${gx},${y},${gz}`)) {
                        // Check radial distance to block center
                        const dist = Math.hypot(targetX - gx, targetZ - gz);
                        if (dist < this.radius + 0.45) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    updateCamera() {
        if (!this.camera) return;

        const eyePos = this.position.clone();
        eyePos.y += 1.5;

        if (this.viewMode === 0) {
            // First Person
            this.camera.position.copy(eyePos);
            this.camera.rotation.copy(this.rotation);
        } else {
            const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);

            if (this.viewMode === 1) {
                // Third Person Back
                const camPos = eyePos.clone().sub(forwardDir.clone().multiplyScalar(this.cameraDistance));
                camPos.y += 0.6;
                this.camera.position.copy(camPos);
                this.camera.lookAt(eyePos);
            } else if (this.viewMode === 2) {
                // Second Person Front
                const camPos = eyePos.clone().add(forwardDir.clone().multiplyScalar(this.cameraDistance));
                camPos.y += 0.6;
                this.camera.position.copy(camPos);
                this.camera.lookAt(eyePos);
            }
        }
    }
}
