// ============================================================================
// scene.js — renderer, camera, route, drones, overlay tracking, loop
// ============================================================================
(function () {
  const C = window.CITY;
  const app = document.getElementById('app');
  let paused = false, active = true, simulationTime = 0, userOrbit = false;
  window.addEventListener('message', function(event) {
    if(event.source !== parent || event.origin !== location.origin || event.data?.type !== 'degla-swarm') return;
    if(typeof event.data.paused === 'boolean') { paused = event.data.paused; if (!paused) REDUCE = false; }
    if(typeof event.data.active === 'boolean') active = event.data.active;
  });

  // respect reduced-motion (parent passes ?reduce=1, or honor the iframe's own media query)
  let REDUCE = new URLSearchParams(location.search).has('reduce') ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // phones get a lighter GPU footprint so this second WebGL scene reliably renders
  const LITE = Math.min(window.innerWidth, window.innerHeight) < 700;

  // ---- renderer (graceful: if WebGL can't initialise, show a calm gradient instead of black) ----
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !LITE, alpha: false });
  } catch (e) {
    document.getElementById('render-fallback').hidden = false;
    document.body.style.background =
      'radial-gradient(120% 90% at 50% 36%,rgba(182,213,154,.1),transparent 55%),linear-gradient(180deg,#141c10,#10140e)';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, LITE ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x121610, 1);
  app.appendChild(renderer.domElement);
  // iOS reclaims WebGL contexts under memory pressure — fall back to a calm gradient instead of a black box
  renderer.domElement.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    renderer.domElement.style.display = 'none';
    document.getElementById('render-fallback').hidden = false;
    document.body.style.background =
      'radial-gradient(120% 90% at 50% 36%,rgba(182,213,154,.1),transparent 55%),linear-gradient(180deg,#141c10,#10140e)';
  }, false);

  // ---- scene + fog ----
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x121610, 175, 520);

  // lights — only affect the drones' MeshStandard materials (city is unlit MeshBasic)
  scene.add(new THREE.HemisphereLight(0xa9b6bd, 0x05060a, 0.85));
  const keyLight = new THREE.DirectionalLight(0xe2ecee, 1.15);
  keyLight.position.set(60, 120, 40);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xb6d59a, 0.45);
  rimLight.position.set(-50, 30, -60);
  scene.add(rimLight);

  // ---- camera ----
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.5, 1500);
  camera.position.set(5, 185, 190);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.dampingFactor = 0.08;
  controls.target.set(5, 8, -5);
  controls.minDistance = 60;
  controls.maxDistance = 320;
  controls.maxPolarAngle = Math.PI * 0.46;   // keep above ground
  controls.minPolarAngle = Math.PI * 0.12;
  controls.autoRotate = !REDUCE;            // no gratuitous camera spin under reduced-motion
  controls.autoRotateSpeed = 0.24;
  controls.addEventListener('start', () => { userOrbit = true; controls.autoRotate = false; });

  // ---- city ----
  const museumCell = { i: 5, j: 5 };
  const city = C.buildCity(museumCell);
  scene.add(city);

  // ground plane (very dark, helps occlude/anchor)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshBasicMaterial({ color: 0x10140e })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  scene.add(ground);

  // ---- key world anchors ----
  const museumWorld = new THREE.Vector3(18, 8, -42);     // pin top
  const MX = C.centerX(5), MZ = C.centerZ(5);                                // museum base (25,-17)

  // ---- 4 inbound routes, each from a different point, converging on MoMA ----
  // Each route funnels in from its own quadrant via the museum's local streets.
  const ROUTES = [
    {tag:'ALPHA–1',dist:'DOCK A',delay:2,speed:.019,offset:0,ground:[[-68,75],[-75,0],[-62,-85],[-30,-100],[-35,45]],yProfile:[28,34,34,34,30]},
    {tag:'BRAVO–2',dist:'DOCK B',delay:7,speed:.017,offset:0,ground:[[75,65],[75,-15],[68,-98],[35,-115],[38,40]],yProfile:[28,38,38,38,30]},
    {tag:'CHARLIE–3',dist:'OVERWATCH',airborne:true,speed:.027,offset:.2,ground:[[55,-42],[18,-78],[-18,-42],[18,-8]],yProfile:[45,45,45,45]},
    {tag:'DELTA–4',dist:'STANDBY',standby:true,speed:0,offset:0,ground:[[110,85],[112,85],[112,87],[110,87]],yProfile:[2.4,2.4,2.4,2.4]},
  ];

  const dotGeo = new THREE.SphereGeometry(0.62, 10, 10);
  const tmpLook = new THREE.Vector3();
  const routes = [];

  ROUTES.forEach((def) => {
    const gPts = def.ground.map((p) => new THREE.Vector3(p[0], 0.7, p[1]));
    const dPts = def.ground.map((p, i) => new THREE.Vector3(p[0], def.yProfile[i], p[1]));
    const groundCurve = new THREE.CatmullRomCurve3(gPts, true, 'catmullrom', 0.25);
    const droneCurve = new THREE.CatmullRomCurve3(dPts, true, 'catmullrom', 0.3);

    // dotted ground line, density scaled to length
    const len = groundCurve.getLength();
    const ndots = def.standby ? 0 : Math.max(24, Math.min(90, Math.round(len / 4)));
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
    if(!def.standby)scene.add(tube);

    // launch pad at the origin
    const pad = C.makeLaunchPad();
    pad.position.set(def.ground[0][0], 0, def.ground[0][1]);
    if(!def.airborne)scene.add(pad);

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
    {txt:'BORDER LINE',pos:new THREE.Vector3(0,1,-132)},
    {txt:'WEST PATROL SECTOR',pos:new THREE.Vector3(-83,1,-60)},
    {txt:'EAST PATROL SECTOR',pos:new THREE.Vector3(98,1,-65)},
    {txt:'CHECKPOINT 07',pos:new THREE.Vector3(35,9,9)},
    {txt:'ACCESS ROAD',pos:new THREE.Vector3(18,1,45)},
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
  const introFrom = new THREE.Vector3(-15, 215, 225);
  const introTo = new THREE.Vector3(5, 185, 190);

  // ---- loop ----
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (document.hidden || !active) return;
    if (REDUCE) simulationTime = 10;
    else if (!paused) simulationTime += dt;
    const t = simulationTime;
    controls.autoRotate = !REDUCE && !paused && !userOrbit;

    if (introT < 1) {
      introT = Math.min(1, introT + (REDUCE ? 1 : dt * 0.75));
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
      if (!paused && !REDUCE) r.pad.userData.ring.rotation.z += dt * 0.4;

      const drone=r.drone,local=t-(r.def.delay||0);
      let state='PATROL',lift=1,opening=1;
      if(r.def.standby){drone.position.set(r.origin.x,2.4,r.origin.z);drone.rotation.y=Math.PI;state='DOCKED / READY';lift=0;opening=0;}
      else if(!r.def.airborne && local<7){
        opening=Math.max(0,Math.min(1,local/2));
        lift=Math.max(0,Math.min(1,(local-2)/5));
        const ease=lift*lift*(3-2*lift);
        drone.position.set(r.origin.x,2.4+(28-2.4)*ease,r.origin.z);
        const ahead=r.droneCurve.getPointAt(.005);drone.lookAt(ahead.x,drone.position.y,ahead.z);drone.rotateY(Math.PI);
        state=local<0?'DOCKED / READY':local<2?'DOCK OPENING':'VERTICAL TAKEOFF';
      }else{
        const tt=((r.def.airborne?t:local-7)*r.def.speed+r.def.offset)%1;
        const p=r.droneCurve.getPointAt(tt);drone.position.copy(p);
        tmpLook.copy(r.droneCurve.getPointAt((tt+.005)%1));drone.lookAt(tmpLook.x,p.y,tmpLook.z);drone.rotateY(Math.PI);
        state=r.def.airborne?'VEHICLE OVERWATCH':'BORDER SWEEP';
      }
      drone.scale.setScalar(1.65);
      r.pad.userData.lids.forEach(lid=>{lid.position.x=lid.userData.side*(4.25+opening*8.5);});
      if(r.lastState!==state){r.lastState=state;r.tagEl.innerHTML=r.def.tag+' &middot; <span class="dist">'+state+'</span>';}
      if (!paused && !REDUCE && !r.def.standby && local>=0) for (const rt of drone.userData.rotors) rt.rotation.y += dt * (lift<1?48:18);

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
