import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.model = null;
        this.speed = 0.12;
        this.keys = { w: false, a: false, s: false, d: false, ' ': false }; 
        
        this.cameraMode = 'third'; 
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ'); 
        this.mouseSensitivity = 0.002;

        this.velocity = new THREE.Vector3();
        this.gravity = -0.015;
        this.jumpForce = 0.35;
        this.isGrounded = false;
        this.playerHeight = 1.2;

        this.createFallbackMesh();
        this.initInput();
        this.loadModel();
    }

    loadModel() {
        const loader = new GLTFLoader();
        loader.load('../jergplr.glb', (gltf) => {
            if (this.model) this.scene.remove(this.model);
            this.model = gltf.scene;
            this.model.scale.set(0.5, 0.5, 0.5); 
            this.model.position.set(5, 5, 5);
            this.scene.add(this.model);
        }, undefined, (error) => {
            console.warn("Could not find jergplr.glb. Keeping fallback.", error);
        });
    }

    createFallbackMesh() {
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
            if (e.key === ' ') this.keys[' '] = true;
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

        // Listen for Left-Clicks to trigger block building
        window.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement !== document.getElementById('gameCanvas')) return;
            if (e.button === 0) { // 0 represents the left mouse click
                this.placeBlock();
            }
        });
    }

    placeBlock() {
        // Setup raycasting pointing directly out the front of the viewport lens
        const raycaster = new THREE.Raycaster();
        const centerScreen = new THREE.Vector2(0, 0); // Center coordinates in WebGL space
        raycaster.setFromCamera(centerScreen, this.camera);

        // Scan scene to find targets within standard builder range
        const intersects = raycaster.intersectObjects(this.scene.children);

        // Filter intersections so the player doesn't accidentally click themselves
        const targets = intersects.filter(intersect => intersect.object !== this.model && intersect.object.type === "Mesh");

        if (targets.length > 0) {
            const hit = targets[0];

            // Limit maximum building distance reach (e.g., 8 units away)
            if (hit.distance > 8) return;

            const targetBlock = hit.object;
            const normal = hit.face.normal; // Tells us exactly which side face of the block was clicked

            // Calculate the placement point by stepping 1 unit off the hit block's surface normal
            const newPos = new THREE.Vector3()
                .copy(targetBlock.position)
                .add(normal);

            // Fetch chosen building hex color value directly from UI input
            const chosenHexColor = document.getElementById('blockColor').value;

            // Generate the new block item instance
            const blockGeo = new THREE.BoxGeometry(1, 1, 1);
            const blockMat = new THREE.MeshLambertMaterial({ color: chosenHexColor });
            const newBlock = new THREE.Mesh(blockGeo, blockMat);
            
            newBlock.position.copy(newPos);
            this.scene.add(newBlock);
            console.log(`Placed block at X:${newPos.x} Y:${newPos.y} Z:${newPos.z}`);
        }
    }

    checkGroundCollision() {
        const raycaster = new THREE.Raycaster(
            new THREE.Vector3(this.model.position.x, this.model.position.y, this.model.position.z),
            new THREE.Vector3(0, -1, 0)
        );
        const intersects = raycaster.intersectObjects(this.scene.children);
        const targets = intersects.filter(intersect => intersect.object !== this.model);

        if (targets.length >
