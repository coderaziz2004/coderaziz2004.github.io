<?php
// threed.php - 3D mission simulation (prototype)
declare(strict_types=1);
?><!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>Degla — 3D Drone Simulation</title>
  <style>
    :root{
      --bg0:#05070b;
      --bg1:#0b1220;
      --text:#e5e7eb;
      --muted:#94a3b8;
      --line:rgba(255,255,255,.10);
      --line2:rgba(255,255,255,.06);
      --shadow: 0 18px 60px rgba(0,0,0,.45);
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      --sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
      --blue:#3b82f6;
      --green:#22c55e;
      --amber:#f59e0b;
      --purple:#7c3aed;
      --red:#ef4444;
    }
    *{ box-sizing:border-box; }
    html,body{ height:100%; }
    body{
      margin:0;
      font-family: var(--sans);
      color: var(--text);
      background:
        radial-gradient(1200px 760px at 15% 18%, rgba(124,58,237,.20), transparent 55%),
        radial-gradient(900px 640px at 82% 70%, rgba(34,197,94,.12), transparent 60%),
        linear-gradient(180deg, var(--bg0), var(--bg1) 55%, var(--bg0));
      overflow:hidden;
    }
    #app{
      height:100%;
      display:grid;
      grid-template-columns: 1fr;
      gap: 0;
      padding: 0;
    }
    .panel{
      border:1px solid var(--line);
      border-radius:16px;
      background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
      box-shadow: var(--shadow);
      overflow:hidden;
      display:flex;
      flex-direction:column;
      min-height:0;
    }
    /* Landing-style view: hide left panel, full-screen sim */
    .panel{ display:none; }
    .panel header{
      padding:14px 14px 12px 14px;
      border-bottom:1px solid var(--line);
      background: linear-gradient(180deg, rgba(0,0,0,.40), rgba(0,0,0,.10));
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
    }
    .brand{
      display:flex;
      align-items:center;
      gap:10px;
      min-width:0;
    }
    .logo{
      width:34px;height:34px;border-radius:10px;
      border:1px solid var(--line);
      background: rgba(255,255,255,.06);
      display:flex;
      align-items:center;
      justify-content:center;
      font-family: var(--mono);
      font-size: 12px;
      color: #cbd5e1;
    }
    .brandTxt{ min-width:0; }
    .brandTxt .t{
      font-size:13px;
      font-weight:650;
      letter-spacing:.2px;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .brandTxt .s{
      margin-top:2px;
      font-size:11px;
      color: var(--muted);
      font-family: var(--mono);
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .pill{
      font-family: var(--mono);
      font-size: 11px;
      color:#cbd5e1;
      border:1px solid var(--line);
      background: rgba(255,255,255,.05);
      padding:6px 10px;
      border-radius:999px;
      white-space:nowrap;
    }
    .content{
      padding: 12px 14px 14px 14px;
      display:flex;
      flex-direction:column;
      gap: 12px;
      min-height:0;
    }
    .box{
      border:1px solid var(--line);
      background: rgba(0,0,0,.22);
      border-radius:14px;
      padding: 9px 10px;
    }
    .box .hd{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin-bottom:6px;
    }
    .box .hd .t{
      font-size:12px;
      font-weight:650;
      letter-spacing:.2px;
      color:#e2e8f0;
    }
    .box .hd .m{
      font-family:var(--mono);
      font-size:11px;
      color:var(--muted);
      white-space:nowrap;
    }
    .list{
      display:flex;
      flex-direction:column;
      gap:6px;
      margin:0;
      padding:0;
      list-style:none;
    }
    .row{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:10px;
      padding: 7px 9px;
      border-radius:12px;
      border: 1px solid rgba(255,255,255,.08);
      background: rgba(255,255,255,.03);
    }
    .row .l{
      min-width:0;
    }
    .row .name{
      font-family: var(--mono);
      font-size: 11px;
      color:#e2e8f0;
    }
    .row .desc{
      margin-top:2px;
      font-size:10px;
      color:var(--muted);
      line-height:1.35;
    }
    .badge{
      font-family:var(--mono);
      font-size:10px;
      border:1px solid rgba(255,255,255,.10);
      background: rgba(0,0,0,.22);
      color:#cbd5e1;
      padding: 3px 8px;
      border-radius:999px;
      white-space:nowrap;
      margin-top:1px;
    }
    .badge.blue{ border-color: rgba(59,130,246,.35); color:#bfdbfe; background: rgba(59,130,246,.08); }
    .badge.green{ border-color: rgba(34,197,94,.35); color:#bbf7d0; background: rgba(34,197,94,.08); }
    .badge.amber{ border-color: rgba(245,158,11,.35); color:#fde68a; background: rgba(245,158,11,.08); }
    .badge.purple{ border-color: rgba(124,58,237,.35); color:#ddd6fe; background: rgba(124,58,237,.08); }

    .viewport{
      position:relative;
      border:0;
      border-radius:0;
      background: rgba(0,0,0,.22);
      box-shadow: var(--shadow);
      overflow:hidden;
      min-height:0;
    }
    #gl{
      position:absolute;
      inset:0;
      width:100%;
      height:100%;
      display:block;
    }
    .topBar{
      position:absolute;
      top:0; left:0; right:0;
      padding: 12px 14px;
      border-bottom:1px solid var(--line);
      background: linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.12));
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      pointer-events:none;
      z-index:3;
    }
    .topBar{ display:none; }
    .kv{
      display:flex;
      align-items:center;
      gap:10px;
      font-family:var(--mono);
      font-size:11px;
      color:var(--muted);
      white-space:nowrap;
    }
    .dot{
      width:7px;height:7px;border-radius:999px;
      background: rgba(34,197,94,.90);
      box-shadow: 0 0 0 4px rgba(34,197,94,.14);
    }

    .labels{
      position:absolute;
      inset:0;
      z-index:4;
      pointer-events:none;
    }

    /* ai.com-like overlay text */
    .topPill{
      position:absolute;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 6;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: rgba(0,0,0,.35);
      backdrop-filter: blur(14px);
      font-family: var(--mono);
      font-size: 12px;
      letter-spacing: .2px;
      color: rgba(226,232,240,.90);
      pointer-events:none;
    }
    .topPill .mark{
      width: 18px;
      height: 18px;
      border-radius: 7px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.06);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size: 11px;
      color:#cbd5e1;
    }
    /* Two-line typing with shift (like index.html) */
    .stage{
      position:absolute;
      inset:0;
      z-index:6;
      pointer-events:none;
    }
    .line{
      position:absolute;
      left: 50%;
      max-width: 980px;
      width: min(980px, calc(100vw - 44px));
      text-align: center;
      font-size: clamp(26px, 3.1vw, 44px);
      line-height: 1.22;
      letter-spacing: -.01em;
      font-weight: 520;
      color: rgba(226,232,240,.92);
      text-wrap: balance;
      white-space: pre-wrap;
      will-change: transform, top, opacity;
      font-family: var(--sans);
    }
    .line1{
      top: 50%;
      transform: translate(-50%, -50%);
      transition: top .75s ease, transform .75s ease, opacity .25s ease;
    }
    .stage.stage2 .line1{
      top: 76px;
      transform: translate(-50%, 0) scale(0.78);
    }
    .line2{
      top: 58%;
      transform: translate(-50%, -50%);
      opacity: 0;
      transition: opacity .35s ease, top .65s ease, transform .65s ease;
    }
    .stage.stage2 .line2{
      opacity: 1;
      top: 61%;
    }
    /* after line2 finishes typing, settle slightly lower + smaller */
    .stage.stage3 .line2{
      opacity: 1;
      top: 74%;
      transform: translate(-50%, -50%) scale(0.92);
    }
    .caret{
      display:inline-block;
      width: 0.7ch;
      color: rgba(226,232,240,.85);
      animation: blink 1.05s steps(1, end) infinite;
    }
    @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
    .stage.stage2 #caret1{ opacity: 0; }
    .warnOverlay{
      position:absolute;
      left: 14px;
      bottom: 14px;
      z-index: 7;
      max-width: 520px;
      border:1px solid rgba(255,255,255,.10);
      background: rgba(0,0,0,.40);
      border-radius: 14px;
      padding: 10px 12px;
      backdrop-filter: blur(10px);
      font-family: var(--mono);
      font-size: 11px;
      color: rgba(254,202,202,.92);
      display:none;
    }
    .label{
      position:absolute;
      transform: translate(-50%, calc(-100% - 16px));
      min-width: 0;
      max-width: 150px;
      border:1px solid rgba(255,255,255,.12);
      background: rgba(0,0,0,.45);
      border-radius: 10px;
      padding: 4px 6px;
      font-family: var(--mono);
      color:#e2e8f0;
      backdrop-filter: blur(10px);
    }
    .label .t{ font-size:9px; line-height:1.15; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .label .s{ margin-top:1px; font-size:8px; line-height:1.1; color: var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .label .s.red{ color: rgba(254,202,202,.95); }
    .label.hide{ display:none; }

    .hint{
      font-size:11px;
      color:var(--muted);
      line-height:1.4;
    }
    .warn{
      margin-top:6px;
      font-size:11px;
      color: rgba(254,202,202,.92);
      line-height:1.35;
      font-family: var(--mono);
    }

    @media (max-width: 980px){
      body{ overflow:hidden; }
    }
  </style>
</head>
<body>
<div id="app">
  <main class="viewport" aria-label="3D mission viewport">
    <canvas id="gl"></canvas>
    <div class="topPill" aria-label="Degla">
      <span class="mark">D</span>
      <span>Degla</span>
    </div>
    <div class="stage" id="stage" aria-label="Degla landing message">
      <div class="line line1" aria-live="polite">
        <span id="typed1"></span><span class="caret" id="caret1" aria-hidden="true">|</span>
      </div>
      <div class="line line2" aria-live="polite">
        <span id="typed2"></span><span class="caret" id="caret2" aria-hidden="true">|</span>
      </div>
    </div>
    <div class="warnOverlay" id="warnOverlay"></div>
    <div class="labels" id="labels">
      <div class="label" id="l1"><div class="t">Drone 1 • Spraying</div><div class="s" id="s1">Executing</div></div>
      <div class="label" id="l2"><div class="t">Drone 2 • Taking Photos</div><div class="s" id="s2">Capturing photo</div></div>
      <div class="label" id="l3"><div class="t">Drone 3 • Inspecting</div><div class="s" id="s3">Executing</div></div>
      <div class="label" id="l4"><div class="t">Drone 4 • Crop Scan</div><div class="s" id="s4">Executing</div></div>
    </div>
  </main>
</div>

<!-- Three.js (local vendor). Falls back to CDN if needed. -->
<script src="./three.min.js"></script>
<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $("gl");
  const warnOverlay = $("warnOverlay");

  function showWarn(msg) {
    warnOverlay.textContent = msg;
    warnOverlay.style.display = "";
  }

  function loadThreeFromCdnThenStart(start) {
    if (window.THREE) return start();
    const s = document.createElement("script");
    s.src = "https://unpkg.com/three@0.160.0/build/three.min.js";
    s.async = true;
    s.onload = () => start();
    s.onerror = () => showWarn("Could not load the 3D engine (Three.js). Check your network or use the local vendor file.");
    document.head.appendChild(s);
  }

  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Typewriter overlay (two-stage, with shift)
  const stageEl = $("stage");
  const typed1 = $("typed1");
  const typed2 = $("typed2");
  const line1 = "Degla is the Cursor for mission planning.";
  const line2 = "Vibe‑plan a full mission in natual language and watch a swarm of drones coordinate through constraints and failures to achieve your goal.";
  function setText(el, text) { if (el) el.textContent = text; }
  function typeLine(el, line, speedBase, speedJitter, punctPause, done) {
    let i = 0;
    function step() {
      setText(el, line.slice(0, i));
      if (i >= line.length) return done && done();
      const ch = line[i] || "";
      i++;
      const isPunct = ch === "." || ch === "—" || ch === ",";
      const delay = speedBase + (Math.random() * speedJitter) + (isPunct ? punctPause : 0);
      window.setTimeout(step, delay);
    }
    step();
  }
  if (prefersReduced) {
    stageEl && stageEl.classList.add("stage2");
    setText(typed1, line1);
    setText(typed2, line2);
  } else {
    window.setTimeout(() => {
      typeLine(typed1, line1, 22, 26, 140, () => {
        window.setTimeout(() => {
          stageEl && stageEl.classList.add("stage2");
          window.setTimeout(() => {
            typeLine(typed2, line2, 22, 26, 140, () => {
              window.setTimeout(() => stageEl && stageEl.classList.add("stage3"), 220);
            });
          }, 220);
        }, 220);
      });
    }, 180);
  }

  function start() {
    if (!window.THREE) {
      showWarn("Three.js is not available.");
      return;
    }

    // Renderer (create first; if this fails, WebGL is the issue)
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) {
      showWarn("WebGL couldn't initialize. Enable hardware acceleration / WebGL in your browser settings.");
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x05070b, 120, 320);

    // Camera: steady top-down-ish
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, 140, 150);
    camera.lookAt(0, 0, 10);

    // Lights
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x07140e, 0.60);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.95);
    dir.position.set(70, 120, 40);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 10;
    dir.shadow.camera.far = 360;
    dir.shadow.camera.left = -140;
    dir.shadow.camera.right = 140;
    dir.shadow.camera.top = 140;
    dir.shadow.camera.bottom = -140;
    scene.add(dir);

  // Terrain texture (procedural)
  function makeTerrainTexture() {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const g = c.getContext("2d");
    g.fillStyle = "#0b2a18";
    g.fillRect(0,0,c.width,c.height);

    // subtle noise + stripes
    for (let i = 0; i < 11000; i++) {
      const x = Math.random() * c.width;
      const y = Math.random() * c.height;
      const a = Math.random() * 0.06;
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.fillRect(x,y,1,1);
    }
    g.globalAlpha = 0.20;
    g.strokeStyle = "rgba(0,0,0,0.25)";
    for (let y = 0; y < c.height; y += 22) {
      g.beginPath();
      g.moveTo(0, y + (Math.sin(y/28) * 4));
      g.lineTo(c.width, y);
      g.stroke();
    }
    g.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1.5, 1.5);
    tex.anisotropy = 8;
    return tex;
  }

  const terrainTex = makeTerrainTexture();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 190, 1, 1),
    new THREE.MeshStandardMaterial({ map: terrainTex, roughness: 1.0, metalness: 0.0, color: 0x0d3a22 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Fields (A,B,C rectangles + D triangle)
  const FIELDS = {
    A: { x0: -110, x1: -40, z0: -55, z1: 5, color: 0x134a2a },
    B: { x0: -40, x1: 30, z0: -55, z1: 5, color: 0x14522e },
    C: { x0: 30, x1: 110, z0: -55, z1: 5, color: 0x154f2c },
    D: { xL: -40, xR: 110, zTop: 10, zBot: 70 } // triangle: left vertical edge and diagonal to xR at zTop
  };

  function fieldMat(hex) {
    return new THREE.MeshStandardMaterial({ color: hex, roughness: 1.0, metalness: 0.0, transparent: true, opacity: 0.90 });
  }

  function addFieldRect(name, f) {
    const w = f.x1 - f.x0;
    const h = f.z1 - f.z0;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), fieldMat(f.color));
    mesh.rotation.x = -Math.PI/2;
    mesh.position.set((f.x0 + f.x1)/2, 0.02, (f.z0 + f.z1)/2);
    mesh.receiveShadow = true;
    scene.add(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)),
      new THREE.LineBasicMaterial({ color: 0xcbd5e1, transparent:true, opacity: 0.22 })
    );
    edges.rotation.x = -Math.PI/2;
    edges.position.copy(mesh.position);
    scene.add(edges);
  }
  addFieldRect("A", FIELDS.A);
  addFieldRect("B", FIELDS.B);
  addFieldRect("C", FIELDS.C);

  // Triangle D
  {
    const f = FIELDS.D;
    const shape = new THREE.Shape();
    // points in XZ plane (we'll rotate as plane)
    // Triangle: (-40,zTop) -> (110,zTop) -> (-40,zBot)
    shape.moveTo(f.xL, f.zTop);
    shape.lineTo(f.xR, f.zTop);
    shape.lineTo(f.xL, f.zBot);
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    const tri = new THREE.Mesh(geo, fieldMat(0x124527));
    tri.rotation.x = -Math.PI/2;
    tri.position.y = 0.02;
    tri.receiveShadow = true;
    scene.add(tri);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0xcbd5e1, transparent:true, opacity: 0.22 })
    );
    edges.rotation.x = -Math.PI/2;
    edges.position.y = 0.03;
    scene.add(edges);
  }

  // BASE marker
  const BASE = new THREE.Vector3(-120, 0.0, 78);
  {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.8, 4.2, 44),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent:true, opacity: 0.55, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI/2;
    ring.position.set(BASE.x, 0.05, BASE.z);
    scene.add(ring);

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 22, 22),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x1d4ed8, emissiveIntensity: 0.55, roughness: 0.8 })
    );
    dot.position.set(BASE.x, 1.1, BASE.z);
    dot.castShadow = true;
    scene.add(dot);
  }

  // Drone rig
  function makeDrone(colorHex) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 18, 18),
      new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.25, roughness: 0.55 })
    );
    body.castShadow = true;
    g.add(body);

    const armMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.2, roughness: 0.7 });
    const armGeo = new THREE.CylinderGeometry(0.12, 0.12, 6.0, 10);
    const arm1 = new THREE.Mesh(armGeo, armMat);
    arm1.rotation.z = Math.PI/2;
    arm1.castShadow = true;
    g.add(arm1);
    const arm2 = new THREE.Mesh(armGeo, armMat);
    arm2.rotation.x = Math.PI/2;
    arm2.castShadow = true;
    g.add(arm2);

    const glow = new THREE.PointLight(colorHex, 0.65, 28, 2);
    glow.position.set(0, 1.2, 0);
    g.add(glow);

    return { group: g, body };
  }

  // Effects
  function makeSprayCone() {
    const geo = new THREE.ConeGeometry(5.8, 10.5, 18, 1, true);
    const mat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent:true, opacity: 0.12, side: THREE.DoubleSide, depthWrite:false });
    const cone = new THREE.Mesh(geo, mat);
    cone.rotation.x = Math.PI; // point down
    cone.position.set(0, -7.0, 0);
    return cone;
  }
  function makePulseRing(colorHex) {
    const geo = new THREE.RingGeometry(2.4, 3.2, 48);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent:true, opacity: 0.0, side: THREE.DoubleSide, depthWrite:false });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI/2;
    ring.position.y = -6.6;
    return ring;
  }

  // Paths
  function v(x, y, z) { return new THREE.Vector3(x, y, z); }
  const ALT = 10;

  function genLawnmowerRect(f, rows=8) {
    const pts = [];
    const x0 = f.x0 + 6, x1 = f.x1 - 6;
    const z0 = f.z0 + 6, z1 = f.z1 - 6;
    for (let i = 0; i < rows; i++) {
      const t = rows === 1 ? 0 : i/(rows-1);
      const z = z1 - t*(z1-z0);
      const lr = (i % 2 === 0);
      pts.push(v(lr ? x0 : x1, ALT, z));
      pts.push(v(lr ? x1 : x0, ALT, z));
    }
    // close loop
    pts.push(v(pts[pts.length-1].x, ALT, z1));
    pts.push(v(pts[0].x, ALT, z1));
    pts.push(v(pts[0].x, ALT, pts[0].z));
    return pts;
  }

  function genPerimeterRect(f, rounds=2) {
    const pts = [];
    const x0 = f.x0 + 7, x1 = f.x1 - 7;
    const z0 = f.z0 + 7, z1 = f.z1 - 7;
    for (let r=0; r<rounds; r++){
      pts.push(v(x0, ALT, z1));
      pts.push(v(x0, ALT, z0));
      pts.push(v(x1, ALT, z0));
      pts.push(v(x1, ALT, z1));
      pts.push(v(x0, ALT, z1));
    }
    return pts;
  }

  function genCircleCenters(f) {
    const x0 = f.x0 + 10, x1 = f.x1 - 10;
    const z0 = f.z0 + 10, z1 = f.z1 - 10;
    return [
      v(x0 + (x1-x0)*0.30, ALT, z0 + (z1-z0)*0.30),
      v(x0 + (x1-x0)*0.72, ALT, z0 + (z1-z0)*0.52),
      v(x0 + (x1-x0)*0.45, ALT, z0 + (z1-z0)*0.74),
    ];
  }

  function genCircleLoops(centers, radius=9, segments=28) {
    const pts = [];
    for (const c of centers) {
      for (let i=0;i<=segments;i++){
        const a = (i/segments) * Math.PI*2;
        pts.push(v(c.x + Math.cos(a)*radius, ALT, c.z + Math.sin(a)*radius));
      }
    }
    pts.push(pts[0].clone());
    return pts;
  }

  function genTriSweep(tri, rows=9) {
    const pts = [];
    const xL = tri.xL + 6;
    const xR = tri.xR - 6;
    const zT = tri.zTop + 6;
    const zB = tri.zBot - 6;
    for (let i=0;i<rows;i++){
      const t = rows===1?0:i/(rows-1);
      const z = zB - t*(zB-zT);
      const frac = (tri.zBot - z) / Math.max(1, (tri.zBot - tri.zTop));
      const xDiag = tri.xL + frac*(tri.xR - tri.xL);
      const xMax = Math.min(xR, xDiag - 6);
      const lr = (i%2===0);
      pts.push(v(lr ? xL : xMax, ALT, z));
      pts.push(v(lr ? xMax : xL, ALT, z));
    }
    pts.push(v(xL, ALT, zB));
    pts.push(pts[0].clone());
    return pts;
  }

  function genTransit(from, to, laneZ) {
    const zLane = THREE.MathUtils.clamp(laneZ, -90, 90);
    const dx = to.x - from.x;
    const s = Math.sign(dx || 1);
    const x1 = THREE.MathUtils.clamp(from.x + s*18, -130, 130);
    const x2 = THREE.MathUtils.clamp(to.x - s*18, -130, 130);
    return [ v(from.x, ALT, from.z), v(x1, ALT, zLane), v(x2, ALT, zLane), v(to.x, ALT, to.z) ];
  }

  // Build curves
  const core1 = genTriSweep({ xL: FIELDS.D.xL, xR: FIELDS.D.xR, zTop: FIELDS.D.zTop, zBot: FIELDS.D.zBot }, 10);
  const core2 = genCircleLoops(genCircleCenters(FIELDS.C), 9, 28);
  const core3 = genPerimeterRect(FIELDS.B, 3);
  const core4 = genLawnmowerRect(FIELDS.A, 9);

  const entry1 = core1[0], entry2 = core2[0], entry3 = core3[0], entry4 = core4[0];
  const t1 = genTransit(BASE, entry1, 55);
  const t2 = genTransit(BASE, entry2, 40);
  const t3 = genTransit(BASE, entry3, 25);
  const t4 = genTransit(BASE, entry4, 10);

  const curves = {
    d1: { transit: new THREE.CatmullRomCurve3(t1, false, "catmullrom", 0.0), core: new THREE.CatmullRomCurve3(core1, true, "catmullrom", 0.0) },
    d2: { transit: new THREE.CatmullRomCurve3(t2, false, "catmullrom", 0.0), core: new THREE.CatmullRomCurve3(core2, true, "catmullrom", 0.0) },
    d3: { transit: new THREE.CatmullRomCurve3(t3, false, "catmullrom", 0.0), core: new THREE.CatmullRomCurve3(core3, true, "catmullrom", 0.0) },
    d4: { transit: new THREE.CatmullRomCurve3(t4, false, "catmullrom", 0.0), core: new THREE.CatmullRomCurve3(core4, true, "catmullrom", 0.0) },
  };

  // Optional: draw faint paths
  function addPathLine(curve, colorHex, opacity=0.18) {
    const pts = curve.getPoints(180);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({ color: colorHex, transparent:true, opacity, dashSize: 3, gapSize: 4 });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    line.position.y = 0.12;
    scene.add(line);
  }
  addPathLine(curves.d1.core, 0xcbd5e1, 0.10);
  addPathLine(curves.d2.core, 0xcbd5e1, 0.10);
  addPathLine(curves.d3.core, 0xcbd5e1, 0.08);
  addPathLine(curves.d4.core, 0xcbd5e1, 0.10);

  // Create drones
  const drone1 = makeDrone(0x3b82f6);
  const drone2 = makeDrone(0x22c55e);
  const drone3 = makeDrone(0xf59e0b);
  const drone4 = makeDrone(0x7c3aed);
  scene.add(drone1.group, drone2.group, drone3.group, drone4.group);

  // Attach effects
  drone1.group.add(makeSprayCone());
  const photoRing = makePulseRing(0xe2e8f0);
  drone2.group.add(photoRing);
  const scanRing = makePulseRing(0xf59e0b);
  drone3.group.add(scanRing);
  const gridRing = makePulseRing(0x7c3aed);
  drone4.group.add(gridRing);

  // Takeoff staging
  const startPos = v(BASE.x, 1.0, BASE.z);
  [drone1,drone2,drone3,drone4].forEach((d, i) => {
    d.group.position.copy(startPos);
    d.group.position.x += (i-1.5) * 1.4;
  });

  // UI label projection
  const labels = [
    { el: $("l1"), s: $("s1"), obj: drone1.group },
    { el: $("l2"), s: $("s2"), obj: drone2.group },
    { el: $("l3"), s: $("s3"), obj: drone3.group },
    { el: $("l4"), s: $("s4"), obj: drone4.group },
  ];

  const tmpV = new THREE.Vector3();
  function updateLabel(label) {
    const rect = canvas.getBoundingClientRect();
    label.obj.getWorldPosition(tmpV);
    tmpV.project(camera);
    const x = (tmpV.x * 0.5 + 0.5) * rect.width;
    const y = (-tmpV.y * 0.5 + 0.5) * rect.height;
    label.el.style.left = `${x}px`;
    label.el.style.top = `${y}px`;
    const visible = tmpV.z > -1 && tmpV.z < 1;
    label.el.classList.toggle("hide", !visible);
  }

  // Photo pauses (Drone 2)
  const PHOTO = {
    dwell: 0.85,
    segments: 28,
    centerCount: 3,
  };

  function distanceAlongWithStops(tSec, speed, moveLen, stopCount, dwellSec) {
    const moveTime = moveLen / speed;
    const cycleTime = moveTime + stopCount * dwellSec;
    let t = ((tSec % cycleTime) + cycleTime) % cycleTime;

    // We distribute stops evenly along the loop length.
    for (let i = 0; i <= stopCount; i++) {
      const nextD = (i === stopCount) ? moveLen : (i / stopCount) * moveLen;
      const prevD = (i === 0) ? 0 : ((i - 1) / stopCount) * moveLen;
      const segD = nextD - prevD;
      const segT = segD / speed;
      if (t < segT) return { dist: prevD + t * speed, paused: false };
      t -= segT;
      if (i < stopCount) {
        if (t < dwellSec) return { dist: nextD, paused: true };
        t -= dwellSec;
      }
    }
    return { dist: 0, paused: false };
  }

    // Simulation
    const clock = new THREE.Clock();
    // (no FPS HUD in landing mode)

  const state = {
    t0: performance.now(),
    takeoffSec: 1.0,
  };

    function setSize() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", setSize);
    setSize();

  function placeAlong(droneRig, curve, u, heightJitter=0.0) {
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    droneRig.group.position.copy(p);
    droneRig.group.position.y = ALT + heightJitter;
    const yaw = Math.atan2(t.x, t.z);
    droneRig.group.rotation.set(0, yaw, 0);
  }

  function animate() {
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;

    // takeoff easing
    const takeoff = Math.min(1, t / state.takeoffSec);
    const lift = 1.0 + (ALT - 1.0) * (1 - Math.pow(1 - takeoff, 3));

    // Drone 1 (spray): transit then core loop
    {
      const transitDur = 2.2;
      if (t < transitDur) {
        placeAlong(drone1, curves.d1.transit, t / transitDur, 0.4*Math.sin(t*4));
        drone1.group.position.y = lift;
      } else {
        const u = ((t - transitDur) * 0.030) % 1;
        placeAlong(drone1, curves.d1.core, u, 0.25*Math.sin(t*3.3));
      }
    }

    // Drone 2 (photos): transit then loop with pauses
    {
      const transitDur = 2.4;
      const speed = 22;
      if (t < transitDur) {
        placeAlong(drone2, curves.d2.transit, t / transitDur, 0.35*Math.sin(t*4.2));
        drone2.group.position.y = lift;
        photoRing.material.opacity = 0;
      } else {
        const loopLen = curves.d2.core.getLength();
        const stopCount = 3;
        const out = distanceAlongWithStops(t - transitDur, speed, loopLen, stopCount, PHOTO.dwell);
        const u = THREE.MathUtils.clamp(out.dist / loopLen, 0, 1);
        placeAlong(drone2, curves.d2.core, u, 0.25*Math.sin(t*4.0));
        // photo flash ring
        if (out.paused) {
          const k = (Math.sin(t * 9.0) * 0.5 + 0.5);
          photoRing.scale.setScalar(0.9 + k * 2.2);
          photoRing.material.opacity = 0.18 + k * 0.12;
        } else {
          photoRing.material.opacity = 0.0;
        }
        $("s2").textContent = out.paused ? "Capturing photo" : "Executing";
      }
    }

    // Drone 3 (inspection): perimeter
    {
      const transitDur = 2.1;
      if (t < transitDur) {
        placeAlong(drone3, curves.d3.transit, t / transitDur, 0.35*Math.sin(t*3.8));
        drone3.group.position.y = lift;
      } else {
        const u = ((t - transitDur) * 0.024) % 1;
        placeAlong(drone3, curves.d3.core, u, 0.20*Math.sin(t*3.0));
      }
      const k = (Math.sin(t*2.2) * 0.5 + 0.5);
      scanRing.scale.setScalar(0.8 + k*3.0);
      scanRing.material.opacity = 0.04 + k * 0.10;
    }

    // Drone 4 (grid): scan
    {
      const transitDur = 2.0;
      if (t < transitDur) {
        placeAlong(drone4, curves.d4.transit, t / transitDur, 0.35*Math.sin(t*3.9));
        drone4.group.position.y = lift;
      } else {
        const u = ((t - transitDur) * 0.028) % 1;
        placeAlong(drone4, curves.d4.core, u, 0.20*Math.sin(t*3.2));
      }
      const k = (Math.sin(t*1.8) * 0.5 + 0.5);
      gridRing.scale.setScalar(0.9 + k*2.6);
      gridRing.material.opacity = 0.03 + k * 0.08;
    }

    // Render + labels
    renderer.render(scene, camera);
    labels.forEach(updateLabel);

    if (!prefersReduced) requestAnimationFrame(animate);
  }

    if (prefersReduced) {
      // Static render
      renderer.render(scene, camera);
      labels.forEach(updateLabel);
    } else {
      requestAnimationFrame(animate);
    }
  }

  loadThreeFromCdnThenStart(start);
})();
</script>
</body>
</html>

