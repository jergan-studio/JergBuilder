import * as THREE from 'three';

export class Player {
    constructor(scene, camera, mapGenerator) {
        this.scene = scene;
        this.camera = camera;
        this.mapGenerator = mapGenerator;

        // View Modes: 0 = First Person, 1 = 3rd Person Back, 2 = 2nd Person (Front)
        this.viewMode = 0; 
        this.cameraDistance = 4.0; // Distance behind/in front of player

        this.position = new THREE.Vector3(0, 10, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        this.setupCameraToggle();
    }

    setupCameraToggle() {
        window.addEventListener('keydown', (e) => {
            // Check for ']' key (BracketRight)
            if (e.code === 'BracketRight') {
                this.viewMode = (this.viewMode + 1) % 3;
                
                const modeNames = ["First Person", "3rd Person (Back)", "2nd Person (Front View)"];
                console.log(`🎥 Camera Mode: ${modeNames[this.viewMode]}`);
            }
        });
    }

    updateCamera() {
        if (!this.camera) return;

        if (this.viewMode === 0) {
            // First Person View
            this.camera.position.copy(this.position);
        } else {
            // Calculate direction vector based on camera rotation
            const dir = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);

            if (this.viewMode === 1) {
                // 3rd Person View (Camera Behind)
                const targetPos = this.position.clone().sub(dir.multiplyScalar(this.cameraDistance));
                this.camera.position.copy(targetPos);
            } else if (this.viewMode === 2) {
                // 2nd Person View (Camera in Front Facing Player)
                const targetPos = this.position.clone().add(dir.multiplyScalar(this.cameraDistance));
                this.camera.position.copy(targetPos);
            }
        }
    }

    update(delta) {
        // Run physics / movement updates here...

        // Keep camera updated according to selected view mode
        this.updateCamera();
    }
}
