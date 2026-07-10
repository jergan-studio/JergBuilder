import * as THREE from 'three';

// Procedural World Shader Material Generation with Dynamic Edge Highlighting
export function createWorldShaderMaterial(baseColorHex) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uBaseColor: { value: new THREE.Color(baseColorHex) },
            uLightDirection: { value: new THREE.Vector3(10, 20, 10).normalize() }
        },
        
        // Vertex Shader: Translates structural matrices into relative viewport layouts
        vertexShader: `
            uniform float uTime;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec4 vWorldPosition;

            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition;
                
                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `,

        // Fragment Shader: Calculates per-pixel Lambertian shading and outline shadows
        fragmentShader: `
            uniform vec3 uBaseColor;
            uniform vec3 uLightDirection;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec4 vWorldPosition;

            void main() {
                // 1. Standard Diffuse Lambert Lighting Multipliers
                float dotProduct = dot(vNormal, uLightDirection);
                float lightIntensity = max(dotProduct, 0.0);
                
                float ambientValue = 0.45; 
                vec3 lightingResult = uBaseColor * (lightIntensity * 0.75 + ambientValue);

                // 2. Stylized Cell Voxel Ambient Occlusion Border Highlight Frame
                float edgeSize = 0.465;
                if (abs(vPosition.x) > edgeSize || abs(vPosition.y) > edgeSize || abs(vPosition.z) > edgeSize) {
                    lightingResult *= 0.82; // Darken local block borders cleanly
                }

                gl_FragColor = vec4(lightingResult, 1.0);
            }
        `
    });
}

// Main generation routing logic loop
export function generateMap(scene, type) {
    // Clean out existing voxel blocks from the previous map generation to prevent stacking leaks
    const existingBlocks = [];
    scene.traverse((child) => {
        if (child.isMesh && child !== scene.children[0] && !child.loaderObj) { 
            // Ensures we do not delete ambient lights or player geometries
            existingBlocks.push(child);
        }
    });
    existingBlocks.forEach(block => scene.remove(block));

    // Colors mapping setup
    const grassColor = 0x557a2b;
    const dirtColor = 0x866043;
    const stoneColor = 0x737373;

    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    const mapSize = 16; // 16x16 chunk sizes

    if (type === 'flat') {
        // --- FLAT WORLD GENERATION ---
        for (let x = 0; x < mapSize; x++) {
            for (let z = 0; z < mapSize; z++) {
                // Layer 0: Bedrock/Stone
                const stoneMat = createWorldShaderMaterial(stoneColor);
                const stoneBlock = new THREE.Mesh(blockGeometry, stoneMat);
                stoneBlock.position.set(x, 0, z);
                scene.add(stoneBlock);

                // Layer 1: Dirt
                const dirtMat = createWorldShaderMaterial(dirtColor);
                const dirtBlock = new THREE.Mesh(blockGeometry, dirtMat);
                dirtBlock.position.set(x, 1, z);
                scene.add(dirtBlock);

                // Layer 2: Surface Grass Top
                const grassMat = createWorldShaderMaterial(grassColor);
                const grassBlock = new THREE.Mesh(blockGeometry, grassMat);
                grassBlock.position.set(x, 2, z);
                scene.add(grassBlock);
            }
        }
        console.log("Flat custom-shaded shader world generated!");
    } else if (type === 'hills') {
        // --- HILLY WORLD GENERATION ---
        for (let x = 0; x < mapSize; x++) {
            for (let z = 0; z < mapSize; z++) {
                // Procedural Sine/Cosine wave algorithm calculation simulating smooth hills elevations
                const height = Math.floor(Math.sin(x * 0.4) * 2 + Math.cos(z * 0.4) * 2 + 3);

                for (let y = 0; y <= height; y++) {
                    let chosenColor = dirtColor;
                    
                    if (y === height) {
                        chosenColor = grassColor; // Very top block gets grass coating
                    } else if (y < height - 2) {
                        chosenColor = stoneColor; // Deep underground gets stone look
                    }

                    const blockMat = createWorldShaderMaterial(chosenColor);
                    const hillBlock = new THREE.Mesh(blockGeometry, blockMat);
                    hillBlock.position.set(x, y, z);
                    scene.add(hillBlock);
                }
            }
        }
        console.log("Hilly custom-shaded shader world generated!");
    }
}
