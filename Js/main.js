import * as THREE from 'three';

// Advanced Procedural PBR Shader Material
export function createWorldShaderMaterial(baseColorHex, isMetallic = false) {
    // Define material properties based on block type
    const roughness = isMetallic ? 0.2 : 0.8;   // Smooth/shiny vs rough/matte
    const metalness = isMetallic ? 0.9 : 0.05;  // Metallic reflection vs dielectric

    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uBaseColor: { value: new THREE.Color(baseColorHex) },
            uLightDirection: { value: new THREE.Vector3(12, 24, 8).normalize() },
            uCameraPosition: { value: new THREE.Vector3(0, 0, 0) },
            uRoughness: { value: roughness },
            uMetalness: { value: metalness }
        },
        
        vertexShader: `
            uniform float uTime;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec3 vWorldPos;

            void main() {
                // Pass surface normal and local coordinates
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                
                // Track absolute world position for specular camera calculations
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPos = worldPosition.xyz;
                
                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `,

        fragmentShader: `
            uniform vec3 uBaseColor;
            uniform vec3 uLightDirection;
            uniform vec3 uCameraPosition;
            uniform float uRoughness;
            uniform float uMetalness;
            
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec3 vWorldPos;

            #define PI 3.14159265359

            // Cook-Torrance Microfacet PBR functions
            float DistributionGGX(vec3 N, vec3 H, float roughness) {
                float a = roughness * roughness;
                float a2 = a * a;
                float NdotH = max(dot(N, H), 0.0);
                float NdotH2 = NdotH * NdotH;
                float num = a2;
                float denom = (NdotH2 * (a2 - 1.0) + 1.0);
                denom = PI * denom * denom;
                return num / max(denom, 0.0000001);
            }

            float GeometrySchlickGGX(float NdotV, float roughness) {
                float r = (roughness + 1.0);
                float k = (r * r) / 8.0;
                float num = NdotV;
                float denom = NdotV * (1.0 - k) + k;
                return num / denom;
            }

            float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
                float NdotV = max(dot(N, V), 0.0);
                float NdotL = max(dot(N, L), 0.0);
                float ggx2 = GeometrySchlickGGX(NdotV, roughness);
                float ggx1 = GeometrySchlickGGX(NdotL, roughness);
                return ggx1 * ggx2;
            }

            vec3 fresnelSchlick(float cosTheta, vec3 F0) {
                return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
            }

            void main() {
                vec3 N = normalize(vNormal);
                vec3 V = normalize(uCameraPosition - vWorldPos);
                vec3 L = normalize(uLightDirection);
                vec3 H = normalize(V + L);

                // Base surface reflection rating (F0)
                vec3 F0 = vec3(0.04); 
                F0 = mix(F0, uBaseColor, uMetalness);

                // Reflectance calculations
                float NDF = DistributionGGX(N, H, uRoughness);   
                float G   = GeometrySmith(N, V, L, uRoughness);      
                vec3 F    = fresnelSchlick(max(dot(H, V), 0.0), F0);       
                
                vec3 kS = F;
                vec3 kD = vec3(1.0) - kS;
                kD *= 1.0 - uMetalness;     
                
                vec3 numerator    = NDF * G * F;
                float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
                vec3 specular = numerator / denominator;  
                    
                // Combine Diffuse and Specular light components
                float NdotL = max(dot(N, L), 0.0);                
                vec3 ambient = vec3(0.18) * uBaseColor;
                vec3 color = ambient + (kD * uBaseColor / PI + specular) * vec3(1.2) * NdotL;

                // Subtle stylized voxel border micro-shadow
                float edgeSize = 0.465;
                if (abs(vPosition.x) > edgeSize || abs(vPosition.y) > edgeSize || abs(vPosition.z) > edgeSize) {
                    color *= 0.88;
                }

                // HDR tone mapping and gamma correction
                color = color / (color + vec3(1.0));
                color = pow(color, vec3(1.0 / 2.2));  

                gl_FragColor = vec4(color, 1.0);
            }
        `
    });
}

// Map Layout Generator Function
export function generateMap(scene, type) {
    const existingBlocks = [];
    scene.traverse((child) => {
        if (child.isMesh && child !== scene.children[0] && !child.loaderObj) {
            existingBlocks.push(child);
        }
    });
    existingBlocks.forEach(block => scene.remove(block));

    // Material Color Hex Codes
    const grassColor = 0x557a2b;
    const dirtColor = 0x866043;
    const stoneColor = 0x6e7075;   // Stone will look slightly more metallic/reflective

    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    const mapSize = 16;

    if (type === 'flat') {
        for (let x = 0; x < mapSize; x++) {
            for (let z = 0; z < mapSize; z++) {
                // Stone Layer (Slightly metallic PBR properties)
                const stoneBlock = new THREE.Mesh(blockGeometry, createWorldShader
