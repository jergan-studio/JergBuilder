import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.model = null;
        this.speed = 0.15;
        this.keys = { w: false, a: false, s: false, d: false };
        
        // Camera mode toggle: can be 'third' or 'first'
        this.cameraMode = 'third'; 

        this.initInput();
        this.loadModel();
    }

    loadModel() {
        const loader = new GLTFLoader();
        // Step up out of the 'Js' directory to grab your model from the root
        loader.load('../jergplr.glb', (gltf) => {
            if (this.model) this.scene.remove(this.model);
            
            this.model = gltf.scene;
            this.model.position.set(5, 1, 5); // Default starting position
            this.scene.add(this.model);
            console.log("Player model jergplr.glb successfully loaded!");
        }, undefined, (error) => {
            console.warn("Could not load jergplr.glb. Creating a colorful box fallback.", error);
            this.createFallbackMesh();
        });
    }

    createFallbackMesh() {
        if (this.model) this.scene.remove(this.model);
        const geo = new THREE.BoxGeometry(0.8, 1.8, 0.8);
        const mat = new THREE.MeshLambertMaterial({ color: 0x00a8ff });
        this.model = new THREE.Mesh(geo, mat);
        this.model.position.set(5, 1, 5);
        this.scene.add(this.model);
    }

    // Handles changing colors/textures dynamically from the menu selection
    setSkin(skinName) {
        if (!this.model) return;

        let targetColor = 0xffffff;
        let texturePath = null;

        if (skinName === 'red') targetColor = 0xff3333;
        if (skinName === 'blue') targetColor = 0x3333ff;

        // Custom image mapping logic for files inside /assets/PreSkins/
        if (skinName !== 'default') {
            texturePath = `../assets/PreSkins/${skinName}.png`;
        }

        this.model.traverse((child) => {
            if (child.isMesh) {
                if (texturePath) {
                    const textureLoader = new THREE.TextureLoader();
                    child.material.map = textureLoader.load(texturePath);
                } else {
                    child.material.map = null; // Clear out custom skins back to default glb paint
                }
                child.material.color.setHex(targetColor);
                child.material.needsUpdate = true;
            }
        });
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() in this.keys) this.keys[e.key.toLowerCase()] = true;
            
            // Toggle perspectives dynamically when clicking the ] key
            if (e.key === ']') {
                this.cameraMode = this.cameraMode === 'third' ? 'first' : 'third';
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key.toLowerCase() in this.keys) this.keys[e.key.toLowerCase()] = false;
        });
    }

    update() {
        if (!this.model) return;

        // Basic character translation controls
        if (this.keys.w) this.model.position.z -= this.speed;
        if (this.keys.s) this.model.position.z += this.speed;
        if (this.keys.a) this.model.position.x -= this.speed;
        if (this.keys.d) this.model.position.x += this.speed;

        // Camera rig attachments depending on camera mode status
        if (this.cameraMode === 'first') {
            // First person perspective
            this.camera.position.set(this.model.position.x, this.model.position.y + 0.8, this.model.position.z);
            this.camera.lookAt(this.model.position.x, this.model.position.y + 0.8, this.model.position.z - 10);
            this.model.visible = false; // Hide model so you don't look inside your own mesh geometry
        } else {
            // Third person perspective
            this.camera.position.set(this.model.position.x, this.model.position.y + 5, this.model.position.z + 8);
            this.camera.lookAt(this.model.position.x, this.model.position.y, this.model.position.z);
            this.model.visible = true; // Reveal model to player
        }
    }
}
