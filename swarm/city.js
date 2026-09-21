// ============================================================================
// city.js — procedural wireframe Manhattan + drone model + route geometry
// Exposes window.CITY with builder functions. Uses THREE (r128 UMD global).
// ============================================================================
(function () {
  const COL = {
    lineWhite: 0xc3c7ce,
    fillBase: 0x171e14,
    hiFill: 0x70835f,
    hiEdge: 0xbfceb1,
    route: 0xb6d59a,
  };

  // ---- grid params (X = avenues across, Z = streets up/down) ----
  const GRID = {
    blockW: 20, blockD: 12,
    streetW: 5,
  };
  const pitchX = GRID.blockW + GRID.streetW; // 25
  const pitchZ = GRID.blockD + GRID.streetW; // 17
  // fixed world origin so anchors stay put no matter how far the grid extends
  const centerX = (i) => (i - 4) * pitchX;
  const centerZ = (j) => (j - 6) * pitchZ;
  const RANGE = { iMin: -3, iMax: 13, jMin: -5, jMax: 16 };

  // deterministic-ish PRNG so the city is stable between reloads
  let _seed = 1337;
  function rnd() { _seed = (_seed * 1664525 + 1013904223) % 4294967296; return _seed / 4294967296; }
  function rrange(a, b) { return a + (b - a) * rnd(); }

  // shared geometries / materials
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  function makeBuilding(cx, cz, w, d, h, opts) {
    opts = opts || {};
    const g = new THREE.Group();

    const fillCol = opts.highlight ? COL.hiFill : COL.fillBase;
    const fillMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(fillCol),
      transparent: !!opts.highlight,
      opacity: opts.highlight ? 0.42 : 1.0,
      depthWrite: !opts.highlight,
    });
    const fill = new THREE.Mesh(boxGeo, fillMat);
    fill.scale.set(w, h, d);
    fill.position.set(cx, h / 2, cz);
    g.add(fill);

    const edgeGeo = new THREE.EdgesGeometry(boxGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: opts.highlight ? COL.hiEdge : COL.lineWhite,
      transparent: true,
      opacity: opts.highlight ? 1.0 : 0.28,
      fog: true,
    });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    edges.scale.set(w, h, d);
    edges.position.set(cx, h / 2, cz);
    g.add(edges);
    return g;
  }

  // Build the whole city. museum/subway grid cells are passed in.
  function buildCity() {
    const group = new THREE.Group();
    // Conceptual border-sector map, using the same terrain as the mission demo.
    const texture = new THREE.TextureLoader().load('../assets/terrain.png');
    texture.anisotropy = 4;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(460, 400, 1, 1), new THREE.MeshBasicMaterial({map:texture,color:0x6e7d60}));
    ground.rotation.x=-Math.PI/2; ground.position.y=.05; group.add(ground);
    const points=[];
    for(let z=-155;z<=150;z+=10){if(Math.abs(z)<15)continue;
      const post=new THREE.Mesh(new THREE.BoxGeometry(.6,5,.6),new THREE.MeshBasicMaterial({color:0xa7bc93}));post.position.set(0,2.5,z);group.add(post);
      if(Math.abs(z+5)>15){points.push(new THREE.Vector3(0,1,z),new THREE.Vector3(0,1,z+10),new THREE.Vector3(0,4,z),new THREE.Vector3(0,4,z+10));}}
    group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xb6d59a,transparent:true,opacity:.7})));
    const road=new THREE.Mesh(new THREE.PlaneGeometry(7,315),new THREE.MeshBasicMaterial({color:0xc3bba0,transparent:true,opacity:.28}));road.rotation.x=-Math.PI/2;road.position.set(18,.12,0);group.add(road);
    group.add(makeBuilding(31,4,15,10,6,{highlight:true}));group.add(makeBuilding(-22,-8,12,9,4,{}));
    const gate=new THREE.Mesh(new THREE.BoxGeometry(2,.6,24),new THREE.MeshBasicMaterial({color:0xb6d59a}));gate.position.set(0,3,0);group.add(gate);
    return group;
  }

  function splitBlock(W, D, lots) {
    const gap = 1.6;
    if (lots === 1) return [{ ox: 0, oz: 0, w: W - gap, d: D - gap }];
    if (lots === 2) {
      const wA = (W - gap) * rrange(0.4, 0.6);
      const wB = (W - gap) - wA;
      return [
        { ox: -(W - gap) / 2 + wA / 2, oz: 0, w: wA - gap / 2, d: D - gap },
        { ox: (W - gap) / 2 - wB / 2, oz: 0, w: wB - gap / 2, d: D - gap },
      ];
    }
    // 3 lots: split along W into 2, one of them split along D
    const w1 = (W - gap) * rrange(0.45, 0.55);
    const w2 = (W - gap) - w1;
    const dHalf = (D - gap) / 2;
    return [
      { ox: -(W - gap) / 2 + w1 / 2, oz: 0, w: w1 - gap / 2, d: D - gap },
      { ox: (W - gap) / 2 - w2 / 2, oz: -dHalf / 2, w: w2 - gap / 2, d: dHalf - gap / 2 },
      { ox: (W - gap) / 2 - w2 / 2, oz: dHalf / 2, w: w2 - gap / 2, d: dHalf - gap / 2 },
    ];
  }

  // ---- drone model (sleek Mavic-style quadcopter, faces -Z) ----
  // shared materials (all drones identical)
  const _matBody = new THREE.MeshStandardMaterial({ color: 0xa3b29a, metalness: 0.5, roughness: 0.32, emissive: 0xb6d59a, emissiveIntensity: 0.65 });
  const _matShell = new THREE.MeshStandardMaterial({ color: 0xd0d9c6, metalness: 0.5, roughness: 0.4, emissive: 0x4f6b7a, emissiveIntensity: 0.55 });
  const _matArm = new THREE.MeshStandardMaterial({ color: 0x0c0e12, metalness: 0.45, roughness: 0.55 });
  const _matMotor = new THREE.MeshStandardMaterial({ color: 0x203039, metalness: 0.75, roughness: 0.3, emissive: 0x3f5868, emissiveIntensity: 0.45 });
  const _matBlade = new THREE.MeshStandardMaterial({ color: 0x88a0b0, metalness: 0.3, roughness: 0.5, emissive: 0xb6d59a, emissiveIntensity: 0.4, side: THREE.DoubleSide });
  const _matCam = new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.5, roughness: 0.5 });
  const _matLens = new THREE.MeshStandardMaterial({ color: 0x04060a, metalness: 0.9, roughness: 0.08, emissive: 0x15232d, emissiveIntensity: 0.6 });
  const _matLed = new THREE.MeshBasicMaterial({ color: 0xaebcc6 });
  const _matDisc = new THREE.MeshBasicMaterial({ color: 0xb6d59a, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

  const _armGeo = new THREE.CylinderGeometry(0.06, 0.095, 1, 8);
  const _yAxis = new THREE.Vector3(0, 1, 0);
  function orientArm(mesh, a, b) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    mesh.scale.y = len;
    mesh.position.copy(a).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(_yAxis, dir.clone().normalize());
  }

  function makeDrone() {
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),_matBody);body.scale.set(.52,.4,2.65);g.add(body);
    const wing=new THREE.Mesh(new THREE.BoxGeometry(8.4,.15,1.15),_matShell);wing.position.set(0,.12,-.45);g.add(wing);
    const tail=new THREE.Mesh(new THREE.BoxGeometry(3.6,.13,.65),_matShell);tail.position.set(0,.4,2.35);g.add(tail);
    [-1,1].forEach(side=>{const boom=new THREE.Mesh(new THREE.BoxGeometry(.12,.14,4.8),_matArm);boom.position.set(side*1.65,-.05,.35);g.add(boom);const fin=new THREE.Mesh(new THREE.BoxGeometry(.1,1.25,.8),_matShell);fin.position.set(side*1.65,.7,2.35);fin.rotation.z=side*.24;g.add(fin);});
    const rotors=[];
    [[-1.65,-1.4],[1.65,-1.4],[-1.65,1.4],[1.65,1.4]].forEach(([x,z])=>{const motor=new THREE.Mesh(new THREE.CylinderGeometry(.17,.2,.3,12),_matMotor);motor.position.set(x,.22,z);g.add(motor);const prop=new THREE.Group();prop.position.set(x,.4,z);prop.add(new THREE.Mesh(new THREE.BoxGeometry(1.9,.025,.13),_matBlade));const disc=new THREE.Mesh(new THREE.CircleGeometry(.92,24),_matDisc);disc.rotation.x=-Math.PI/2;prop.add(disc);g.add(prop);rotors.push(prop);});
    const camera=new THREE.Mesh(new THREE.SphereGeometry(.27,12,12),_matCam);camera.position.set(0,-.38,-1.75);g.add(camera);
    g.userData.rotors=rotors;g.scale.setScalar(1.65);return g;
  }

  // ---- launch pad marker (drone origin point) ----
  function makeLaunchPad() {
    const g = new THREE.Group();
    const mat = () => new THREE.MeshBasicMaterial({ color: COL.route, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.18, 8, 40), mat());
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.6;
    g.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.12, 8, 32), mat());
    ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.6;
    g.add(ring2);

    // thin vertical beam
    const beamMat = mat(); beamMat.opacity = 0.12;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 30, 8, 1, true), beamMat);
    beam.position.y = 15;
    g.add(beam);

    // glow at base
    const glowMat = new THREE.SpriteMaterial({ map: makeGlowTexture(), color: COL.route, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(7, 7, 1); glow.position.y = 0.8;
    g.add(glow);

    const dockMat=new THREE.MeshStandardMaterial({color:0x54644b,metalness:.55,roughness:.45,emissive:0x263520,emissiveIntensity:.35});
    const base=new THREE.Mesh(new THREE.BoxGeometry(17,1.3,12),dockMat);base.position.y=.65;g.add(base);
    const bed=new THREE.Mesh(new THREE.BoxGeometry(15,.25,10),new THREE.MeshBasicMaterial({color:0x273b22}));bed.position.y=1.4;g.add(bed);
    const lids=[];[-1,1].forEach(side=>{const lid=new THREE.Mesh(new THREE.BoxGeometry(8.5,.7,12),dockMat);lid.position.set(side*4.25,5.2,0);lid.userData.side=side;g.add(lid);lids.push(lid);});
    g.userData.lids=lids;
    g.userData.ring = ring; g.userData.ring2 = ring2;
    return g;
  }

  let _glowTex = null;
  function makeGlowTexture() {
    if (_glowTex) return _glowTex;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(198,219,224,0.95)');
    grd.addColorStop(0.3, 'rgba(175,200,205,0.55)');
    grd.addColorStop(1, 'rgba(175,200,205,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 64, 64);
    _glowTex = new THREE.CanvasTexture(c);
    return _glowTex;
  }

  window.CITY = {
    COL, GRID, RANGE, pitchX, pitchZ, centerX, centerZ,
    buildCity, makeDrone, makeGlowTexture, makeLaunchPad,
  };
})();
