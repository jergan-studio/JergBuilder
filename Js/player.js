import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera, mapGenerator) {
        this.scene = scene;
        this.camera = camera;
        this.mapGenerator = mapGenerator;

        // --- Position & Movement Stats ---
        this.position = new THREE.Vector3(0, 15, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        this.speed = 8.0;
        this.jumpForce = 12.0;
        this.gravity = 30.0;
        this.onGround = false;

        // --- Camera Modes ---
        // 0 = First Person | 1 = Third Person (Back) | 2 = Second Person (Front)
        this.viewMode = 0; 
        this.cameraDistance = 4.5;

        // --- Input State ---
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };

        // --- Custom GLB Model ---
        this.mesh = null;
        this.loadModel();

        // --- Setup Listeners ---
        this.setupInputs();
    }

    loadModel() {
        const loader = new GLTFLoader();
        loader.load(
            'Assets/jergplr.glb',
            (gltf) => {
                this.mesh = gltf.scene;
                this.mesh.scale.set(0.8, 0.8, 0.8);

                // Enable shadow rendering
                this.mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.scene.add(this.mesh);
                console.log("✅ Custom player model (jergplr.glb) loaded!");
            },
            undefined,
            (err) => {
                console.warn("⚠️ Could not load Assets/jergplr.glb, falling back to camera position.", err);
            }
        );
    }

    setupInputs() {
        // Keyboard Bindings
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyW') this.keys.forward = true;
            if (e.code === 'KeyS') this.keys.backward = true;
            if (e.code === 'KeyA') this.keys.left = true;
            if (e.code === 'KeyD') this.keys.right = true;
            if (e.code === 'Space') this.keys.jump = true;

            // Camera Toggle Hotkey ]
            if (e.code === 'BracketRight') {
                this.viewMode = (this.viewMode + 1) % 3;
                const modes = ["First Person", "3rd Person (Back)", "2nd Person (Front)"];
                console.log(`🎥 Camera Switched to: ${modes[this.viewMode]}`);
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
            if (document.pointerLockElement === document.body || document.pointerLockElement === this.camera.domElement) {
                const sensitivity = 0.002;
                this.rotation.y -= e.movementX * sensitivity;
                this.rotation.x -= e.movementY * sensitivity;

                // Clamp pitch so camera doesn't flip upside down
                this.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.rotation.x));
            }
        });
    }

    update(delta) {
        if (!delta || delta > 0.1) delta = 0.016; // Prevent massive frame jumps

        // --- 1. Movement Calculations ---
        const moveDir = new THREE.Vector3(0, 0, 0);

        if (this.keys.forward) moveDir.z -= 1;
        if (this.keys.backward) moveDir.z += 1;
        if (this.keys.left) moveDir.x -= 1;
        if (this.keys.right) moveDir.x += 1;

        moveDir.normalize();

        // Rotate movement relative to player body direction
        const bodyYaw = this.rotation.y;
        const moveX = moveDir.x * Math.cos(bodyYaw) - moveDir.z * Math.sin(bodyYaw);
        const moveZ = moveDir.x * Math.sin(bodyYaw) + moveDir.z * Math.cos(bodyYaw);

        this.velocity.x = moveX * this.speed;
        this.velocity.z = moveZ * this.speed;

        // Gravity & Jump Physics
        if (!this.onGround) {
            this.velocity.y -= this.gravity * delta;
        } else if (this.keys.jump) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }

        // Apply Movement Vectors
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.position.z += this.velocity.z * delta;

        // Ground Floor Collision Check (Default Floor at Y = 1)
        const minHeight = 1.6;
        if (this.position.y <= minHeight) {
            this.position.y = minHeight;
            this.velocity.y = 0;
            this.onGround = true;
        }

        // --- 2. Update 3D GLB Model Mesh ---
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.position.y -= 1.6; // Anchor origin at player feet
            this.mesh.rotation.y = this.rotation.y;

            // Hide mesh in 1st person view so model doesn't block camera screen
            this.mesh.visible = (this.viewMode !== 0);
        }

        // --- 3. Camera Position & Mode Logic ---
        this.updateCamera();
    }

    updateCamera() {
        if (!this.camera) return;

        const headPos = this.position.clone(); // Eye height reference point

        if (this.viewMode === 0) {
            // --- First Person ---
            this.camera.position.copy(headPos);
            this.camera.rotation.copy(this.rotation);
        } else {
            // Direction the player is looking (horizontal vector)
            const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);

            if (this.viewMode === 1) {
                // --- Third Person (Back) ---
                const camPos = headPos.clone().sub(forwardDir.clone().multiplyScalar(this.cameraDistance));
                camPos.y += 0.8; // Elevation offset
                this.camera.position.copy(camPos);
                this.camera.lookAt(headPos);
            } else if (this.viewMode === 2) {
                // --- Second Person (Front View) ---
                const camPos = headPos.clone().add(forwardDir.clone().multiplyScalar(this.cameraDistance));
                camPos.y += 0.8; // Elevation offset
                this.camera.position.copy(camPos);
                this.camera.lookAt(headPos); // Lock camera onto character head
            }
        }
    }
}
