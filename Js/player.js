import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.model = null;
        this.speed = 0.12;
        this.keys = { w: false, a: false, s: false, d: false, ' ': false }; // Added space tracking
        
        this.cameraMode = 'third'; 
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ'); 
        this.mouseSensitivity = 0.002;

        // Physics variables
        this.velocity = new THREE.Vector3();
        this.gravity = -0.015;
        this.jumpForce = 0.35;
        this.isGrounded = false;
        this.playerHeight = 1.2; // Fixed smaller height bound

        this.createFallbackMesh();
        this.initInput();
        this.loadModel();
    }

    loadModel() {
        const loader = new GLTFLoader();
        loader.load('../jergplr.glb', (gltf) => {
            if (this.model) this.scene.remove(this.model);
            
            this.model = gltf.scene;
            
            // FIX: Scale down the player model so it isn't massive compared to 1x1x1 blocks
            this.model.scale.set(0.5, 0.5, 0.5); 
            
            this.model.position.set(5, 5, 5); // Start high in the sky to test gravity fall
            this.scene.add(this.model);
            console.log("Player model jergplr.glb loaded and downscaled!");
        }, undefined, (error) => {
            console.warn("Could not find jergplr.glb. Keeping smaller box fallback.", error);
        });
    }

    createFallbackMesh() {
        // FIX: Scaled down the box size to match the new small player proportions
        const geo = new THREE.BoxGeometry(0.5, this.playerHeight, 0.5);
        const mat = new THREE.MeshLambertMaterial({ color: 0x00a8ff });
        this.model = new THREE.Mesh(geo, mat);
        this.model.position.set(5, 5, 5);
        this.scene.add(this.model);
    }

    setSkin(skinName) {
        if (!this.model) return;
        let targetColor = 0xffffff;
        let texturePath = null;
        if (skinName === 'red') targetColor = 0xff3333;
        if (skinName === 'blue') targetColor = 0x3333ff;
        if (skinName !== 'default') texturePath = `../assets/PreSkins/${skinName}.png`;

        this.model.traverse((child) => {
            if (child.isMesh) {
                if (texturePath) {
                    child.material.map = new THREE.TextureLoader().load(texturePath);
                } else {
                    child.material.map = null;
                }
                child.material.color.setHex(targetColor);
                child.material.needsUpdate = true;
            }
        });
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) this.keys[key] = true;
            if (e.key === ' ') this.keys[' '] = true; // Handle explicit space tracking
            if (e.key === ']') {
                this.cameraMode = this.cameraMode === 'third' ? 'first' : 'third';
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) this.keys[key] = false;
            if (e.key === ' ') this.keys[' '] = false;
        });

        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement !== document.getElementById('gameCanvas')) return;
            this.rotation.y -= e.movementX * this.mouseSensitivity;
            this.rotation.x -= e.movementY * this.mouseSensitivity;
            this.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.rotation.x));
        });
    }

    // A simple, reliable voxel collision detection check down towards the ground
    checkGroundCollision() {
        // Build a downward pointing ray starting slightly inside the player center
        const raycaster = new THREE.Raycaster(
            new THREE.Vector3(this.model.position.x, this.model.position.y, this.model.position.z),
            new THREE.Vector3(0, -1, 0)
        );

        // Scan all objects currently sitting inside the active scene branch
        const intersects = raycaster.intersectObjects(this.scene.children);

        if (intersects.length > 0) {
            // Find the closest object below us
            const closestObject = intersects[0];
            
            // Calculate distance to the top surface of that block
            // Because player origin is in the center, target distance is half height
            const groundDistance = closestObject.distance;
            const separationLimit = this.playerHeight / 2;

            if (groundDistance <= separationLimit) {
                // Snap player perfectly to the surface top and stop falling down
                this.model.position.y += (separationLimit - groundDistance);
                this.velocity.y = 0;
                this.isGrounded = true;
                return;
            }
        }
        this.isGrounded = false;
    }

    update() {
        if (!this.model) return;

        this.model.rotation.y = this.rotation.y;

        // --- 1. HORIZONTAL MOVEMENT ---
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.model.quaternion).normalize();
        const side = new THREE.Vector3(1, 0, 0).applyQuaternion(this.model.quaternion).normalize();

        if (this.keys.w) this.model.position.addScaledVector(forward, this.speed);
        if (this.keys.s) this.model.position.addScaledVector(forward, -this.speed);
        if (this.keys.d) this.model.position.addScaledVector(side, this.speed);
        if (this.keys.a) this.model.position.addScaledVector(side, -this.speed);

        // --- 2. VERTICAL MOVEMENT (GRAVITY & JUMP) ---
        // Apply falling acceleration forces over active tick updates
        this.velocity.y += this.gravity;
        
        // Execute Jump only if player feet are planted firmly against solid ground meshes
        if (this.keys[' '] && this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
        }

        // Apply calculated frame movement shifts
        this.model.position.y += this.velocity.y;

        // Run Floor Collisions Engine Check
        this.checkGroundCollision();

        // Prevent falling out of the world boundaries endlessly if something glitchy happens
        if (this.model.position.y < -20) {
            this.model.position.set(5, 10, 5);
            this.velocity.y = 0;
        }

        // --- 3. CAMERA RIG UPDATES ---
        if (this.cameraMode === 'first') {
            this.camera.position.set(this.model.position.x, this.model.position.y + 0.4, this.model.position.z);
            const lookTarget = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation).add(this.camera.position);
            this.camera.lookAt(lookTarget);
            this.model.visible = false;
        } else {
            // Camera position shifted lower and closer to accommodate smaller player model scale
            const offset = new THREE.Vector3(0, 2.5, 4.5).applyEuler(new THREE.Euler(0, this.rotation.y, 0));
            this.camera.position.copy(this.model.position).add(offset);
            this.camera.lookAt(this.model.position.x, this.model.position.y + 0.2, this.model.position.z);
            this.model.visible = true;
        }
    }
}
