    this.camera = camera;
        this.mapGenerator = mapGenerator;

        // Position & Movement Vectors
        this.position = new THREE.Vector3(0, 10, 0);
        // Spawn high above map so you land safely on top of grass (Y = 22)
        this.position = new THREE.Vector3(0, 22, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        this.speed = 8.0;
        this.jumpForce = 12.0;
        this.gravity = 30.0;
        this.gravity = 28.0;
        this.onGround = false;

        // Camera Modes: 0 = 1st Person | 1 = 3rd Person (Back) | 2 = 2nd Person (Front)
        this.viewMode = 0; 
        this.cameraDistance = 4.5;
        // Camera Modes: 0 = 1st Person | 1 = 3rd Person Back | 2 = 2nd Person Front
        this.viewMode = 1; // Default to 3rd Person so you can see jergplr.glb immediately!
        this.cameraDistance = 5.0;

        // Key Input Tracking
        this.keys = { forward: false, backward: false, left: false, right: false, jump: false };

        // Mesh Setup
        this.mesh = null;
        this.createFallbackModel(); // Creates a model immediately so you are never invisible!
        this.loadModel();           // Tries to replace it with jergplr.glb if available

        this.loadModel();
        this.setupInputs();
    }

    // --- 1. FALLBACK MODEL (Ensures you are NEVER invisible) ---
    createFallbackModel() {
        this.mesh = new THREE.Group();

        // Simple placeholder matching your Blender sphere design
        const mat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5 });
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), mat);
        head.position.y = 1.4;
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), mat);
        body.position.y = 0.5;

        this.mesh.add(head);
        this.mesh.add(body);
        this.scene.add(this.mesh);
    }

    // --- 2. LOAD YOUR CUSTOM BLENDER GLB MODEL ---
    // --- LOAD GLB MODEL ---
    loadModel() {
        const loader = new GLTFLoader();
        loader.load(
            'Assets/jergplr.glb',
            (gltf) => {
                // Remove fallback model and swap to custom GLB
                if (this.mesh) this.scene.remove(this.mesh);

                this.mesh = gltf.scene;
                this.mesh.scale.set(0.8, 0.8, 0.8);
                this.mesh.scale.set(1.0, 1.0, 1.0);

                this.mesh.traverse((child) => {
                    if (child.isMesh) {
@@ -68,16 +47,28 @@ export class Player {
                });

                this.scene.add(this.mesh);
                console.log("✅ jergplr.glb loaded successfully!");
                console.log("✅ Assets/jergplr.glb loaded into world!");
            },
            undefined,
            (err) => {
                console.warn("⚠️ Using fallback model (jergplr.glb not found at Assets/jergplr.glb)");
                console.warn("⚠️ Could not find Assets/jergplr.glb. Creating placeholder spheres...");
                this.createPlaceholder();
            }
        );
    }

    // --- 3. INPUT EVENT LISTENERS ---
    createPlaceholder() {
        this.mesh = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), mat);
        head.position.y = 1.2;
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), mat);
        body.position.y = 0.4;
        this.mesh.add(head);
        this.mesh.add(body);
        this.scene.add(this.mesh);
    }

    setupInputs() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyW') this.keys.forward = true;
@@ -86,11 +77,9 @@ export class Player {
            if (e.code === 'KeyD') this.keys.right = true;
            if (e.code === 'Space') this.keys.jump = true;

            // Camera Mode Toggle Hotkey ]
            // Toggle Camera Perspective with ]
            if (e.code === 'BracketRight') {
                this.viewMode = (this.viewMode + 1) % 3;
                const modes = ["1st Person", "3rd Person (Back)", "2nd Person (Front)"];
                console.log(`🎥 Mode: ${modes[this.viewMode]}`);
            }
        });

@@ -103,96 +92,79 @@ export class Player {
        });

        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.body || document.pointerLockElement === this.camera.domElement) {
                const sensitivity = 0.002;
                this.rotation.y -= e.movementX * sensitivity;
                this.rotation.x -= e.movementY * sensitivity;
            if (document.pointerLockElement) {
                const sens = 0.002;
                this.rotation.y -= e.movementX * sens;
                this.rotation.x -= e.movementY * sens;
                this.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.rotation.x));
            }
        });
    }

    // --- 4. GAME TICK & PHYSICS LOOP ---
    update(delta) {
        if (!delta || delta > 0.1) delta = 0.016;

        // Calculate Movement Direction
        // Movement Vectors
        const moveDir = new THREE.Vector3(0, 0, 0);
        if (this.keys.forward) moveDir.z -= 1;
        if (this.keys.backward) moveDir.z += 1;
        if (this.keys.left) moveDir.x -= 1;
        if (this.keys.right) moveDir.x += 1;
        moveDir.normalize();

        const bodyYaw = this.rotation.y;
        const moveX = moveDir.x * Math.cos(bodyYaw) - moveDir.z * Math.sin(bodyYaw);
        const moveZ = moveDir.x * Math.sin(bodyYaw) + moveDir.z * Math.cos(bodyYaw);
        const yaw = this.rotation.y;
        this.velocity.x = (moveDir.x * Math.cos(yaw) - moveDir.z * Math.sin(yaw)) * this.speed;
        this.velocity.z = (moveDir.x * Math.sin(yaw) + moveDir.z * Math.cos(yaw)) * this.speed;

        this.velocity.x = moveX * this.speed;
        this.velocity.z = moveZ * this.speed;

        // Gravity & Jumping
        // Gravity
        if (!this.onGround) {
            this.velocity.y -= this.gravity * delta;
        } else if (this.keys.jump) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }

        // Apply Positions
        // Apply Position
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.position.z += this.velocity.z * delta;

        // --- FIXED GROUND COLLISION (TOUCH THE GRASS) ---
        // Sets feet level directly on top of the block layer (Y = 1.0)
        const groundLevel = 1.0; 
        if (this.position.y <= groundLevel) {
            this.position.y = groundLevel;
        // Ground Collision against Island Height
        const islandTopY = this.mapGenerator ? this.mapGenerator.getTerrainHeight(th
