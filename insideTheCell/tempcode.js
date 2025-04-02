    // Add DNA strands (circular in mitochondria)
    const dnaGeometry = new THREE.TorusKnotGeometry(1, 0.1, 64, 8, 2, 3);
    const dnaMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x00FF00,
        roughness: 0.3,
        metalness: 0.1
    });
    const dna = new THREE.Mesh(dnaGeometry, dnaMaterial);
    dna.scale.set(0.6, 0.6, 0.6);
    dna.position.set(0, 0, 0);