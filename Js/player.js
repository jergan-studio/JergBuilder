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

        // Fix the black texture bug by enabling anonymous CORS access
        this.textureLoader = new THREE.TextureLoader();
        this.textureLoader.crossOrigin = 'anonymous'; // <-- CRITICAL FIX FOR BLACK BLOCKS
        
        this.grassTexture = this.textureLoader.load('https://github.com/jergan-studio/JergBuilder/blob/main/Assets/Grass.png?raw=true');
        
        // Keep the texture crisp and pixelated
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
                
                // Set placed blocks to a clean, flat tan color hex (0xd7ccc8)
                const placedMat = new THREE.MeshLambertMaterial({ color: 0xd7ccc8 });
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
