import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        this.pitchEuler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.speed = 5.0;
        this.jumpForce = 7.0;
        this.gravity = 22.0;
        this.isGrounded = true;

        this.playerGroup = new THREE.Group();
        this.scene.add(this.playerGroup);

        // STICKING TO FIRST PERSON LOOK: Lock camera at eye height level
        this.camera.position.set(0, 1.8, 0);
        this.camera.rotation.set(0, 0, 0);
        this.pitchEuler.setFromQuaternion(this.camera.quaternion);
        
        this.playerGroup.position.copy(this.camera.position);

        this.keys = { w: false, a: false, s: false, d: false };
        this.setupKeyboardListeners();
        this.setupMouseLook();

        // Load the custom 3D model asset directly via GLTFLoader
        this.loadCustomGLBModel();
    }

    loadCustomGLBModel() {
        const loader = new GLTFLoader();
        // Pointing to your official jergplr asset path
        loader.load('https://github.com/jergan-studio/JergBuilder/blob/main/Assets/jergplr.glb?raw=true', 
            (gltf) => {
                this.customMesh = gltf.scene;
                
                // Scale the custom model down to player human dimensions if necessary
                this.customMesh.scale.set(1, 1, 1);
                
                // Sit model directly underneath camera position coordinates
                this.customMesh.position.set(0, -1.8, 0);
                
                this.playerGroup.add(this.customMesh);
                console.log("JergBuilder custom player glb model loaded successfully.");
            },
            undefined,
            (error) => {
                console.warn("Failed to retrieve custom .glb asset profile, defaulting to backup box bounds:", error);
                // Fallback box bounds in case network loading is interrupted
                const fallbackGeo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
                const fallbackMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
                this.customMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
                this.customMesh.position.y = -0.9;
                this.playerGroup.add(this.customMesh);
            }
        );
    }

    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'w') this.keys.w = true;
            if (e.key.toLowerCase() === 'a') this.keys.a = true;
            if (e.key.toLowerCase() === 's') this.keys.s = true;
            if (e.key.toLowerCase() === 'd') this.keys.d = true;
            if (e.key === ' ') this.jump();
        });

        window.addEventListener('keyup', (e) => {
            if (e.key.toLowerCase() === 'w') this.keys.w = false;
            if (e.key.toLowerCase() === 'a') this.keys.a = false;
            if (e.key.toLowerCase() === 's') this.keys.s = false;
            if (e.key.toLowerCase() === 'd') this.keys.d = false;
        });
    }

    setupMouseLook() {
        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.getElementById('gameCanvas')) {
                this.pitchEuler.y -= e.movementX * 0.0025;
                this.pitchEuler.x -= e.movementY * 0.0025;
                this.pitchEuler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitchEuler.x));
                
                // Rotates looking frame of reference natively
                this.camera.quaternion.setFromEuler(this.pitchEuler);
                
                // Rotate the player model's body horizontally to match the look vector
                if (this.customMesh) {
                    this.customMesh.rotation.y = this.pitchEuler.y;
                }
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement === document.getElementById('gameCanvas')) {
                if (e.button === 0 || e.button === 2) {
                    this.placeBlock();
                }
            }
        });
    }

    jump() {
        if (this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
        }
    }

    placeBlock() {
        const raycaster = new THREE.Raycaster();
        const centerScreen = new THREE.Vector2(0, 0); 
        raycaster.setFromCamera(centerScreen, this.camera);

        const intersects = raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const hit = intersects[0];
            if (hit.distance < 6) {
                const newBlockPos = new THREE.Vector3()
                    .copy(hit.point)
                    .add(hit.face.normal.clone().multiplyScalar(0.5))
                    .floor()
                    .addScalar(0.5); 

                const placedGeo = new THREE.BoxGeometry(1, 1, 1);
                const placedMat = new THREE.MeshLambertMaterial({ color: 0xd7ccc8 }); // Clean Tan Color Block Node
                const newMesh = new THREE.Mesh(placedGeo, placedMat);
                
                newMesh.position.copy(newBlockPos);
                this.scene.add(newMesh);
            }
        }
    }

    update(delta) {
        if (!delta) delta = 0.016;

        this.velocity.y -= this.gravity * delta;
        this.camera.position.y += this.velocity.y * delta;

        // Keep player standing perfectly on the map floor layer plane
        if (this.camera.position.y <= 1.8) {
            this.velocity.y = 0;
            this.camera.position.y = 1.8;
            this.isGrounded = true;
        }

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        forward.y = 0; right.y = 0;
        forward.normalize(); right.normalize();

        this.direction.z = Number(this.keys.w) - Number(this.keys.s);
        this.direction.x = Number(this.keys.d) - Number(this.keys.a);
        this.direction.normalize();

        if (this.keys.w || this.keys.s) {
            this.camera.position.addScaledVector(forward, this.direction.z * this.speed * delta);
        }
        if (this.keys.a || this.keys.d) {
            this.camera.position.addScaledVector(right, this.direction.x * this.speed * delta);
        }

        // Keep player body group locked perfectly matching camera position updates
        this.playerGroup.position.copy(this.camera.position);
    }
}
