import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.model = null;
        this.speed = 0.15;
        this.keys = { w: false, a: false, s: false, d: false };
        
        this.cameraMode = 'third'; 
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ'); 
        this.mouseSensitivity = 0.002;

        // FIX: Create the fallback visual immediately so the game doesn't look empty
        this.createFallbackMesh();
        
        this.initInput();
        this.loadModel();
    }

    loadModel() {
        const loader = new GLTFLoader();
        // Tries to grab the model from the root folder
        loader.load('../jergplr.glb', (gltf) => {
            // If it finds the file, swap the fallback box out for the real model
            if (this.model) this.scene.remove(this.model);
            
            this.model = gltf.scene;
            this.model.position.set(5, 1, 5);
            this.scene.add(this.model);
            console.log("Player model jergplr.glb loaded successfully!");
        }, undefined, (error) => {
            console.warn("Could not find jergplr.glb in root folder. Keeping box fallback.", error);
        });
    }

    createFallbackMesh() {
        const geo = new THREE.BoxGeometry(0.8, 1.8, 0.8);
        const mat = new THREE.MeshLambertMaterial({ color: 0x00a8ff });
        this.model = new THREE.Mesh(geo, mat);
        this.model.position.set(5, 1, 5);
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
            if (e.key.toLowerCase() in this.keys) this.keys[e.key.toLowerCase()] = true;
            if (e.key === ']') {
                this.cameraMode = this.cameraMode === 'third' ? 'first' : 'third';
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key.toLowerCase() in this.keys) this.keys[e.key.toLowerCase()] = false;
        });

        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement !== document.getElementById('gameCanvas')) return;
            this.rotation.y -= e.movementX * this.mouseSensitivity;
            this.rotation.x -= e.movementY * this.mouseSensitivity;
            this.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.rotation.x));
        });
    }

    update() {
        if (!this.model) return;

        this.model.rotation.y = this.rotation.y;

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.model.quaternion).normalize();
        const side = new THREE.Vector3(1, 0, 0).applyQuaternion(this.model.quaternion).normalize();

        if (this.keys.w) this.model.position.addScaledVector(forward, this.speed);
        if (this.keys.s) this.model.position.addScaledVector(forward, -this.speed);
        if (this.keys.d) this.model.position.addScaledVector(side, this.speed);
        if (this.keys.a) this.model.position.addScaledVector(side, -this.speed);

        if (this.cameraMode === 'first') {
            this.camera.position.set(this.model.position.x, this.model.position.y + 0.8, this.model.position.z);
            const lookTarget = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation).add(this.camera.position);
            this.camera.lookAt(lookTarget);
            this.model.visible = false;
        } else {
            const offset = new THREE.Vector3(0, 5, 8).applyEuler(new THREE.Euler(0, this.rotation.y, 0));
            this.camera.position.copy(this.model.position).add(offset);
            this.camera.lookAt(this.model.position.x, this.model.position.y + 1, this.model.position.z);
            this.model.visible = true;
        }
    }
}
