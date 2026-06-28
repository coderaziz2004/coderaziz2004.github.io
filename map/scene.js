// ============================================================================
// scene.js — renderer, camera, route, drones, overlay tracking, loop
// ============================================================================
(function () {
  const C = window.CITY;
  const app = document.getElementById('app');

  // respect reduced-motion (parent passes ?reduce=1, or honor the iframe's own media query)
  const REDUCE = new URLSearchParams(location.search).has('reduce') ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // phones get a lighter GPU footprint so this second WebGL scene reliably renders
  const LITE = Math.min(window.innerWidth, window.innerHeight) < 700;

  // ---- renderer (graceful: if WebGL can't initialise, show a calm gradient instead of black) ----
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !LITE, alpha: false });
  } catch (e) {
    document.body.style.background =
      'radial-gradient(120% 90% at 50% 36%,rgba(46,155,255,.1),transparent 55%),linear-gradient(180deg,#0c0e12,#070809)';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, LITE ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x121214, 1);
  app.appendChild(renderer.domElement);
  // iOS reclaims WebGL contexts under memory pressure — fall back to a calm gradient instead of a black box
  renderer.domElement.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    renderer.domElement.style.display = 'none';
    document.body.style.background =
      'radial-gradient(120% 90% at 50% 36%,rgba(46,155,255,.1),transparent 55%),linear-gradient(180deg,#0c0e12,#070809)';
  }, false);

  // ---- scene + fog ----
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x121214, 175, 520);

  // lights — only affect the drones' MeshStandard materials (city is unlit MeshBasic)
  scene.add(new THREE.HemisphereLight(0xa9b6bd, 0x05060a, 0.85));
  const keyLight = new THREE.DirectionalLight(0xe2ecee, 1.15);
  keyLight.position.set(60, 120, 40);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x6e8aa0, 0.45);
  rimLight.position.set(-50, 30, -60);
  scene.add(rimLight);

  // ---- camera ----
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.5, 1500);
  camera.position.set(4, 206, 152);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(12, 12, -18);
  controls.minDistance = 60;
  controls.maxDistance = 320;
  controls.maxPolarAngle = Math.PI * 0.46;   // keep above ground
  controls.minPolarAngle = Math.PI * 0.12;
  controls.autoRotate = !REDUCE;            // no gratuitous camera spin under reduced-motion
  controls.autoRotateSpeed = 0.24;
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  // ---- city ----
  const museumCell = { i: 5, j: 5 };
  const city = C.buildCity(museumCell);
  scene.add(city);

  // ground plane (very dark, helps occlude/anchor)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshBasicMaterial({ color: 0x0e0e10 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  scene.add(ground);

  // ---- key world anchors ----
  const museumWorld = new THREE.Vector3(C.centerX(5), 60, C.centerZ(5));     // pin top
  const MX = C.centerX(5), MZ = C.centerZ(5);                                // museum base (25,-17)

  // ---- 4 inbound routes, each from a different point, converging on MoMA ----
  // Each route funnels in from its own quadrant via the museum's local streets.
  const ROUTES = [
    {
      tag: 'SW Sector', dist: '1.4 KM', speed: 0.042, offset: 0.00,
      ground: [[-95, 115], [-95, -8.5], [12.5, -8.5], [20, -13], [MX, MZ]],
      yProfile: [3, 28, 28, 34, 52],
    },
    {
      tag: 'SE Sector', dist: '1.1 KM', speed: 0.048, offset: 0.45,
      ground: [[120, 92], [37.5, 92], [37.5, -8.5], [30, -13], [MX, MZ]],
      yProfile: [3, 29, 29, 34, 52],
    },
    {
      tag: 'NW Sector', dist: '1.7 KM', speed: 0.036, offset: 0.25,
      ground: [[-105, -115], [12.5, -115], [12.5, -30.5], [22, -22], [MX, MZ]],
      yProfile: [3, 31, 31, 35, 52],
    },
    {
      tag: 'NE Sector', dist: '1.5 KM', speed: 0.039, offset: 0.70,
      ground: [[150, -110], [37.5, -110], [37.5, -30.5], [30, -22], [MX, MZ]],
      yProfile: [3, 31, 31, 35, 52],
    },
  ];

  const dotGeo = new THREE.SphereGeometry(0.62, 10, 10);
  const tmpLook = new THREE.Vector3();
  const routes = [];

  ROUTES.forEach((def) => {
    const gPts = def.ground.map((p) => new THREE.Vector3(p[0], 0.7, p[1]));
    const dPts = def.ground.map((p, i) => new THREE.Vector3(p[0], def.yProfile[i], p[1]));
    const groundCurve = new THREE.CatmullRomCurve3(gPts, false, 'catmullrom', 0.25);
    const droneCurve = new THREE.CatmullRomCurve3(dPts, false, 'catmullrom', 0.3);

    // dotted ground line, density scaled to length
    const len = groundCurve.getLength();
    const ndots = Math.max(24, Math.min(90, Math.round(len / 4)));
    const dots = [];
    for (let k = 0; k < ndots; k++) {
      const t = k / (ndots - 1);
      const m = new THREE.MeshBasicMaterial({ color: C.COL.route, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
      const dot = new THREE.Mesh(dotGeo, m);
      dot.position.copy(groundCurve.getPointAt(t));
      dot.userData.t = t;
      scene.add(dot);
      dots.push(dot);
    }

    // faint glowing corridor tube
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(droneCurve, 140, 0.16, 6, false),
      new THREE.MeshBasicMaterial({ color: C.COL.route, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    scene.add(tube);

    // launch pad at the origin
    const pad = C.makeLaunchPad();
    pad.position.set(def.ground[0][0], 0, def.ground[0][1]);
    scene.add(pad);

    // one drone per route
    const drone = C.makeDrone();
    scene.add(drone);

    routes.push({ def, groundCurve, droneCurve, dots, drone, pad,
      origin: new THREE.Vector3(def.ground[0][0], 9, def.ground[0][1]) });
  });

  // ---- overlay tracking ----
  const overlay = document.getElementById('overlay');
  const elMuseum = document.getElementById('museumPin');
  function projectTo(el, world) {
    const v = world.clone().project(camera);
    if (v.z > 1) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.style.left = (v.x * 0.5 + 0.5) * window.innerWidth + 'px';
    el.style.top = (-v.y * 0.5 + 0.5) * window.innerHeight + 'px';
  }

  // origin tags floating over each launch pad
  routes.forEach((r) => {
    const el = document.createElement('div');
    el.className = 'origin-tag';
    el.innerHTML = r.def.tag + ' &middot; <span class="dist">' + r.def.dist + '</span>';
    overlay.appendChild(el);
    r.tagEl = el;
  });

  const streetDefs = [
    { txt: 'W 53RD ST', pos: new THREE.Vector3(40, 0.5, -8.5) },
    { txt: 'W 54TH ST', pos: new THREE.Vector3(-40, 0.5, -25.5) },
    { txt: '5TH AVE', pos: new THREE.Vector3(-12.5, 0.5, 30) },
    { txt: '6TH AVE', pos: new THREE.Vector3(12.5, 0.5, 30) },
    { txt: 'W 52ND ST', pos: new THREE.Vector3(50, 0.5, 8.5) },
  ];
  const streetEls = streetDefs.map((s) => {
    const el = document.createElement('div');
    el.className = 'street-label';
    el.textContent = s.txt;
    overlay.appendChild(el);
    return { el, pos: s.pos };
  });

  // ---- resize ----
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  // ---- intro camera ease-in ----
  let introT = 0;
  const introFrom = new THREE.Vector3(-30, 300, 240);
  const introTo = new THREE.Vector3(4, 206, 152);

  // ---- loop ----
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t = clock.elapsedTime;

    if (introT < 1) {
      introT = Math.min(1, introT + dt * 0.75);
      const e = 1 - Math.pow(1 - introT, 3);
      camera.position.lerpVectors(introFrom, introTo, e);
    }

    // animate each inbound route
    for (const r of routes) {
      // pulse a brightness wave along the dotted line (toward the museum)
      for (const dot of r.dots) {
        const w = ((dot.userData.t - t * 0.24) % 1 + 1) % 1;
        const pulse = Math.max(0, 1 - Math.abs(w * 2 - 1));
        dot.material.opacity = 0.3 + 0.7 * Math.pow(pulse, 2.2);
        dot.scale.setScalar(0.8 + 0.9 * Math.pow(pulse, 2.5));
      }

      // pulse the launch pad rings
      const padPulse = 0.5 + 0.5 * Math.sin(t * 2 + r.origin.x);
      r.pad.userData.ring.material.opacity = 0.35 + 0.45 * padPulse;
      r.pad.userData.ring2.material.opacity = 0.45 + 0.45 * (1 - padPulse);
      r.pad.userData.ring.rotation.z += dt * 0.4;

      // fly the drone inbound (origin -> museum), then relaunch
      const tt = (t * r.def.speed + r.def.offset) % 1;
      const p = r.droneCurve.getPointAt(tt);
      const drone = r.drone;
      drone.position.copy(p);
      drone.position.y += Math.sin(t * 3 + r.def.offset * 12) * 0.25;
      // face travel direction
      tmpLook.copy(r.droneCurve.getPointAt(Math.min(1, tt + 0.01)));
      drone.lookAt(tmpLook.x, p.y, tmpLook.z);
      // fade in at launch, fade out as it delivers at the museum roof
      let s = 1;
      if (tt < 0.05) s = tt / 0.05;
      else if (tt > 0.94) s = (1 - tt) / 0.06;
      drone.scale.setScalar(1.95 * Math.max(0, s));
      for (const rt of drone.userData.rotors) rt.rotation.y += dt * 38;
    }

    controls.update();
    renderer.render(scene, camera);

    // overlay tracking
    projectTo(elMuseum, museumWorld);
    // flip the museum label to the pin's left when it would run off the right edge (narrow / mobile cards)
    var museumX = (museumWorld.clone().project(camera).x * 0.5 + 0.5) * window.innerWidth;
    elMuseum.classList.toggle('flip-left', museumX + 260 > window.innerWidth);
    for (const r of routes) projectTo(r.tagEl, r.origin);
    for (const s of streetEls) projectTo(s.el, s.pos);
  }
  animate();
})();
