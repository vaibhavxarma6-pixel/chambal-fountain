/* Chambal Fountain - Interactive 3D Fountain Configurator
   Adds a customisable 3D fountain preview to studio.html.
   Degrades gracefully when Three.js / WebGL is unavailable. */
(function () {
  'use strict';

  var STONES = [
    { name: 'Carrara White',   hex: '#ece7db', metal: 0    },
    { name: 'Travertine',      hex: '#d8c09a', metal: 0    },
    { name: 'Sandstone Gold',  hex: '#c9a268', metal: 0    },
    { name: 'Terracotta',      hex: '#b26f4c', metal: 0    },
    { name: 'Concrete Grey',   hex: '#9d9b95', metal: 0    },
    { name: 'Granite Noir',    hex: '#353532', metal: 0.05 },
    { name: 'Aged Bronze',     hex: '#9a6b3f', metal: 0.7  },
    { name: 'Forest Green',    hex: '#66796b', metal: 0    }
  ];

  var WATERS = [
    { name: 'Clear Blue', hex: '#8fc7d6' },
    { name: 'Turquoise',  hex: '#35a3b5' },
    { name: 'Deep Azure', hex: '#2f6fa3' },
    { name: 'Warm Amber', hex: '#c99a5b' }
  ];

  var FINISHES = [
    { name: 'Honed / natural',     roughness: 0.85, metalness: 0.02 },
    { name: 'Polished',            roughness: 0.22, metalness: 0.08 },
    { name: 'Antique / weathered', roughness: 0.96, metalness: 0.00 }
  ];

  var DESIGNS = [
    { key: 'classica', label: 'Classica', sub: 'Tiered & timeless',     form: 0 },
    { key: 'moderna',  label: 'Moderna',  sub: 'Clean & contemporary',  form: 1 },
    { key: 'parete',   label: 'Parete',   sub: 'Wall-mounted',          form: 2 },
    { key: 'bespoke',  label: 'Bespoke',  sub: 'Sculptural statement',  form: 3 },
    { key: 'romana',   label: 'Romana',   sub: 'Octagonal classical',   form: 4 },
    { key: 'colonna',  label: 'Colonna',  sub: 'Fluted pillar',         form: 5 },
    { key: 'cascata',  label: 'Cascata',  sub: 'Stepped cascade',       form: 6 },
    { key: 'monoliti', label: 'Monoliti', sub: 'Stacked stone slabs',   form: 7 },
    { key: 'ovale',    label: 'Ovale',    sub: 'Oval reflecting pool',  form: 8 },
    { key: 'giardino', label: 'Giardino', sub: 'Garden birdbath',       form: 9 },
    { key: 'sereno',   label: 'Sereno',   sub: 'Zen stone & bamboo',    form: 10 },
    { key: 'venezia',  label: 'Venezia',  sub: 'Shell & wall spout',    form: 11 },
    { key: 'archi',    label: 'Archi',    sub: 'Twin arch wall',        form: 12 },
    { key: 'aurora',   label: 'Aurora',   sub: 'Spiral sculptural',     form: 13 }
  ];

  var SCALES = [
    { label: 'Compact',   value: 0.78, form: 0 },
    { label: 'Medium',    value: 1.00, form: 1 },
    { label: 'Large',     value: 1.18, form: 2 },
    { label: 'Statement', value: 1.34, form: 3 }
  ];

  var state = { design: 0, stone: 0, water: 0, finish: 0, scale: 1 };

  var scene, camera, renderer, controls, fountainGroup, clock;
  var stoneMaterials = [], waterMaterials = [], animatedWater = [];
  var CAM_START = [5.4, 3.7, 6.6];
  var TARGET = [0, 1.5, 0];
  var ready = false;

  function byId(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- material factories ---------- */
  function stoneMat() {
    var mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(STONES[state.stone].hex),
      roughness: FINISHES[state.finish].roughness,
      metalness: Math.max(FINISHES[state.finish].metalness, STONES[state.stone].metal),
      side: THREE.DoubleSide
    });
    stoneMaterials.push(mat);
    return mat;
  }

  function waterMat(opacity) {
    var mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(WATERS[state.water].hex),
      transparent: true,
      opacity: opacity || 0.6,
      roughness: 0.12,
      metalness: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    waterMaterials.push(mat);
    return mat;
  }

  function addMesh(parent, geometry, material, x, y, z) {
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x || 0, y || 0, z || 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addPool(parent, geometry, material, x, y, z, base) {
    var mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x || 0, y || 0, z || 0);
    parent.add(mesh);
    animatedWater.push({ mesh: mesh, base: base || 0.6, phase: Math.abs(x || 0) + Math.abs(z || 0) + 0.7 });
    return mesh;
  }

  /* A hollow bowl built by revolving a stone profile. */
  function addBowl(parent, r, y, stone, water) {
    var pts = [
      new THREE.Vector2(0.001, 0),
      new THREE.Vector2(r * 0.30, 0.015),
      new THREE.Vector2(r * 0.55, 0.09),
      new THREE.Vector2(r * 0.80, 0.24),
      new THREE.Vector2(r, 0.42),
      new THREE.Vector2(r * 1.04, 0.46),
      new THREE.Vector2(r * 0.97, 0.47),
      new THREE.Vector2(r * 0.72, 0.29),
      new THREE.Vector2(r * 0.42, 0.15),
      new THREE.Vector2(0.001, 0.13)
    ];
    addMesh(parent, new THREE.LatheGeometry(pts, 48), stone, 0, y, 0);
    addPool(parent, new THREE.CircleGeometry(r * 0.74, 48), water, 0, y + 0.285, 0, 0.7);
  }

  /* ---------- the four designs ---------- */
  function buildClassica(g, stone, water) {
    addMesh(g, new THREE.CylinderGeometry(1.72, 1.62, 0.22, 48), stone, 0, 0.11, 0);
    addPool(g, new THREE.CircleGeometry(1.58, 48), water, 0, 0.225, 0, 0.62);
    addMesh(g, new THREE.CylinderGeometry(0.62, 0.75, 0.30, 32), stone, 0, 0.36, 0);
    addMesh(g, new THREE.CylinderGeometry(0.34, 0.40, 1.15, 32), stone, 0, 1.05, 0);
    addBowl(g, 1.28, 1.56, stone, water);
    addMesh(g, new THREE.CylinderGeometry(0.24, 0.28, 0.78, 28), stone, 0, 2.12, 0);
    addBowl(g, 0.88, 2.42, stone, water);
    addMesh(g, new THREE.CylinderGeometry(0.15, 0.18, 0.55, 24), stone, 0, 2.86, 0);
    addBowl(g, 0.52, 3.08, stone, water);
    addMesh(g, new THREE.SphereGeometry(0.13, 20, 16), stone, 0, 3.38, 0);
    addMesh(g, new THREE.CylinderGeometry(0.045, 0.075, 0.32, 10, 1, true), water, 0, 3.28, 0);
    addMesh(g, new THREE.CylinderGeometry(0.05, 0.11, 0.52, 10, 1, true), water, 0, 2.02, 0);
    addMesh(g, new THREE.CylinderGeometry(0.07, 0.16, 0.66, 10, 1, true), water, 0, 1.24, 0);
  }

  function buildModerna(g, stone, water) {
    addMesh(g, new THREE.BoxGeometry(3.6, 0.24, 2.3), stone, 0, 0.12, 0);
    addPool(g, new THREE.PlaneGeometry(3.3, 2.0), water, 0, 0.245, 0, 0.55);
    addMesh(g, new THREE.BoxGeometry(1.05, 2.8, 0.6), stone, -0.35, 1.58, -0.45);
    var dark = new THREE.MeshStandardMaterial({ color: 0x2a2721, roughness: 0.9 });
    addMesh(g, new THREE.BoxGeometry(0.08, 1.9, 0.62), dark, 0.02, 1.5, -0.45);
    addMesh(g, new THREE.BoxGeometry(0.62, 0.14, 1.15), stone, 0.05, 2.72, 0.15);
    var sheet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.25, 0.035), water);
    sheet.position.set(0.05, 1.55, 0.58);
    g.add(sheet);
    animatedWater.push({ mesh: sheet, base: 0.5, phase: 2.1 });
    addMesh(g, new THREE.BoxGeometry(1.4, 0.16, 0.5), stone, 0.15, 0.62, 0.35);
  }

  function buildParete(g, stone, water) {
    addMesh(g, new THREE.BoxGeometry(2.6, 0.28, 1.25), stone, 0, 0.14, 0.35);
    addPool(g, new THREE.PlaneGeometry(2.3, 0.95), water, 0, 0.285, 0.35, 0.6);
    addMesh(g, new THREE.BoxGeometry(3.4, 3.4, 0.4), stone, 0, 1.85, -0.85);
    var dark = new THREE.MeshStandardMaterial({ color: 0x3a352d, roughness: 1 });
    addMesh(g, new THREE.BoxGeometry(1.7, 2.0, 0.06), dark, 0, 1.95, -0.63);
    addMesh(g, new THREE.BoxGeometry(1.9, 0.12, 0.22), stone, 0, 3.0, -0.55);
    addMesh(g, new THREE.BoxGeometry(1.9, 0.12, 0.22), stone, 0, 0.92, -0.55);
    var spout = addMesh(g, new THREE.CylinderGeometry(0.12, 0.15, 0.42, 20), stone, 0, 2.55, -0.35);
    spout.rotation.x = Math.PI / 2;
    var stream = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 2.1, 10, 1, true), water);
    stream.position.set(0, 1.42, 0.02);
    g.add(stream);
    animatedWater.push({ mesh: stream, base: 0.55, phase: 1.7 });
  }

  function buildBespoke(g, stone, water) {
    addMesh(g, new THREE.CylinderGeometry(1.7, 1.6, 0.26, 48), stone, 0, 0.13, 0);
    addPool(g, new THREE.CircleGeometry(1.55, 48), water, 0, 0.27, 0, 0.6);
    addMesh(g, new THREE.TorusKnotGeometry(0.62, 0.17, 120, 14, 2, 3), stone, 0, 1.78, 0);
    addMesh(g, new THREE.CylinderGeometry(0.16, 0.22, 2.4, 24), stone, 0, 1.45, 0);
    for (var i = 0; i < 4; i++) {
      var a = (i / 4) * Math.PI * 2;
      var jet = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 1.05, 8, 1, true), water);
      jet.position.set(Math.cos(a) * 0.55, 2.2, Math.sin(a) * 0.55);
      jet.rotation.z = Math.cos(a) * 0.35;
      jet.rotation.x = -Math.sin(a) * 0.35;
      g.add(jet);
      animatedWater.push({ mesh: jet, base: 0.52, phase: i * 0.9 });
    }
    addMesh(g, new THREE.SphereGeometry(0.2, 24, 18), water, 0, 3.05, 0);
  }

  /* ---- ten additional designs ---- */
  function buildRomana(g, stone, water) {
    addMesh(g, new THREE.CylinderGeometry(1.75, 1.85, 0.26, 8), stone, 0, 0.13, 0);
    addPool(g, new THREE.CircleGeometry(1.6, 8), water, 0, 0.27, 0, 0.6);
    addMesh(g, new THREE.CylinderGeometry(0.42, 0.62, 1.5, 8), stone, 0, 1.02, 0);
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2;
      addMesh(g, new THREE.CylinderGeometry(0.045, 0.045, 1.35, 8), stone, Math.cos(a) * 0.44, 1.02, Math.sin(a) * 0.44);
    }
    addBowl(g, 1.25, 1.75, stone, water);
    addMesh(g, new THREE.CylinderGeometry(0.05, 0.09, 0.5, 10, 1, true), water, 0, 2.35, 0);
    addMesh(g, new THREE.SphereGeometry(0.12, 16, 12), stone, 0, 2.62, 0);
  }

  function buildColonna(g, stone, water) {
    addMesh(g, new THREE.CylinderGeometry(1.35, 1.45, 0.24, 32), stone, 0, 0.12, 0);
    addPool(g, new THREE.CircleGeometry(1.22, 32), water, 0, 0.245, 0, 0.58);
    addMesh(g, new THREE.CylinderGeometry(0.55, 0.7, 0.26, 32), stone, 0, 0.37, 0);
    addMesh(g, new THREE.CylinderGeometry(0.3, 0.36, 2.3, 24), stone, 0, 1.6, 0);
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * Math.PI * 2;
      addMesh(g, new THREE.CylinderGeometry(0.035, 0.035, 2.15, 8), stone, Math.cos(a) * 0.31, 1.6, Math.sin(a) * 0.31);
    }
    addBowl(g, 0.92, 2.85, stone, water);
    addMesh(g, new THREE.CylinderGeometry(0.04, 0.07, 0.4, 10, 1, true), water, 0, 3.35, 0);
  }

  function buildCascata(g, stone, water) {
    addMesh(g, new THREE.BoxGeometry(4.0, 0.24, 1.9), stone, 0, 0.12, 0);
    addPool(g, new THREE.PlaneGeometry(3.6, 1.5), water, 0, 0.245, 0, 0.55);
    for (var i = 0; i < 3; i++) {
      var w = 3.2 - i * 0.7, y = 0.55 + i * 0.55, z = -0.6 + i * 0.3;
      addMesh(g, new THREE.BoxGeometry(w, 0.18, 0.55), stone, 0, y, z);
      var sheet = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.2, 0.42), water);
      sheet.position.set(0, y - 0.11, z + 0.31);
      sheet.rotation.x = -0.32;
      g.add(sheet);
      animatedWater.push({ mesh: sheet, base: 0.5, phase: i * 0.8 });
    }
    addMesh(g, new THREE.BoxGeometry(3.4, 0.2, 0.5), stone, 0, 2.2, -0.1);
    addMesh(g, new THREE.BoxGeometry(1.0, 0.5, 0.7), stone, 0, 2.55, -0.45);
  }

  function buildMonoliti(g, stone, water) {
    addMesh(g, new THREE.BoxGeometry(3.4, 0.22, 1.8), stone, 0, 0.11, 0);
    addPool(g, new THREE.PlaneGeometry(3.0, 1.45), water, 0, 0.225, 0, 0.55);
    var sizes = [[1.5, 1.2, 0.5], [1.15, 1.0, 0.42], [0.8, 0.8, 0.36]];
    var ys = [0.85, 1.7, 2.4];
    for (var i = 0; i < 3; i++) {
      var x = i % 2 ? 0.18 : -0.18;
      addMesh(g, new THREE.BoxGeometry(sizes[i][0], sizes[i][2], sizes[i][1]), stone, x, ys[i], -0.25);
      var sheet = new THREE.Mesh(new THREE.BoxGeometry(sizes[i][0] * 0.7, 0.5, 0.02), water);
      sheet.position.set(x, ys[i] - 0.4, 0.12);
      g.add(sheet);
      animatedWater.push({ mesh: sheet, base: 0.46, phase: i * 1.1 });
    }
  }

  function buildOvale(g, stone, water) {
    var base = addMesh(g, new THREE.CylinderGeometry(1.95, 1.95, 0.26, 48), stone, 0, 0.13, 0);
    base.scale.z = 0.62;
    var pool = addPool(g, new THREE.CircleGeometry(1.78, 48), water, 0, 0.27, 0, 0.62);
    pool.scale.y = 0.62;
    addMesh(g, new THREE.CylinderGeometry(0.5, 0.62, 0.5, 32), stone, 0, 0.5, 0);
    addMesh(g, new THREE.SphereGeometry(0.55, 32, 24), stone, 0, 1.15, 0);
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2;
      var jet = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.75, 8, 1, true), water);
      jet.position.set(Math.cos(a) * 0.75, 1.5, Math.sin(a) * 0.47);
      jet.rotation.z = Math.cos(a) * 0.5;
      jet.rotation.x = -Math.sin(a) * 0.5;
      g.add(jet);
      animatedWater.push({ mesh: jet, base: 0.5, phase: i * 0.7 });
    }
  }

  function buildGiardino(g, stone, water) {
    addMesh(g, new THREE.CylinderGeometry(1.3, 1.35, 0.2, 32), stone, 0, 0.1, 0);
    addPool(g, new THREE.CircleGeometry(1.15, 32), water, 0, 0.21, 0, 0.58);
    addMesh(g, new THREE.CylinderGeometry(0.18, 0.28, 1.0, 24), stone, 0, 0.72, 0);
    addBowl(g, 0.95, 1.2, stone, water);
    addMesh(g, new THREE.CylinderGeometry(0.12, 0.15, 0.4, 20), stone, 0, 1.75, 0);
    var cap = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), stone);
    cap.position.y = 1.98;
    cap.castShadow = true;
    g.add(cap);
    addMesh(g, new THREE.SphereGeometry(0.07, 12, 10), stone, 0, 2.55, 0);
  }

  function buildSereno(g, stone, water) {
    addMesh(g, new THREE.CylinderGeometry(1.6, 1.65, 0.24, 40), stone, 0, 0.12, 0);
    addPool(g, new THREE.CircleGeometry(1.45, 40), water, 0, 0.245, 0, 0.55);
    var rock = addMesh(g, new THREE.DodecahedronGeometry(0.62, 1), stone, 0.1, 0.62, -0.15);
    rock.scale.set(1, 0.75, 0.85);
    rock.rotation.y = 0.6;
    var bamboo = addMesh(g, new THREE.CylinderGeometry(0.09, 0.09, 1.5, 12), stone, -0.85, 1.15, -0.75);
    bamboo.rotation.z = 0.75;
    var spout = addMesh(g, new THREE.CylinderGeometry(0.07, 0.07, 0.6, 12), stone, -0.35, 1.85, -0.5);
    spout.rotation.x = Math.PI / 2.4;
    var stream = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 1.0, 8, 1, true), water);
    stream.position.set(0, 1.3, -0.3);
    stream.rotation.z = 0.18;
    g.add(stream);
    animatedWater.push({ mesh: stream, base: 0.5, phase: 1.4 });
  }

  function buildVenezia(g, stone, water) {
    addMesh(g, new THREE.BoxGeometry(3.0, 2.8, 0.35), stone, 0, 1.5, -0.9);
    var dark = new THREE.MeshStandardMaterial({ color: 0x3a352d, roughness: 1 });
    addMesh(g, new THREE.BoxGeometry(1.5, 1.7, 0.05), dark, 0, 1.6, -0.7);
    var spout = addMesh(g, new THREE.CylinderGeometry(0.16, 0.2, 0.4, 16), stone, 0, 2.0, -0.45);
    spout.rotation.x = Math.PI / 2;
    var shell = new THREE.Mesh(new THREE.SphereGeometry(0.82, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), stone);
    shell.position.set(0, 1.05, 0.05);
    shell.castShadow = true;
    g.add(shell);
    addPool(g, new THREE.CircleGeometry(0.68, 32), water, 0, 0.92, 0.05, 0.6);
    var basin = addMesh(g, new THREE.CylinderGeometry(1.3, 1.3, 0.28, 32, 1, false, 0, Math.PI), stone, 0, 0.14, 0.3);
    basin.rotation.y = Math.PI / 2;
    addPool(g, new THREE.CircleGeometry(1.15, 32, 0, Math.PI), water, 0, 0.29, 0.3, 0.58);
    var stream = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.95, 10, 1, true), water);
    stream.position.set(0, 1.5, -0.05);
    g.add(stream);
    animatedWater.push({ mesh: stream, base: 0.55, phase: 1.9 });
  }

  function buildArchi(g, stone, water) {
    addMesh(g, new THREE.BoxGeometry(3.6, 3.0, 0.35), stone, 0, 1.6, -0.9);
    var dark = new THREE.MeshStandardMaterial({ color: 0x332f29, roughness: 1 });
    [-0.85, 0.85].forEach(function (x) {
      addMesh(g, new THREE.BoxGeometry(1.0, 1.6, 0.05), dark, x, 1.5, -0.7);
      var arch = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.09, 10, 24, Math.PI), stone);
      arch.position.set(x, 2.3, -0.6);
      g.add(arch);
      var spout = addMesh(g, new THREE.CylinderGeometry(0.07, 0.09, 0.3, 12), stone, x, 2.15, -0.4);
      spout.rotation.x = Math.PI / 2;
      var st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.5, 10, 1, true), water);
      st.position.set(x, 1.3, -0.1);
      g.add(st);
      animatedWater.push({ mesh: st, base: 0.5, phase: x });
    });
    addMesh(g, new THREE.BoxGeometry(3.2, 0.3, 0.85), stone, 0, 0.15, 0.2);
    addPool(g, new THREE.PlaneGeometry(2.9, 0.6), water, 0, 0.31, 0.2, 0.55);
  }

  function buildAurora(g, stone, water) {
    addMesh(g, new THREE.CylinderGeometry(1.55, 1.6, 0.24, 40), stone, 0, 0.12, 0);
    addPool(g, new THREE.CircleGeometry(1.4, 40), water, 0, 0.245, 0, 0.58);
    for (var i = 0; i < 7; i++) {
      var r = 0.75 - i * 0.075;
      var ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.11, 10, 32), stone);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = i * 0.55;
      ring.position.set(0, 0.6 + i * 0.33, 0);
      ring.castShadow = true;
      g.add(ring);
    }
    addMesh(g, new THREE.CylinderGeometry(0.12, 0.16, 2.5, 20), stone, 0, 1.4, 0);
    addMesh(g, new THREE.SphereGeometry(0.18, 20, 14), stone, 0, 2.85, 0);
    var sp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 2.0, 10, 1, true), water);
    sp.position.set(0.32, 1.8, 0.15);
    g.add(sp);
    animatedWater.push({ mesh: sp, base: 0.5, phase: 2.3 });
  }

  var BUILDERS = [buildClassica, buildModerna, buildParete, buildBespoke, buildRomana, buildColonna, buildCascata, buildMonoliti, buildOvale, buildGiardino, buildSereno, buildVenezia, buildArchi, buildAurora];

  function clearGroup() {
    if (!fountainGroup) return;
    while (fountainGroup.children.length) {
      var obj = fountainGroup.children.pop();
      obj.traverse(function (child) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          var list = Array.isArray(child.material) ? child.material : [child.material];
          list.forEach(function (m) { m.dispose(); });
        }
      });
    }
    stoneMaterials = [];
    waterMaterials = [];
    animatedWater = [];
  }

  function applyScale() {
    if (fountainGroup) fountainGroup.scale.setScalar(SCALES[state.scale].value);
  }

  function buildFountain() {
    if (!ready) return;
    clearGroup();
    var stone = stoneMat();
    var water = waterMat(0.6);
    BUILDERS[state.design](fountainGroup, stone, water);
    applyScale();
  }

  function updateColours() {
    var c = new THREE.Color(STONES[state.stone].hex);
    var f = FINISHES[state.finish];
    stoneMaterials.forEach(function (m) {
      m.color.copy(c);
      m.roughness = f.roughness;
      m.metalness = Math.max(f.metalness, STONES[state.stone].metal);
    });
    var wc = new THREE.Color(WATERS[state.water].hex);
    waterMaterials.forEach(function (m) { m.color.copy(wc); });
    updateFallback();
  }

  /* ---------- viewer setup ---------- */
  function initViewer() {
    var container = byId('fountain-canvas');
    if (!container || typeof window.THREE === 'undefined') return false;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(CAM_START[0], CAM_START[1], CAM_START[2]);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.insertBefore(renderer.domElement, container.firstChild);

    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    var hemi = new THREE.HemisphereLight(0xffffff, 0xd9cdb9, 0.45);
    scene.add(hemi);
    var key = new THREE.DirectionalLight(0xfff6e8, 1.15);
    key.position.set(5, 9, 6);
    key.castShadow = true;
    key.shadow.mapSize.width = 1024;
    key.shadow.mapSize.height = 1024;
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -3;
    key.shadow.bias = -0.0008;
    scene.add(key);
    var rim = new THREE.DirectionalLight(0xcfe2ee, 0.5);
    rim.position.set(-6, 4, -5);
    scene.add(rim);

    var ground = new THREE.Mesh(
      new THREE.CircleGeometry(9, 64),
      new THREE.MeshStandardMaterial({ color: 0x514b43, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    scene.add(ground);

    var platform = new THREE.Mesh(
      new THREE.CircleGeometry(2.9, 64),
      new THREE.MeshStandardMaterial({ color: 0x6d665b, roughness: 0.95 })
    );
    platform.rotation.x = -Math.PI / 2;
    platform.position.y = -0.01;
    platform.receiveShadow = true;
    scene.add(platform);

    fountainGroup = new THREE.Group();
    scene.add(fountainGroup);

    if (typeof THREE.OrbitControls === 'function') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.target.set(TARGET[0], TARGET[1], TARGET[2]);
      controls.enableRotate = true;
      controls.enablePan = true;
      controls.enableZoom = true;
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.minDistance = 3.2;
      controls.maxDistance = 14;
      controls.maxPolarAngle = Math.PI * 0.52;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.1;
      controls.update();
    }

    clock = new THREE.Clock();
    ready = true;
    buildFountain();

    var loading = byId('viewer-loading');
    if (loading) loading.classList.add('is-hidden');

    function resize() {
      var w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(container);
    else window.addEventListener('resize', resize);

    function animate() {
      requestAnimationFrame(animate);
      var t = clock.getElapsedTime();
      animatedWater.forEach(function (w) {
        w.mesh.material.opacity = w.base + Math.sin(t * 2.1 + w.phase) * 0.055;
      });
      if (controls) controls.update();
      renderer.render(scene, camera);
    }
    animate();
    return true;
  }

  /* Orbit the camera using the on-screen arrow pad. */
  function nudge(h, v) {
    if (!ready || !controls) return;
    var offset = camera.position.clone().sub(controls.target);
    var spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += h;
    spherical.phi = clamp(spherical.phi + v, 0.18, Math.PI * 0.52);
    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
    controls.update();
  }

  function resetView() {
    if (!ready) return;
    camera.position.set(CAM_START[0], CAM_START[1], CAM_START[2]);
    if (controls) {
      controls.target.set(TARGET[0], TARGET[1], TARGET[2]);
      controls.update();
    } else {
      camera.lookAt(TARGET[0], TARGET[1], TARGET[2]);
    }
    if (fountainGroup) fountainGroup.rotation.set(0, 0, 0);
  }

  /* ---------- CSS-only fallback ---------- */
  function updateFallback() {
    var fig = byId('css-fountain');
    if (!fig) return;
    fig.style.setProperty('--stone-color', STONES[state.stone].hex);
    fig.style.setProperty('--water-color', WATERS[state.water].hex);
    fig.className = 'css-fountain ' + DESIGNS[state.design].key;
  }

  function showFallback(message) {
    var canvas = byId('fountain-canvas');
    var fallback = byId('fountain-fallback');
    var loading = byId('viewer-loading');
    if (canvas) canvas.style.display = 'none';
    if (fallback) {
      fallback.classList.add('is-visible');
      var note = fallback.querySelector('.fallback-note');
      if (note && message) note.textContent = message;
    }
    if (loading) loading.classList.add('is-hidden');
    updateFallback();
  }

  /* ---------- UI ---------- */
  function makeChip(container, item, index) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.setAttribute('data-index', index);
    btn.setAttribute('aria-label', item.name);
    btn.style.background = item.hex;
    btn.title = item.name;
    container.appendChild(btn);
    return btn;
  }

  function markActive(selector, index) {
    var buttons = document.querySelectorAll(selector);
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle('is-active', i === index);
      buttons[i].setAttribute('aria-pressed', String(i === index));
    }
  }

  function setText(id, text) {
    var el = byId(id);
    if (el) el.textContent = text;
  }

  function setHidden(id, value) {
    var el = byId(id);
    if (el) el.value = value;
  }

  function syncHidden() {
    setHidden('cfg-design', DESIGNS[state.design].label);
    setHidden('cfg-colour', STONES[state.stone].name);
    setHidden('cfg-water', WATERS[state.water].name);
    setHidden('cfg-finish', FINISHES[state.finish].name);
    setHidden('cfg-scale', SCALES[state.scale].label);
  }

  function syncLabels() {
    setText('stone-name', STONES[state.stone].name);
    setText('water-name', WATERS[state.water].name);
    setText('finish-name', FINISHES[state.finish].name);
    setText('scale-value', SCALES[state.scale].label);
  }

  function setDesign(i) {
    state.design = clamp(i, 0, DESIGNS.length - 1);
    var sel = byId('design-select');
    if (sel) sel.value = state.design;
    buildFountain();
    updateFallback();
    syncHidden();
    var form = byId('model');
    if (form) form.selectedIndex = DESIGNS[state.design].form;
  }

  function setStone(i) {
    state.stone = clamp(i, 0, STONES.length - 1);
    markActive('#stone-swatches .swatch', state.stone);
    updateColours();
    syncLabels();
    syncHidden();
  }

  function setWater(i) {
    state.water = clamp(i, 0, WATERS.length - 1);
    markActive('#water-swatches .swatch', state.water);
    updateColours();
    syncLabels();
    syncHidden();
  }

  function setFinish(i) {
    state.finish = clamp(i, 0, FINISHES.length - 1);
    markActive('#finish-options .swatch', state.finish);
    updateColours();
    syncLabels();
    syncHidden();
    var form = byId('finish');
    if (form) form.selectedIndex = state.finish;
  }

  function setScale(i) {
    state.scale = clamp(i, 0, SCALES.length - 1);
    var range = byId('config-scale');
    if (range && Number(range.value) !== state.scale) range.value = state.scale;
    markActive('#scale-options .swatch', state.scale);
    applyScale();
    syncLabels();
    syncHidden();
    var form = byId('size');
    if (form) form.selectedIndex = SCALES[state.scale].form;
  }

  function buildControls() {
    var designBox = byId('design-select');
    var stoneBox = byId('stone-swatches');
    var waterBox = byId('water-swatches');
    var finishBox = byId('finish-options');
    var scaleBox = byId('scale-options');
    if (!designBox || !stoneBox || !waterBox || !finishBox || !scaleBox) return;

    DESIGNS.forEach(function (d, i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = d.label + ' - ' + d.sub;
      designBox.appendChild(opt);
    });
    STONES.forEach(function (s, i) { makeChip(stoneBox, s, i, 'stone'); });
    WATERS.forEach(function (w, i) { makeChip(waterBox, w, i, 'water'); });
    FINISHES.forEach(function (f, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.setAttribute('data-index', i);
      b.title = f.name;
      b.setAttribute('aria-label', f.name);
      b.style.background = ['#cfc8bb', '#e8e4da', '#a89b88'][i];
      finishBox.appendChild(b);
    });
    var scaleDots = ['S', 'M', 'L', 'XL'];
    scaleDots.forEach(function (label, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.setAttribute('data-index', i);
      b.title = SCALES[i].label;
      b.setAttribute('aria-label', SCALES[i].label);
      b.style.cssText = 'border-radius:9px;width:38px;height:34px;font:700 11px Inter,Arial,sans-serif;color:#4b443b';
      b.textContent = label;
      scaleBox.appendChild(b);
    });

    designBox.addEventListener('change', function () { setDesign(parseInt(this.value, 10)); });
    stoneBox.addEventListener('click', function (e) {
      var b = e.target.closest('.swatch');
      if (b) setStone(Number(b.getAttribute('data-index')));
    });
    waterBox.addEventListener('click', function (e) {
      var b = e.target.closest('.swatch');
      if (b) setWater(Number(b.getAttribute('data-index')));
    });
    finishBox.addEventListener('click', function (e) {
      var b = e.target.closest('.swatch');
      if (b) setFinish(Number(b.getAttribute('data-index')));
    });
    scaleBox.addEventListener('click', function (e) {
      var b = e.target.closest('.swatch');
      if (b) setScale(Number(b.getAttribute('data-index')));
    });
  }

  function bindControls() {
    var range = byId('config-scale');
    if (range) range.addEventListener('input', function () { setScale(parseInt(this.value, 10)); });

    var auto = byId('auto-rotate');
    if (auto) auto.addEventListener('change', function () {
      if (controls) controls.autoRotate = this.checked;
    });

    var reset = byId('reset-view');
    if (reset) reset.addEventListener('click', resetView);

    var pad = byId('nudge-pad');
    if (pad) pad.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var dir = b.getAttribute('data-dir');
      if (dir === 'left') nudge(-0.22, 0);
      if (dir === 'right') nudge(0.22, 0);
      if (dir === 'up') nudge(0, -0.18);
      if (dir === 'down') nudge(0, 0.18);
    });

    var send = byId('send-brief');
    if (send) send.addEventListener('click', function () {
      var s = window.FountainConfig.getSummary();
      var msg = [
        'Hello Chambal Fountain, I would like to discuss a custom fountain.',
        'Design: ' + s.design,
        'Stone colour: ' + s.colour,
        'Finish: ' + s.finish,
        'Water tint: ' + s.water,
        'Scale: ' + s.scale,
        'Please share a quotation and next steps.'
      ].join('\n');
      window.open('https://wa.me/919829029406?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      this.innerHTML = 'Opening WhatsApp &#10003;';
      var self = this;
      window.setTimeout(function () { self.innerHTML = 'Send My Design Brief &#8599;'; }, 2600);
    });
  }

  function init() {
    if (!byId('fountain-canvas')) return;
    buildControls();
    bindControls();
    var designSel = byId('design-select');
    if (designSel) designSel.value = state.design;
    markActive('#stone-swatches .swatch', state.stone);
    markActive('#water-swatches .swatch', state.water);
    markActive('#finish-options .swatch', state.finish);
    markActive('#scale-options .swatch', state.scale);
    syncLabels();
    syncHidden();
    updateFallback();

    if (typeof window.THREE === 'undefined') {
      showFallback('The interactive 3D preview needs an internet connection to load its 3D engine. You can still choose a design, colour and finish below, and your preferences will be added to your enquiry.');
      return;
    }
    try {
      if (!initViewer()) {
        showFallback('Your browser could not start the 3D preview. You can still choose a design, colour and finish below.');
      }
    } catch (err) {
      showFallback('Your browser could not start the 3D preview. You can still choose a design, colour and finish below.');
    }
  }

  window.FountainConfig = {
    getSummary: function () {
      return {
        design: DESIGNS[state.design].label,
        colour: STONES[state.stone].name,
        water: WATERS[state.water].name,
        finish: FINISHES[state.finish].name,
        scale: SCALES[state.scale].label
      };
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
