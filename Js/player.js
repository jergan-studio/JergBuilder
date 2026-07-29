import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera, mapGenerator) {
        this.scene = scene;
        this.camera = camera;
        this.mapGenerator = mapGenerator;

        // Position & Movement Vectors
        this.position = new THREE.Vector3(0, 20, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        // Physics Settings
        this.speed = 8.0;
        this.jumpForce = 12.0;
        this.gravity = 28.0;
        this.onGround = false;

        // Perspective System: 0 = 1st Person | 1 = 3rd Person Back | 2 = 2nd Person Front
        this.viewMode = 0;
        this.cameraDistance = 4.5;
        this.eyeHeight = 0.4;

        // Input Tracking
        this.keys = { forward: false, backward: false, left: false, right: false, jump: false };

        // Model Mesh
        this.mesh = null;
        this.loadModel();
        this.setupInputs();
    }

    loadModel() {
        const loader = new GLTFLoader();

        // Load jergplr.glb directly from the project root
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
                console.warn("⚠️ Could not find ./jergplr.glb, creating fallback model...", err);
                this.createFallbackMesh();
            }
        );
    }

    createFallbackMesh() {
        this.mesh = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 });

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), mat);
        head.position.y = 1.4;

        const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), mat);
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

            // Perspective toggle hotkey ]
            if (e.code === 'BracketRight') {
                this.viewMode = (this.viewMode + 1) % 3;
                const modes = ["1st Person", "3rd Person (Back)", "2nd Person (Front)"];
                console.log(`🎥 Camera Mode: ${modes[this.viewMode]}`);
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

                // Clamp vertical look angle
                this.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.rotation.x));
            }
        });
    }

    update(delta) {
        if (!delta || delta > 0.1) delta = 0.016;

        // Movement Direction Calculations
        const moveDir = new THREE.Vector3();
        if (this.keys.forward) moveDir.z -= 1;
        if (this.keys.backward) moveDir.z += 1;
        if (this.keys.left) moveDir.x -= 1;
        if (this.keys.right) moveDir.x += 1;
        moveDir.normalize();

        const yaw = this.rotation.y;
        this.velocity.x = (moveDir.x * Math.cos(yaw) - moveDir.z * Math.sin(yaw)) * this.speed;
        this.velocity.z = (moveDir.x * Math.sin(yaw) + moveDir.z * Math.cos(yaw)) * this.speed;

        // Gravity & Jump Mechanics
        if (!this.onGround) {
            this.velocity.y -= this.gravity * delta;
        } else if (this.keys.jump) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }

        // Apply velocity vectors
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.position.z += this.velocity.z * delta;

        // Terrain Collision Detection
        let islandY = -100;
        if (this.mapGenerator && typeof this.mapGenerator.getTerrainHeight === 'function') {
            islandY = this.mapGenerator.getTerrainHeight(this.position.x, this.position.z);
        }

        const standingLevel = islandY + 1.5;

        if (this.position.y <= standingLevel) {
            this.position.y = standingLevel;
            this.velocity.y = 0;
            this.onGround = true;
        }

        // Sync player mesh position
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.position.y -= 1.0;
            this.mesh.rotation.y = this.rotation.y;

            // Hide in first-person perspective
            this.mesh.visible = (this.viewMode !== 0);
        }

        this.updateCamera();
    }

    updateCamera() {
        if (!this.camera) return;

        const eyePos = this.position.clone();
        eyePos.y += this.eyeHeight;

        if (this.viewMode === 0) {
            // First Person
            this.camera.position.copy(eyePos);
            this.camera.rotation.copy(this.rotation);
        } else {
            const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);

            if (this.viewMode === 1) {
                // 3rd Person Back
                const camPos = eyePos.clone().sub(forwardDir.clone().multiplyScalar(this.cameraDistance));
                camPos.y += 0.8;
                this.camera.position.copy(camPos);
                this.camera.lookAt(eyePos);
            } else if (this.viewMode === 2) {
                // 2nd Person Front
                const camPos = eyePos.clone().add(forwardDir.clone().multiplyScalar(this.cameraDistance));
                camPos.y += 0.8;
                this.camera.position.copy(camPos);
                this.camera.lookAt(eyePos);
            }
        }
    }
}
