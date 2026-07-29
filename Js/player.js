import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera, mapGenerator) {
        this.scene = scene;
        this.camera = camera;
        this.mapGenerator = mapGenerator;

        // Spawn high above map so you land safely on top of grass (Y = 22)
        this.position = new THREE.Vector3(0, 22, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        this.speed = 8.0;
        this.jumpForce = 12.0;
        this.gravity = 28.0;
        this.onGround = false;

        // Camera Modes: 0 = 1st Person | 1 = 3rd Person Back | 2 = 2nd Person Front
        this.viewMode = 1; // Default to 3rd Person so you can see jergplr.glb immediately!
        this.cameraDistance = 5.0;

        this.keys = { forward: false, backward: false, left: false, right: false, jump: false };

        this.mesh = null;
        this.loadModel();
        this.setupInputs();
    }

    // --- LOAD GLB MODEL ---
    loadModel() {
        const loader = new GLTFLoader();
        loader.load(
            'Assets/jergplr.glb',
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
                console.log("✅ Assets/jergplr.glb loaded into world!");
            },
            undefined,
            (err) => {
                console.warn("⚠️ Could not find Assets/jergplr.glb. Creating placeholder spheres...");
                this.createPlaceholder();
            }
        );
    }

    createPlaceholder() {
        this.mesh = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), mat);
        head.position.y = 1.2;
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), mat);
        body.position.y = 0.4;
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

            // Toggle Camera Perspective with ]
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
                const sens = 0.002;
                this.rotation.y -= e.movementX * sens;
                this.rotation.x -= e.movementY * sens;
                this.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.rotation.x));
            }
        });
    }

    update(delta) {
        if (!delta || delta > 0.1) delta = 0.016;

        // Movement Vectors
        const moveDir = new THREE.Vector3(0, 0, 0);
        if (this.keys.forward) moveDir.z -= 1;
        if (this.keys.backward) moveDir.z += 1;
        if (this.keys.left) moveDir.x -= 1;
        if (this.keys.right) moveDir.x += 1;
        moveDir.normalize();

        const yaw = this.rotation.y;
        this.velocity.x = (moveDir.x * Math.cos(yaw) - moveDir.z * Math.sin(yaw)) * this.speed;
        this.velocity.z = (moveDir.x * Math.sin(yaw) + moveDir.z * Math.cos(yaw)) * this.speed;

        // Gravity
        if (!this.onGround) {
            this.velocity.y -= this.gravity * delta;
        } else if (this.keys.jump) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }

        // Apply Position
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.position.z += this.velocity.z * delta;

        // Ground Collision against Island Height
        const islandTopY = this.mapGenerator ? this.mapGenerator.getTerrainHeight(this.position.x, this.position.z) : 10;
        if (this.position.y <= islandTopY + 1.2) {
            this.position.y = islandTopY + 1.2;
            this.velocity.y = 0;
            this.onGround = true;
        }

        // Update Mesh Position
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.position.y -= 1.2; // Anchor base to ground
            this.mesh.rotation.y = this.rotation.y;
            this.mesh.visible = (this.viewMode !== 0);
        }

        this.updateCamera();
    }

    updateCamera() {
        if (!this.camera) return;
        const eyePos = this.position.clone();

        if (this.viewMode === 0) {
            // First Person
            this.camera.position.copy(eyePos);
            this.camera.rotation.copy(this.rotation);
        } else {
            const fwd = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);
            const dist = this.viewMode === 1 ? -this.cameraDistance : this.cameraDistance;
            
            const camPos = eyePos.clone().add(fwd.clone().multiplyScalar(dist));
            camPos.y += 1.0;
            
            this.camera.position.copy(camPos);
            this.camera.lookAt(eyePos);
        }
    }
}
