import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera, mapGenerator, modLoader = null) {
        this.scene = scene;
        this.camera = camera;
        this.mapGenerator = mapGenerator;
        this.modLoader = modLoader;

        // Player Physical Dimensions
        this.scale = 0.5;
        this.width = 0.6 * this.scale;
        this.height = 1.8 * this.scale;
        this.eyeHeight = 1.6 * this.scale;

        this.position = new THREE.Vector3(0, 20, 0);
        this.velocity = new THREE.Vector3();

        // Movement Settings
        this.moveSpeed = 8;
        this.jumpForce = 10;
        this.gravity = 28;
        this.isGrounded = false;

        // Camera / View Mode
        this.isThirdPerson = false;
        this.thirdPersonDistance = 4;

        // Inventory Selection (1-8)
        this.selectedSlot = 1;
        this.slotMaterials = {
            1: 'grass',
            2: 'dirt',
            3: 'stone',
            4: 'water',
            5: 'red',
            6: 'green',
            7: 'blue',
            8: 'yellow'
        };

        this.keys = { forward: false, backward: false, left: false, right: false, jump: false };
        this.pitch = 0;
        this.yaw = 0;

        this.raycaster = new THREE.Raycaster();
        this.reachDistance = 8;

        this.model = null;
        this.loadPlayerModel();
        this.setupControls();
        this.setupBuildingControls();
    }

    loadPlayerModel() {
        const loader = new GLTFLoader();
        const modelUrl = 'https://raw.githubusercontent.com/jergan-studio/JergBuilder/main/jergplr.glb';

        loader.load(modelUrl, (gltf) => {
            this.model = gltf.scene;
            this.model.scale.set(this.scale, this.scale, this.scale);
            this.scene.add(this.model);
            this.model.visible = this.isThirdPerson;
        }, undefined, (error) => console.warn("GLB model failed to load:", error));
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.updateKey(e.code, true);

            // Hotbar selection keys 1 to 8
            if (e.key >= '1' && e.key <= '8') {
                this.selectedSlot = parseInt(e.key);
                console.log(`📦 Selected Slot ${this.selectedSlot}: ${this.slotMaterials[this.selectedSlot]}`);
            }

            // Toggle Third-Person Camera with "[" key
            if (e.code === 'BracketLeft' || e.key === '[') {
                e.preventDefault();
                this.isThirdPerson = !this.isThirdPerson;
                if (this.model) this.model.visible = this.isThirdPerson;
            }
        });

        window.addEventListener('keyup', (e) => this.updateKey(e.code, false));

        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.yaw -= e.movementX * 0.002;
                this.pitch -= e.movementY * 0.002;
                this.pitch = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, this.pitch));
            }
        });
    }

    setupBuildingControls() {
        window.addEventListener('mousedown', (e) => {
            if (!document.pointerLockElement) return;

            const lookData = this.getLookAtBlock();
            if (!lookData) return;

            if (e.button === 0) {
                // Left Click: Break Block
                const { targetBlock } = lookData;
                this.mapGenerator.removeBlock(targetBlock.x, targetBlock.y, targetBlock.z);

                // Mod Hook
                if (this.modLoader) {
                    this.modLoader.trigger('onBlockBreak', targetBlock, this);
                }
            } else if (e.button === 2) {
                // Right Click: Place Block
                const { placeBlock } = lookData;
                const matKey = this.slotMaterials[this.selectedSlot] || 'grass';
                const mat = this.mapGenerator.materials[matKey] || this.mapGenerator.materials.grass;

                const placedBlock = this.mapGenerator.addBlock(placeBlock.x, placeBlock.y, placeBlock.z, mat);

                // Mod Hook
                if (this.modLoader && placedBlock) {
                    this.modLoader.trigger('onBlockPlace', placeBlock, matKey, this);
                }
            }
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());
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

    getTerrainMeshes() {
        if (this.mapGenerator && Array.isArray(this.mapGenerator.worldBlocks)) {
            return this.mapGenerator.worldBlocks;
        }
        return [];
    }

    getLookAtBlock() {
        const meshes = this.getTerrainMeshes();
        if (meshes.length === 0) return null;

        const headPosition = new THREE.Vector3(
            this.position.x,
            this.position.y + this.eyeHeight,
            this.position.z
        );

        const lookDir = new THREE.Vector3(0, 0, -1);
        lookDir.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));

        this.raycaster.set(headPosition, lookDir);
        this.raycaster.far = this.reachDistance;

        const intersects = this.raycaster.intersectObjects(meshes, true);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const point = hit.point;
            const normal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);

            if (hit.object) {
                normal.applyQuaternion(hit.object.getWorldQuaternion(new THREE.Quaternion()));
            }

            const targetBlock = new THREE.Vector3(
                Math.floor(point.x - normal.x * 0.4),
                Math.floor(point.y - normal.y * 0.4),
                Math.floor(point.z - normal.z * 0.4)
            );

            const placeBlock = new THREE.Vector3(
                Math.floor(point.x + normal.x * 0.4),
                Math.floor(point.y + normal.y * 0.4),
                Math.floor(point.z + normal.z * 0.4)
            );

            return { targetBlock, placeBlock, hit };
        }

        return null;
    }

    resolveCollisions() {
        const meshes = this.getTerrainMeshes();
        if (meshes.length === 0) return;

        const halfW = this.width / 2;

        // Ground Check
        const footOffsets = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(halfW * 0.8, 0, halfW * 0.8),
            new THREE.Vector3(-halfW * 0.8, 0, halfW * 0.8),
            new THREE.Vector3(halfW * 0.8, 0, -halfW * 0.8),
            new THREE.Vector3(-halfW * 0.8, 0, -halfW * 0.8)
        ];

        let landed = false;

        for (let pt of footOffsets) {
            const rayOrigin = this.position.clone().add(pt);
            rayOrigin.y += 0.4;

            this.raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
            this.raycaster.far = 0.5;

            const hits = this.raycaster.intersectObjects(meshes, true);

            if (hits.length > 0 && this.velocity.y <= 0) {
                const hit = hits[0];
                this.position.y = hit.point.y;
                this.velocity.y = 0;
                this.isGrounded = true;
                landed = true;
                break;
            }
        }

        if (!landed) this.isGrounded = false;

        // Wall Collision Check
        const heights = [0.2, this.height * 0.5, this.height - 0.1];
        const directions = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1)
        ];

        for (let h of heights) {
            const center = this.position.clone();
            center.y += h;

            for (let dir of directions) {
                this.raycaster.set(center, dir);
                this.raycaster.far = halfW + 0.08;

                const hits = this.raycaster.intersectObjects(meshes, true);
                if (hits.length > 0) {
                    const hit = hits[0];
                    const overlap = (halfW + 0.08) - hit.distance;
                    this.position.sub(dir.clone().multiplyScalar(overlap));
                }
            }
        }
    }

    update(delta) {
        const moveDir = new THREE.Vector3();
        if (this.keys.forward) moveDir.z -= 1;
        if (this.keys.backward) moveDir.z += 1;
        if (this.keys.left) moveDir.x -= 1;
        if (this.keys.right) moveDir.x += 1;

        moveDir.normalize();
        moveDir.applyEuler(new THREE.Euler(0, this.yaw, 0, 'YXZ'));

        this.velocity.x = moveDir.x * this.moveSpeed;
        this.velocity.z = moveDir.z * this.moveSpeed;

        if (this.isGrounded && this.keys.jump) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
        }

        this.velocity.y -= this.gravity * delta;

        // Anti-tunneling physics sub-stepping
        const steps = Math.max(1, Math.ceil(Math.abs(this.velocity.y * delta) / 0.2));
        const subDelta = delta / steps;

        for (let i = 0; i < steps; i++) {
            this.position.x += (this.velocity.x * subDelta);
            this.position.z += (this.velocity.z * subDelta);
            this.position.y += (this.velocity.y * subDelta);

            this.resolveCollisions();
        }

        // Void Respawn
        if (this.position.y <= -30) {
            this.position.set(0, 20, 0);
            this.velocity.set(0, 0, 0);
        }

        if (this.model) {
            this.model.position.copy(this.position);
            this.model.rotation.y = this.yaw;
            this.model.visible = this.isThirdPerson;
        }

        const headPosition = new THREE.Vector3(
            this.position.x,
            this.position.y + this.eyeHeight,
            this.position.z
        );

        if (this.isThirdPerson) {
            const cameraOffset = new THREE.Vector3(0, 0, this.thirdPersonDistance);
            cameraOffset.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
            this.camera.position.copy(headPosition).add(cameraOffset);
            this.camera.lookAt(headPosition);
        } else {
            this.camera.position.copy(headPosition);
            this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
        }

        // Trigger Mod Loader Player Tick
        if (this.modLoader) {
            this.modLoader.trigger('onPlayerTick', this, delta);
        }
    }
}
