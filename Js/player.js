import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera, mapGenerator) {
        this.scene = scene;
        this.camera = camera;
        this.mapGenerator = mapGenerator;

        // Position & Angles
        this.position = new THREE.Vector3(0, 20, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.pitch = 0;
        this.yaw = 0;

        // Physical Dimensions
        this.radius = 0.35;
        this.height = 1.8;

        // Physics Settings
        this.speed = 8.0;
        this.jumpForce = 11.0;
        this.gravity = 28.0;
        this.onGround = false;

        // Camera Modes: 0 = 1st Person | 1 = 3rd Person Back | 2 = 2nd Person Front
        this.viewMode = 0;
        this.cameraDistance = 4.5;

        // Inventory State
        this.selectedSlot = 1;

        // Key Press Map
        this.keys = { forward: false, backward: false, left: false, right: false, jump: false };

        this.mesh = null;
        this.loadModel();
        this.setupInputs();
        this.setupPointerLock();
        this.updateHotbarUI();
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
                console.log("✅ jergplr.glb model active!");
            },
            undefined,
            () => {
                this.createFallbackMesh();
            }
        );
    }

    createFallbackMesh() {
        this.mesh = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.5 });
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), mat);
        head.position.y = 1.4;
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.0, 16), mat);
        body.position.y = 0.5;
        this.mesh.add(head, body);
        this.scene.add(this.mesh);
    }

    setupPointerLock() {
        document.body.addEventListener('click', () => {
            if (!document.pointerLockElement) {
                document.body.requestPointerLock();
            }
        });
    }

    setupInputs() {
        // Keyboard Binds
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyW') this.keys.forward = true;
            if (e.code === 'KeyS') this.keys.backward = true;
            if (e.code === 'KeyA') this.keys.left = true;
            if (e.code === 'KeyD') this.keys.right = true;
            if (e.code === 'Space') this.keys.jump = true;

            // Camera Mode Toggle Hotkey: ]
            if (e.code === 'BracketRight') {
                this.viewMode = (this.viewMode + 1) % 3;
            }

            // Inventory Hotbar Selection (1 to 8)
            if (e.key >= '1' && e.key <= '8') {
                this.selectedSlot = parseInt(e.key);
                this.updateHotbarUI();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'KeyW') this.keys.forward = false;
            if (e.code === 'KeyS') this.keys.backward = false;
            if (e.code === 'KeyA') this.keys.left = false;
            if (e.code === 'KeyD') this.keys.right = false;
            if (e.code === 'Space') this.keys.jump = false;
        });

        // Mouse Rotation Look
        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                const sensitivity = 0.0022;
                this.yaw -= e.movementX * sensitivity;
                this.pitch -= e.movementY * sensitivity;

                const clampAngle = Math.PI / 2 - 0.05;
                this.pitch = Math.max(-clampAngle, Math.min(clampAngle, this.pitch));
            }
        });
    }

    updateHotbarUI() {
        const slots = document.querySelectorAll('.hotbar-slot, [data-slot]');
        slots.forEach((slot, idx) => {
            if (idx + 1 === this.selectedSlot) {
                slot.classList.add('active');
                slot.style.border = '2px solid #ffffff';
            } else {
                slot.classList.remove('active');
                slot.style.border = '2px solid transparent';
            }
        });
    }

    update(delta) {
        if (!delta || delta > 0.1) delta = 0.016;

        // 1. Calculate Standard Movement Relative to Yaw
        const moveVector = new THREE.Vector3();
        if (this.keys.forward) moveVector.z -= 1;
        if (this.keys.backward) moveVector.z += 1;
        if (this.keys.left) moveVector.x -= 1;
        if (this.keys.right) moveVector.x += 1;

        if (moveVector.lengthSq() > 0) {
            moveVector.normalize();

            const cos = Math.cos(this.yaw);
            const sin = Math.sin(this.yaw);

            this.velocity.x = (moveVector.x * cos - moveVector.z * sin) * this.speed;
            this.velocity.z = (moveVector.x * sin + moveVector.z * cos) * this.speed;
        } else {
            this.velocity.x = 0;
            this.velocity.z = 0;
        }

        // 2. Physics Gravity & Jumping
        if (!this.onGround) {
            this.velocity.y -= this.gravity * delta;
        } else if (this.keys.jump) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }

        // 3. Horizontal Collision Checks
        const nextX = this.position.x + this.velocity.x * delta;
        const nextZ = this.position.z + this.velocity.z * delta;

        if (!this.checkBlockCollision(nextX, this.position.y, this.position.z)) {
            this.position.x = nextX;
        }
        if (!this.checkBlockCollision(this.position.x, this.position.y, nextZ)) {
            this.position.z = nextZ;
        }

        // 4. Vertical Landing Check
        this.position.y += this.velocity.y * delta;

        let terrainY = -100;
        if (this.mapGenerator && typeof this.mapGenerator.getTerrainHeight === 'function') {
            terrainY = this.mapGenerator.getTerrainHeight(this.position.x, this.position.z);
        }

        const standingHeight = terrainY + 1.0;

        if (this.position.y <= standingHeight) {
            this.position.y = standingHeight;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // 5. Falling Off Void Safety Net
        if (this.position.y < -25) {
            this.position.set(0, 20, 0);
            this.velocity.set(0, 0, 0);
        }

        // 6. Synchronize Mesh & Camera
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.yaw;
            this.mesh.visible = (this.viewMode !== 0);
        }

        this.updateCamera();
    }

    checkBlockCollision(targetX, targetY, targetZ) {
        if (!this.mapGenerator || !this.mapGenerator.blocks) return false;

        const feetY = Math.floor(targetY);
        const headY = Math.floor(targetY + this.height - 0.1);

        for (let y = feetY; y <= headY; y++) {
            const gx = Math.round(targetX);
            const gz = Math.round(targetZ);

            if (this.mapGenerator.blocks.has(`${gx},${y},${gz}`)) {
                return true;
            }
        }
        return false;
    }

    updateCamera() {
        if (!this.camera) return;

        const eyePos = this.position.clone();
        eyePos.y += 1.5;

        const camEuler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');

        if (this.viewMode === 0) {
            // First Person
            this.camera.position.copy(eyePos);
            this.camera.rotation.copy(camEuler);
        } else {
            const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(camEuler);

            if (this.viewMode === 1) {
                // Third Person Back
                const camPos = eyePos.clone().sub(forwardDir.clone().multiplyScalar(this.cameraDistance));
                this.camera.position.copy(camPos);
                this.camera.lookAt(eyePos);
            } else if (this.viewMode === 2) {
                // Second Person Front
                const camPos = eyePos.clone().add(forwardDir.clone().multiplyScalar(this.cameraDistance));
                this.camera.position.copy(camPos);
                this.camera.lookAt(eyePos);
            }
        }
    }
}
