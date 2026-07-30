initMaterials() {
        const textureLoader = new THREE.TextureLoader();

        // Use direct CORS-friendly RAW URL or local relative path
        const grassTexture = textureLoader.load(
            'https://raw.githubusercontent.com/jergan-studio/JergBuilder/main/Assets/Grass.png',
            (tex) => {
                tex.magFilter = THREE.NearestFilter;
                tex.minFilter = THREE.NearestFilter;
            },
            undefined,
            (err) => console.warn('Texture failed to load, falling back to color material.', err)
            (err) => console.warn('Texture load failed, using fallback color.', err)
        );

        const grassMat = new THREE.MeshLambertMaterial({ map: grassTexture, color: 0x557a2b });
        const dirtMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
        const stoneMat = new THREE.MeshLambertMaterial({ color: 0x777777 });

        return { grass: grassMat, dirt: dirtMat, stone: stoneMat };
        return {
            grass: new THREE.MeshLambertMaterial({ map: grassTexture, color: 0x557a2b }),
            dirt: new THREE.MeshLambertMaterial({ color: 0x5c4033 }),
            stone: new THREE.MeshLambertMaterial({ color: 0x777777 }),
            
            // --- NEW INVENTORY BLOCKS ---
            gray: new THREE.MeshLambertMaterial({ color: 0x808080 }),
            blue: new THREE.MeshLambertMaterial({ color: 0x1e90ff }),
            red: new THREE.MeshLambertMaterial({ color: 0xff3333 }),
            pink: new THREE.MeshLambertMaterial({ color: 0xff69b4 }),
            green: new THREE.MeshLambertMaterial({ color: 0x2e8b57 }),
            lime: new THREE.MeshLambertMaterial({ color: 0x32cd32 }),
            yellow: new THREE.MeshLambertMaterial({ color: 0xffd700 })
        };
    }

    setSeed(newSeed) {
