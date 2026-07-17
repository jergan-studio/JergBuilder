import * as THREE from 'three';

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
        this.createPlayerMesh();
        this.scene.add(this.playerGroup);

        this.camera.position.set(0, 2, 0);
        this.camera.rotation.set(0, 0, 0);
        this.pitchEuler.setFromQuaternion(this.camera.quaternion);
        
        this.playerGroup.position.copy(this.camera.position);

        this.keys = { w: false, a: false, s: false, d: false };
        this.setupKeyboardListeners();
        this.setupMouseLook();

        // Pre-load the official JergBuilder grass texture asset
        this.textureLoader = new THREE.TextureLoader();
        this.grassTexture = this.textureLoader.load('https://github.com/jergan-studio/JergBuilder/blob/main/Assets/Grass.png?raw=true');
        
        // Keep the texture crisp and blocky (pixel art style)
        this.grassTexture.magFilter = THREE.NearestFilter;
        this.grassTexture.minFilter = THREE.NearestFilter;
    }

    createPlayerMesh() {
        const bodyGeo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
        this.bodyMat = new THREE.MeshLambertMaterial({ color: 0x555555 }); 
        this.mesh = new THREE.Mesh(bodyGeo, this.bodyMat);
        this.mesh.position.y = 0.9;
        this.playerGroup.add(this.mesh);
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
                this.camera.quaternion.setFromEuler(this.pitchEuler);
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
                
                // Use the loaded texture directly for the material
                const placedMat = new THREE.MeshLambertMaterial({ map: this.grassTexture });
                const newMesh = new THREE.Mesh(placedGeo, placedMat);
                
                newMesh.position.copy(newBlockPos);
                this.scene.add(newMesh);
            }
        }
    }

    setSkin(skinType, customUrl = null) {
        if (!this.bodyMat) return;

        if (skinType === 'default') {
            this.bodyMat.map = null;
            this.bodyMat.color.setHex(0x555555); 
            this.bodyMat.needsUpdate = true;
        } else if (skinType === 'red') {
            this.bodyMat.map = null;
            this.bodyMat.color.setHex(0xff2222); 
            this.bodyMat.needsUpdate = true;
        } else if (skinType === 'blue') {
            this.bodyMat.map = null;
            this.bodyMat.color.setHex(0x2222ff); 
            this.bodyMat.needsUpdate = true;
        } else if (skinType === 'custom' && customUrl) {
            this.textureLoader.load(customUrl, (texture) => {
                this.bodyMat.color.setHex(0xffffff); 
                this.bodyMat.map = texture;
                this.bodyMat.needsUpdate = true;
            });
        }
    }

    update(delta) {
        if (!delta) delta = 0.016;

        this.velocity.y -= this.gravity * delta;
        this.camera.position.y += this.velocity.y * delta;

        if (this.camera.position.y <= 2.0) {
            this.velocity.y = 0;
            this.camera.position.y = 2.0;
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

        this.playerGroup.position.copy(this.camera.position);
        this.playerGroup.position.y -= 1.1; 
    }
}
