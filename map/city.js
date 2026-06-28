// ============================================================================
// city.js — procedural wireframe Manhattan + drone model + route geometry
// Exposes window.CITY with builder functions. Uses THREE (r128 UMD global).
// ============================================================================
(function () {
  const COL = {
    lineWhite: 0xc3c7ce,
    fillBase: 0x16161b,
    hiFill: 0x5a7686,
    hiEdge: 0xaeb9c2,
    route: 0x6e8aa0,
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
  function buildCity(museumCell) {
    const group = new THREE.Group();
    for (let i = RANGE.iMin; i <= RANGE.iMax; i++) {
      for (let j = RANGE.jMin; j <= RANGE.jMax; j++) {
        const isMuseum = i === museumCell.i && j === museumCell.j;
        const bx = centerX(i), bz = centerZ(j);

        if (isMuseum) {
          // distinctive tall translucent-blue tower with a setback
          const base = makeBuilding(bx, bz, GRID.blockW * 0.82, GRID.blockD * 0.82, 38, { highlight: true });
          group.add(base);
          const top = makeBuilding(bx + 2, bz - 1, GRID.blockW * 0.5, GRID.blockD * 0.5, 20, { highlight: true });
          top.position.y = 38; // stack
          group.add(top);
          continue;
        }

        // split each block into 1-3 lots — bias toward whole blocks for a cleaner skyline
        const lots = Math.random() < 0.64 ? 1 : (Math.random() < 0.72 ? 2 : 3);
        const slots = splitBlock(GRID.blockW, GRID.blockD, lots);
        for (const s of slots) {
          let h = rrange(6, 24);
          if (rnd() < 0.14) h = rrange(28, 52);      // occasional towers
          if (rnd() < 0.5) h = Math.max(5, h * 0.7); // many low/mid
          const b = makeBuilding(bx + s.ox, bz + s.oz, s.w, s.d, h, {});
          group.add(b);
          // occasional setback cap for variety — kept rare to avoid rooftop clutter
          if (h > 34 && rnd() < 0.26) {
            const cap = makeBuilding(bx + s.ox, bz + s.oz, s.w * 0.6, s.d * 0.6, rrange(6, 14), {});
            cap.position.y = h;
            group.add(cap);
          }
        }
      }
    }
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
  const _matBody = new THREE.MeshStandardMaterial({ color: 0x1f2e38, metalness: 0.5, roughness: 0.32, emissive: 0x6e8aa0, emissiveIntensity: 0.65 });
  const _matShell = new THREE.MeshStandardMaterial({ color: 0x18242e, metalness: 0.5, roughness: 0.4, emissive: 0x4f6b7a, emissiveIntensity: 0.55 });
  const _matArm = new THREE.MeshStandardMaterial({ color: 0x0c0e12, metalness: 0.45, roughness: 0.55 });
  const _matMotor = new THREE.MeshStandardMaterial({ color: 0x203039, metalness: 0.75, roughness: 0.3, emissive: 0x3f5868, emissiveIntensity: 0.45 });
  const _matBlade = new THREE.MeshStandardMaterial({ color: 0x88a0b0, metalness: 0.3, roughness: 0.5, emissive: 0x6e8aa0, emissiveIntensity: 0.4, side: THREE.DoubleSide });
  const _matCam = new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.5, roughness: 0.5 });
  const _matLens = new THREE.MeshStandardMaterial({ color: 0x04060a, metalness: 0.9, roughness: 0.08, emissive: 0x15232d, emissiveIntensity: 0.6 });
  const _matLed = new THREE.MeshBasicMaterial({ color: 0xaebcc6 });
  const _matDisc = new THREE.MeshBasicMaterial({ color: 0x6e8aa0, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

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
    const g = new THREE.Group();

    // fuselage — tapered ellipsoid (long axis along Z = nose forward at -Z)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 26, 18), _matBody);
    body.scale.set(1.05, 0.46, 1.75);
    g.add(body);
    // raised top shell plate
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.16, 1.7), _matShell);
    top.position.y = 0.26; g.add(top);

    const corners = [[-1.02, -1.15], [1.02, -1.15], [-1.08, 1.02], [1.08, 1.02]];
    const rotors = [];
    corners.forEach((c) => {
      const [mx, mz] = c;
      // arm: body shoulder -> motor
      const arm = new THREE.Mesh(_armGeo, _matArm);
      orientArm(arm, new THREE.Vector3(mx * 0.34, 0.02, mz * 0.42), new THREE.Vector3(mx, -0.04, mz));
      g.add(arm);
      // motor stack
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.26, 16), _matMotor);
      motor.position.set(mx, 0.13, mz); g.add(motor);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.07, 12), _matMotor);
      cap.position.set(mx, 0.3, mz); g.add(cap);

      // propeller group (2 long slender blades) + motion-blur disc
      const prop = new THREE.Group();
      prop.position.set(mx, 0.34, mz);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.02, 0.13), _matBlade);
      // slim the tips
      const pos = blade.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        if (Math.abs(x) > 0.6) pos.setZ(i, pos.getZ(i) * 0.55);
      }
      pos.needsUpdate = true;
      prop.add(blade);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10), _matMotor);
      prop.add(hub);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.8, 28), _matDisc);
      disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03; prop.add(disc);
      g.add(prop);
      rotors.push(prop);
    });

    // underslung gimbal camera at the nose (front = -Z)
    const gimbal = new THREE.Group();
    gimbal.position.set(0, -0.3, -1.0);
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.2), _matArm);
    mount.position.y = 0.16; gimbal.add(mount);
    const camBody = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.42), _matCam);
    gimbal.add(camBody);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.14, 18), _matLens);
    lens.rotation.x = Math.PI / 2; lens.position.set(0, -0.02, -0.24); gimbal.add(lens);
    g.add(gimbal);

    // landing skids
    const legGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.5, 6);
    [[-0.55, 1.05], [0.55, 1.05], [-0.5, -0.6], [0.5, -0.6]].forEach((p) => {
      const leg = new THREE.Mesh(legGeo, _matArm);
      leg.position.set(p[0], -0.32, p[1]);
      leg.rotation.x = (p[1] > 0 ? 0.18 : -0.18);
      g.add(leg);
    });

    // status LEDs (front-facing blue) + soft underglow for scene visibility
    const ledF = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), _matLed);
    ledF.position.set(0, 0.12, -1.45); g.add(ledF);
    const glowMat = new THREE.SpriteMaterial({ map: makeGlowTexture(), color: COL.route, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(3.4, 3.4, 1); glow.position.y = -0.05;
    g.add(glow);

    g.userData.rotors = rotors;
    g.scale.set(1.95, 1.95, 1.95);
    return g;
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
