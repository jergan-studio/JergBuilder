import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera, mapGenerator) {
        this.scene = scene;
        this.camera = camera;
        this.mapGenerator = mapGenerator;

        // Position & Movement
        this.position = new THREE.Vector3(0, 10, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        this.speed = 8.0;
        this.jumpForce = 12.0;
        this.gravity = 30.0;
        this.onGround = false;

        // Camera Modes
        this.viewMode = 0; 
        this.cameraDistance = 4.0;

        // Inputs
        this.keys = { forward: false, backward: false, left: false, right: false, jump: false };

        // Mesh Setup
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
                console.log("✅ jergplr.glb loaded from root!");
            },
            undefined,
            (err) => {
                console.warn("⚠️ Fallback mesh active.");
            }
        );
    }

    setupInputs() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyW') this.keys.forward = true;
            if (e.code === 'KeyS') this.keys.backward = true;
            if (e.code === 'KeyA') this.keys.left = true;
            if (e.code === 'KeyD') this.keys.right = true;
            if (e.code === 'Space') this.keys.jump = true;

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
            if (document.pointerLockElement === document.body || document.pointerLockElement === this.camera.domElement) {
                const sensitivity = 0.002;
                this.rotation.y -= e.movementX * sensitivity;
                this.rotation.x -= e.movementY * sensitivity;
                this.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.rotation.x));
            }
        });
    }

    update(delta) {
        if (!delta || delta > 0.1) delta = 0.016;

        const moveDir = new THREE.Vector3();
        if (this.keys.forward) moveDir.z -= 1;
        if (this.keys.backward) moveDir.z += 1;
        if (this.keys.left) moveDir.x -= 1;
        if (this.keys.right) moveDir.x += 1;
        moveDir.normalize();

        const yaw = this.rotation.y;
        this.velocity.x = (moveDir.x * Math.cos(yaw) - moveDir.z * Math.sin(yaw)) * this.speed;
        this.velocity.z = (moveDir.x * Math.sin(yaw) + moveDir.z * Math.cos(yaw)) * this.speed;

        if (!this.onGround) {
            this.velocity.y -= this.gravity * delta;
        } else if (this.keys.jump) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }

        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.position.z += this.velocity.z * delta;

        const groundLevel = 1.0;
        if (this.position.y <= groundLevel) {
            this.position.y = groundLevel;
            this.velocity.y = 0;
            this.onGround = true;
        }

        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.rotation.y;
            this.mesh.visible = (this.viewMode !== 0);
        }

        this.updateCamera();
    }

    updateCamera() {
        if (!this.camera) return;

        const eyePos = this.position.clone();
        eyePos.y += 1.6;

        if (this.viewMode === 0) {
            this.camera.position.copy(eyePos);
            this.camera.rotation.copy(this.rotation);
        } else {
            const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);

            if (this.viewMode === 1) {
                const camPos = eyePos.clone().sub(forwardDir.clone().multiplyScalar(this.cameraDistance));
                this.camera.position.copy(camPos);
                this.camera.lookAt(eyePos);
            } else if (this.viewMode === 2) {
                const camPos = eyePos.clone().add(forwardDir.clone().multiplyScalar(this.cameraDistance));
                this.camera.position.copy(camPos);
                this.camera.lookAt(eyePos);
            }
        }
    }
}
