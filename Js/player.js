import * as THREE from 'three';

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        this.position = new THREE.Vector3(0, 5, 0);
        this.velocity = new THREE.Vector3();
        this.camera.position.copy(this.position);

        this.moveSpeed = 12;
        this.jumpForce = 12;
        this.gravity = 32;
        this.isGrounded = false;

        this.keys = { forward: false, backward: false, left: false, right: false, jump: false };

        this.pitch = 0;
        this.yaw = 0;

        this.setupControls();
    }

    setupControls() {
        window.addEventListener('keydown', (e) => this.updateKey(e.code, true));
        window.addEventListener('keyup', (e) => this.updateKey(e.code, false));

        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.yaw -= e.movementX * 0.002;
                this.pitch -= e.movementY * 0.002;
                this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
            }
        });
    }

    updateKey(code, isPressed) {
        switch (code) {
            case 'KeyW': case 'ArrowUp': this.keys.forward = isPressed; break;
            case 'KeyS': case 'ArrowDown': this.keys.backward = isPressed; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = isPressed; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = isPressed; break;
            case 'Space': this.keys.jump = isPressed; break;
        }
    }

    update(delta) {
        const moveDir = new THREE.Vector3();

        if (this.keys.forward) moveDir.z -= 1;
        if (this.keys.backward) moveDir.z += 1;
        if (this.keys.left) moveDir.x -= 1;
        if (this.keys.right) moveDir.x += 1;

        moveDir.normalize();

        const euler = new THREE.Euler(0, this.yaw, 0, 'YXZ');
        moveDir.applyEuler(euler);

        this.velocity.x = moveDir.x * this.moveSpeed;
        this.velocity.z = moveDir.z * this.moveSpeed;

        if (this.isGrounded) {
            this.velocity.y = 0;
            if (this.keys.jump) {
                this.velocity.y = this.jumpForce;
                this.isGrounded = false;
            }
        } else {
            this.velocity.y -= this.gravity * delta;
        }

        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.position.z += this.velocity.z * delta;

        // Ground floor detection
        if (this.position.y <= 2) {
            this.position.y = 2;
            this.isGrounded = true;
        }

        this.camera.position.copy(this.position);
        this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    }
}
