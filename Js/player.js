import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera, mapGenerator) {
        this.scene = scene;
        this.camera = camera;
        this.mapGenerator = mapGenerator;

        // --- Player World Vectors ---
        this.position = new THREE.Vector3(0, 16, 0); // Spawn safely above terrain
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        // --- Physics & Speeds ---
        this.speed = 8.0;
        this.jumpForce = 12.0;
        this.gravity = 28.0;
        this.onGround = false;

        // --- Camera Perspectives ---
        // 0 = 1st Person | 1 = 3rd Person (Back) | 2 = 2nd Person (Front)
        this.viewMode = 0; 
        this.cameraDistance = 4.5;

        // --- Movement Controls ---
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };

        // --- Load GLB Player Model ---
        this.mesh = null;
        this.loadModel();

        // --- Controls Event Setup ---
        this.setupInputs();
    }

    loadModel() {
        const loader = new GLTFLoader();
        
        // Fetch jergplr.glb directly from project root
        loader.load(
            './jergplr.glb',
            (gltf) => {
                if (this.mesh) this.scene.remove(this.mesh);

                this.mesh = gltf.scene;
                this.mesh.scale.set(1.0, 1.0, 1.0);

                // Enable shadow casting for player model
                this.mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.scene.add(this.mesh);
                console.log("✅ jergplr.glb loaded from root!");
            },
            undefined,
            (err) => {
                console.warn("⚠️ Could not load ./jergplr.glb from root. Using fallback spheres...", err);
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

        this.mesh.add(head);
        this.mesh.add(body);
        this.scene.add(this.mesh);
    }

    setupInputs() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyW') this.keys.forward = true;
            if (e.code === 'KeyS') this.keys.backward = true;
            if (e.code === 'KeyA') this.keys.left = true;
            if (e.code === 'KeyD') this.keys.right = true;
            if (e.code === 'Space') this.keys.jump = true;

            // Perspective switch with ']' key
            if (e.code === 'BracketRight') {
                this.viewMode = (this.viewMode + 1) % 3;
                const modes = ["First Person", "3rd Person (Back)", "2nd Person (Front)"];
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
            if (document.pointerLockElement === document.body || document.pointerLockElement === this.camera.domElement) {
                const sensitivity = 0.002;
                this.rotation.y -= e.movementX * sensitivity;
                this.rotation.x -= e.movementY * sensitivity;

                // Clamp pitch so camera doesn't flip over upside down
                this.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.rotation.x));
            }
        });
    }

    update(delta) {
        if (!delta || delta > 0.1) delta = 0.016;

        // --- Direction Vector Calculations ---
        const moveDir = new THREE.Vector3(0, 0, 0);
        if (this.keys.forward) moveDir.z -= 1;
        if (this.keys.backward) moveDir.z += 1;
        if (this.keys.left) moveDir.x -= 1;
        if (this.keys.right) moveDir.x += 1;
        moveDir.normalize();

        const bodyYaw = this.rotation.y;
        const moveX = moveDir.x * Math.cos(bodyYaw) - moveDir.z * Math.sin(bodyYaw);
        const moveZ = moveDir.x * Math.sin(bodyYaw) + moveDir.z * Math.cos(bodyYaw);

        this.velocity.x = moveX * this.speed;
        this.velocity.z = moveZ * this.speed;

        // --- Gravity & Jumping ---
        if (!this.onGround) {
            this.velocity.y -= this.gravity * delta;
        } else if (this.keys.jump) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }

        // Apply Positions
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.position.z += this.velocity.z * delta;

        // --- Ground Terrain Collision ---
        let groundLevel = 1.0;
        if (this.mapGenerator && typeof this.mapGenerator.getTerrainHeight === 'function') {
            groundLevel = this.mapGenerator.getTerrainHeight(this.position.x, this.position.z) + 1.2;
        }

        if (this.position.y <= groundLevel) {
            this.position.y = groundLevel;
            this.velocity.y = 0;
            this.onGround = true;
        }

        // --- Model Mesh Positioning ---
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.position.y -= 1.2; // Keep model feet grounded
            this.mesh.rotation.y = this.rotation.y;

            // Hide model in First-Person so it doesn't block vision
            this.mesh.visible = (this.viewMode !== 0);
        }

        this.updateCamera();
    }

    updateCamera() {
        if (!this.camera) return;

        const eyePos = this.position.clone();
        eyePos.y += 0.4; // Eye height

        if (this.viewMode === 0) {
            // First Person
            this.camera.position.copy(eyePos);
            this.camera.rotation.copy(this.rotation);
        } else {
            const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);

            if (this.viewMode === 1) {
                // Third Person Back
                const camPos = eyePos.clone().sub(forwardDir.clone().multiplyScalar(this.cameraDistance));
                camPos.y += 0.8;
                this.camera.position.copy(camPos);
                this.camera.lookAt(eyePos);
            } else if (this.viewMode === 2) {
                // Second Person Front (Camera in front looking directly back at player)
                const camPos = eyePos.clone().add(forwardDir.clone().multiplyScalar(this.cameraDistance));
                camPos.y += 0.8;
                this.camera.position.copy(camPos);
                this.camera.lookAt(eyePos);
            }
        }
    }
}
