import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.speed = 0.1;
        this.keys = { w: false, a: false, s: false, d: false };
        
        this.initInput();
        this.loadModel();
    }

    loadModel() {
        const loader = new GLTFLoader();
        // Looks up one directory to find jergplr.glb in the root
        loader.load('../jergplr.glb', (gltf) => {
            this.model = gltf.scene;
            this.model.position.set(2, 1, 2); // Start position above the blocks
            this.scene.add(this.model);
            console.log("jergplr.glb loaded successfully into JergBuilder!");
        }, undefined, (error) => {
            console.error("Failed to load player model. Creating fallback box.", error);
            // Fallback box if the model path isn't live yet
            const geo = new THREE.BoxGeometry(1, 2, 1);
            const mat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
            this.model = new THREE.Mesh(geo, mat);
            this.model.position.set(2, 1, 2);
            this.scene.add(this.model);
        });
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            if(e.key.toLowerCase() in this.keys) this.keys[e.key.toLowerCase()] = true;
        });
        window.addEventListener('keyup', (e) => {
            if(e.key.toLowerCase() in this.keys) this.keys[e.key.toLowerCase()] = false;
        });
    }

    update() {
        if (!this.model) return;

        // Simple translation based on WASD keys
        if (this.keys.w) this.model.position.z -= this.speed;
        if (this.keys.s) this.model.position.z += this.speed;
        if (this.keys.a) this.model.position.x -= this.speed;
        if (this.keys.d) this.model.position.x += this.speed;
    }
}
