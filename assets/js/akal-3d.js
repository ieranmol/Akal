/* AKAL Engineering — GMP facility delivery, 20-stage 3D build sequence
   Scroll-driven WebGL scene. Three.js r128, lazy-loaded on approach.
   Usage:  AkalScene.mount({ scroller, canvas, onStage })

   Stage -> geometry group index:
    0 URS & feasibility            10 HVAC ducting
    1 Site due diligence           11 AHU installation
    2 Conceptual design            12 Process utilities
    3 Detailed design & DQ         13 Electrical, BMS & EMS
    4 Procurement                  14 Cleanroom ceiling & HEPA
    5 Civil works & shell          15 Process equipment
    6 Floor finishes               16 Packaging & serialization
    7 Walls                        17 Commissioning
    8 Windows & doors              18 Qualification & validation
    9 Classification & airlocks    19 Handover                          */
(function (w, d) {
  "use strict";

  var THREE_SRC = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  var reduceMotion = w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STAGES = 20;

  var threePromise = null;
  function loadThree() {
    if (w.THREE) return Promise.resolve(w.THREE);
    if (threePromise) return threePromise;
    threePromise = new Promise(function (res, rej) {
      var s = d.createElement("script");
      s.src = THREE_SRC; s.async = true;
      s.setAttribute("data-akal-three", "");
      s.onload = function () { res(w.THREE); };
      s.onerror = function () { rej(new Error("three.js unavailable")); };
      d.head.appendChild(s);
    });
    return threePromise;
  }

  /* ---------- Facility data: 14 x 9 footprint on a 1 m setting-out grid ---------- */
  var ROOMS = [
    { n: "Raw Material Store",  x: -5,   z: -3,    w: 4,   d: 3,   cls: 0 },
    { n: "Dispensing",          x: -1.6, z: -3,    w: 2.8, d: 3,   cls: 2 },
    { n: "Granulation",         x: 1.4,  z: -3,    w: 3.2, d: 3,   cls: 2 },
    { n: "Plant Room",          x: 5,    z: -3,    w: 4,   d: 3,   cls: 3 },
    { n: "Primary Corridor",    x: 0,    z: -0.85, w: 14,  d: 1.3, cls: 1 },
    { n: "Compression",         x: -5.2, z: 1.3,   w: 3.6, d: 3,   cls: 2 },
    { n: "Coating",             x: -1.9, z: 1.3,   w: 3,   d: 3,   cls: 2 },
    { n: "Packaging Hall",      x: 1.3,  z: 1.3,   w: 3.4, d: 3,   cls: 1 },
    { n: "QC Laboratory",       x: 5,    z: 1.3,   w: 4,   d: 3,   cls: 0 },
    { n: "Dispatch & Airlocks", x: 0,    z: 3.65,  w: 14,  d: 1.7, cls: 0 }
  ];
  var WALLS_X = [
    { z: -4.5, a: -7, b: 7 }, { z: -1.5, a: -7, b: 7 }, { z: -0.2, a: -7, b: 7 },
    { z: 2.8,  a: -7, b: 7 }, { z: 4.5,  a: -7, b: 7 }
  ];
  var WALLS_Z = [
    { x: -7, a: -4.5, b: 4.5 }, { x: 7, a: -4.5, b: 4.5 },
    { x: -3, a: -4.5, b: -1.5 }, { x: -0.2, a: -4.5, b: -1.5 }, { x: 3, a: -4.5, b: -1.5 },
    { x: -3.4, a: -0.2, b: 2.8 }, { x: -0.4, a: -0.2, b: 2.8 }, { x: 3, a: -0.2, b: 2.8 },
    { x: -3, a: 2.8, b: 4.5 }, { x: 3, a: 2.8, b: 4.5 }
  ];
  var WH = 3.0, WT = 0.12;

  var C = {
    teal: 0x17a2b8, tealLight: 0x5fd0e0, tealDim: 0x128293,
    panel: 0xdfe7ee, panelDim: 0xb8c6d4, metal: 0x8fa3b5,
    steel: 0x6d8296, slab: 0x0b2b4a, glass: 0x5fd0e0, copper: 0xc98f6a
  };

  function mount(opts) {
    if (!opts || !opts.scroller || !opts.canvas) return;
    loadThree()
      .then(function (T) { build(T, opts); })
      .catch(function () { opts.canvas.setAttribute("data-akal-3d", "unavailable"); });
  }

  function build(THREE, opts) {
    var scroller = opts.scroller, host = opts.canvas;

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(w.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    scene.add(new THREE.HemisphereLight(0xdff2f7, 0x02182e, 1.0));
    var key = new THREE.DirectionalLight(0xffffff, 0.6); key.position.set(9, 16, 7); scene.add(key);
    var rim = new THREE.DirectionalLight(C.teal, 0.45); rim.position.set(-9, 5, -8); scene.add(rim);

    var plant = new THREE.Group();
    scene.add(plant);

    var G = [], i;
    for (i = 0; i < STAGES; i++) { var g = new THREE.Group(); plant.add(g); G.push(g); }

    function box(bw, bh, bd, color, o) {
      o = o || {};
      var mat = new THREE.MeshStandardMaterial({
        color: color, roughness: o.rough !== undefined ? o.rough : 0.75,
        metalness: o.metal || 0, transparent: true,
        opacity: o.opacity !== undefined ? o.opacity : 1,
        emissive: o.emissive || 0x000000, emissiveIntensity: o.emissiveIntensity || 0
      });
      var m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
      m.userData.base = mat.opacity;
      return m;
    }
    var V = THREE.Vector3;
    function lineLoop(pts, mat, base) {
      var l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat);
      l.userData.base = base; return l;
    }
    function seg(a, b, mat, base) {
      var l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), mat);
      l.userData.base = base; return l;
    }

    /* Perimeter sampled at many points so the outline can be *drawn*
       progressively via setDrawRange rather than popping in whole. */
    function rectPts(cx, cz, ww, dd, y, segs) {
      var pts = [], hw = ww / 2, hd = dd / 2;
      var corners = [[cx - hw, cz - hd], [cx + hw, cz - hd], [cx + hw, cz + hd], [cx - hw, cz + hd]];
      for (var s = 0; s < 4; s++) {
        var a = corners[s], b = corners[(s + 1) % 4];
        for (var q = 0; q < segs; q++) {
          var f = q / segs;
          pts.push(new V(a[0] + (b[0] - a[0]) * f, y, a[1] + (b[1] - a[1]) * f));
        }
      }
      pts.push(new V(corners[0][0], y, corners[0][1]));
      return pts;
    }
    function drawLine(pts, mat, base, seq) {
      var g = new THREE.BufferGeometry().setFromPoints(pts);
      var l = new THREE.Line(g, mat);
      l.userData.base = base;
      l.userData.draw = pts.length;
      if (seq !== undefined) l.userData.seq = seq;
      g.setDrawRange(0, 0);
      return l;
    }

    /* Sample a polyline at u in [0,1]; safe for 2-point paths. */
    function samplePath(path, u) {
      var n = path.length - 1;
      if (n < 1) return path[0].clone();
      var f = Math.min(Math.max(u, 0), 0.9999) * n;
      var i = Math.floor(f);
      return path[i].clone().lerp(path[i + 1], f - i);
    }
    function cone(r, h, color, o) {
      o = o || {};
      var m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 4),
        new THREE.MeshStandardMaterial({ color: color, transparent: true,
          opacity: o.opacity !== undefined ? o.opacity : 1,
          emissive: o.emissive || 0x000000, emissiveIntensity: o.emissiveIntensity || 0,
          roughness: 0.5 }));
      m.userData.base = m.material.opacity;
      return m;
    }

    var matGrid  = new THREE.LineBasicMaterial({ color: C.teal, transparent: true, opacity: 0.22 });
    var matPlan  = new THREE.LineBasicMaterial({ color: C.tealLight, transparent: true, opacity: 1 });
    var matDim   = new THREE.LineBasicMaterial({ color: C.tealLight, transparent: true, opacity: 0.6 });
    var matGhost = new THREE.LineBasicMaterial({ color: C.copper, transparent: true, opacity: 0.85 });

    /* 00 — URS & feasibility: setting-out datum, wiped in left to right */
    for (var gx = -7; gx <= 7; gx += 1) {
      var lx = seg(new V(gx, 0.01, -4.5), new V(gx, 0.01, 4.5), matGrid, 0.22);
      lx.userData.seq = (gx + 7) / 14;
      G[0].add(lx);
    }
    for (var gz = -4.5; gz <= 4.5; gz += 1) {
      var lz = seg(new V(-7, 0.01, gz), new V(7, 0.01, gz), matGrid, 0.22);
      lz.userData.seq = (gz + 4.5) / 9;
      G[0].add(lz);
    }
    /* Survey scan sweeping the site while requirements are captured */
    var matScan = new THREE.LineBasicMaterial({ color: C.tealLight, transparent: true, opacity: 0.9 });
    var scan = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new V(-7, 0.05, 0), new V(7, 0.05, 0)]), matScan);
    scan.userData.base = 0.9; scan.userData.scan = true;
    G[0].add(scan);
    /* Datum origin marker, pulsing */
    var origin = box(0.3, 0.02, 0.3, C.tealLight, { emissive: C.tealLight, emissiveIntensity: 0.9 });
    origin.position.set(0, 0.06, 0); origin.userData.pulse = true; origin.userData.until = 2.2;
    G[0].add(origin);

    /* --- URS: specification sheets being written, with a pen --- */
    [[-3.8, 2.5, -0.6, -0.22], [0, 2.75, 0.2, 0.05], [3.8, 2.45, -0.3, 0.26]].forEach(function (sh, si) {
      var sheet = box(2.3, 0.03, 3.0, 0xf2f6f8, { rough: 0.85, opacity: 0.94 });
      sheet.position.set(sh[0], sh[1], sh[2]);
      sheet.rotation.set(-0.12, sh[3], 0.05);
      sheet.userData.seq = si * 0.16;
      sheet.userData.bob = si * 1.7;
      sheet.userData.baseY = sh[1];
      sheet.userData.until = 1.5;
      G[0].add(sheet);

      for (var ln = 0; ln < 7; ln++) {
        var wRow = ln === 0 ? 1.2 : (1.75 - (ln % 3) * 0.3);
        var row = box(wRow, 0.012, 0.07, ln === 0 ? C.teal : C.tealDim,
                      { rough: 0.6, opacity: ln === 0 ? 0.95 : 0.7 });
        row.position.set(sh[0] - (1.9 - wRow) / 2 + 0.1, sh[1] + 0.03, sh[2] - 1.15 + ln * 0.35);
        row.rotation.set(-0.12, sh[3], 0.05);
        row.userData.seq = si * 0.16 + 0.06 + ln * 0.05;
        row.userData.bob = si * 1.7;
        row.userData.baseY = sh[1] + 0.03;
        row.userData.until = 1.5;
        G[0].add(row);
      }
    });
    /* Pen tracking across the middle sheet */
    var pen = box(0.07, 0.62, 0.07, C.copper, { metal: 0.4, rough: 0.4 });
    pen.rotation.set(0.34, 0, 0.26);
    pen.userData.pen = true; pen.userData.until = 1.5;
    G[0].add(pen);

    /* 01 — Site due diligence: boundary beyond the building line */
    /* --- Site selection: candidate locations assessed on a map --- */
    var mapPlane = box(17.6, 0.02, 12.6, 0x0a2340, { rough: 1, opacity: 0.55 });
    mapPlane.position.set(0, 0.015, 0); mapPlane.userData.seq = 0; mapPlane.userData.until = 2.6;
    G[1].add(mapPlane);
    [0.42, 0.62, 0.82].forEach(function (k, ci) {
      var contour = drawLine(rectPts(0, 0, 17.2 * k, 12.2 * k, 0.03, 14), matDim, 0.3, 0.08 + ci * 0.07);
      contour.userData.until = 2.6;
      G[1].add(contour);
    });
    G[1].add(drawLine(rectPts(0, 0, 17.2, 12.2, 0.02, 22), matDim, 0.55, 0));

    /* Candidate sites; the last is the one selected */
    var SITES = [[-6.4, -4.4, 0], [5.6, -4.6, 0], [-5.8, 4.4, 0], [6.2, 4.2, 0], [0, 0, 1]];
    SITES.forEach(function (s, sidx) {
      var chosen = s[2] === 1;
      var mk = cone(0.34, 0.95, chosen ? C.tealLight : C.metal,
                    { emissive: chosen ? C.tealLight : 0x000000, emissiveIntensity: chosen ? 0.8 : 0 });
      mk.rotation.x = Math.PI;                    /* point down, map-pin style */
      mk.position.set(s[0], 0.75, s[1]);
      mk.userData.seq = 0.18 + sidx * 0.11;
      mk.userData.bob = sidx * 1.1;
      mk.userData.baseY = 0.75;
      mk.userData.until = chosen ? 2.9 : 1.75;    /* rejected sites drop away first */
      G[1].add(mk);

      if (chosen) {
        var ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.8, 40),
          new THREE.MeshBasicMaterial({ color: C.tealLight, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(s[0], 0.06, s[1]);
        ring.userData.base = 0.7; ring.userData.ring = true;
        ring.userData.seq = 0.5; ring.userData.until = 2.9;
        G[1].add(ring);
      }
    });
    [[-8.6, -6.1], [8.6, -6.1], [8.6, 6.1], [-8.6, 6.1]].forEach(function (p, pi) {
      var pin = box(0.12, 0.9, 0.12, C.tealLight, { emissive: C.tealLight, emissiveIntensity: 0.5 });
      pin.position.set(p[0], 0.45, p[1]);
      pin.userData.seq = 0.25 + pi * 0.18;
      pin.userData.bob = pi * 1.4;
      pin.userData.baseY = 0.45;
      G[1].add(pin);
    });

    /* 02 — Conceptual design: room zoning */
    ROOMS.forEach(function (r, ri) {
      G[2].add(drawLine(rectPts(r.x, r.z, r.w, r.d, 0.03, 10), matPlan, 1, ri / ROOMS.length));
      if (r.cls === 2 || r.cls === 1) {
        var zone = box(r.w - 0.12, 0.02, r.d - 0.12, C.teal, { opacity: 0.16, rough: 1 });
        zone.position.set(r.x, 0.025, r.z);
        zone.userData.seq = ri / ROOMS.length + 0.12;
        zone.userData.flash = ri * 0.9;
        G[2].add(zone);
      }
      /* Sketch overshoot: a second, offset outline so the plan reads
         as drawn by hand rather than plotted. */
      var jx = (ri % 2 ? 1 : -1) * 0.07, jz = (ri % 3 ? 1 : -1) * 0.06;
      var sk = drawLine(rectPts(r.x + jx, r.z + jz, r.w, r.d, 0.028, 10), matPlan,
                        0.28, ri / ROOMS.length + 0.05);
      sk.userData.until = 3.4;
      G[2].add(sk);
    });

    /* --- Detailed design: personnel and material flow --- */
    var FLOWS = [
      { color: C.tealLight, label: "personnel",
        pts: [[-7.6, 3.65], [-3.2, 3.65], [-3.2, -0.85], [1.4, -0.85], [1.4, -3], [-1.6, -3]] },
      { color: C.copper, label: "material",
        pts: [[-5, -4.9], [-5, -3], [-1.6, -3], [1.4, -3], [1.4, -0.85], [1.3, 1.3], [4, 3.65]] }
    ];
    FLOWS.forEach(function (fl, fi) {
      var path = fl.pts.map(function (q) { return new V(q[0], 1.35 + fi * 0.28, q[1]); });

      var guide = new THREE.Line(new THREE.BufferGeometry().setFromPoints(path),
        new THREE.LineBasicMaterial({ color: fl.color, transparent: true, opacity: 0.3 }));
      guide.userData.base = 0.3; guide.userData.seq = fi * 0.12; guide.userData.until = 4.6;
      G[3].add(guide);

      for (var ai = 0; ai < 5; ai++) {
        var ar = cone(0.15, 0.42, fl.color, { emissive: fl.color, emissiveIntensity: 0.65 });
        ar.userData.flow = path;
        ar.userData.speed = 0.055 + fi * 0.012;
        ar.userData.offset = ai / 5;
        ar.userData.seq = fi * 0.12 + 0.1;
        ar.userData.until = 4.6;
        G[3].add(ar);
      }
    });

    /* 03 — Detailed design & DQ: dimension ticks */
    for (var dx = -7; dx <= 7; dx += 2) {
      var d1 = seg(new V(dx, 0.03, -5.4), new V(dx, 0.03, -4.9), matDim, 0.7);
      var d2 = seg(new V(dx, 0.03, 5.4),  new V(dx, 0.03, 4.9),  matDim, 0.7);
      d1.userData.until = d2.userData.until = 5.4;
      d1.userData.seq = d2.userData.seq = (dx + 7) / 14 * 0.4;
      G[3].add(d1); G[3].add(d2);
    }
    var dbase = seg(new V(-7, 0.03, -5.15), new V(7, 0.03, -5.15), matDim, 0.7);
    dbase.userData.until = 5.4;
    G[3].add(dbase);

    /* 04 — Procurement: long-lead equipment footprints reserved */
    [[-4.6, 1.3, 1.1], [-1.6, 1.3, 1.1], [-1.6, -3, 1.1], [1.4, -3, 1.1],
     [1.3, 1.3, 3.2], [5, -3, 3.2]].forEach(function (f, fi2) {
      var ghost = drawLine(rectPts(f[0], f[1], f[2], f[2], 0.04, 8), matGhost, 0.85, fi2 * 0.08);
      ghost.userData.until = 6.2;
      G[4].add(ghost);
    });

    /* --- Procurement: lead-time programme above the plan --- */
    var LEAD = [
      { n: "AHU",            start: 0.00, len: 0.62 },
      { n: "Panels",         start: 0.08, len: 0.44 },
      { n: "Filling line",   start: 0.14, len: 0.82 },
      { n: "Utilities skid", start: 0.30, len: 0.50 },
      { n: "Ductwork",       start: 0.44, len: 0.34 },
      { n: "Controls",       start: 0.58, len: 0.36 }
    ];
    var TL_X = -6.4, TL_W = 12.8, TL_Y = 3.1;
    var axis = box(TL_W, 0.03, 0.03, C.tealLight, { emissive: C.tealLight, emissiveIntensity: 0.5 });
    axis.position.set(TL_X + TL_W / 2, TL_Y + 0.55, -5.6);
    axis.userData.seq = 0; axis.userData.until = 5.6;
    G[4].add(axis);

    LEAD.forEach(function (b, bi) {
      var bw = TL_W * b.len;
      var bar = box(bw, 0.16, 0.34, bi % 2 ? C.teal : C.tealDim, { rough: 0.5, opacity: 0.9 });
      bar.position.set(TL_X + TL_W * b.start + bw / 2, TL_Y - bi * 0.42, -5.6);
      bar.userData.seq = 0.08 + bi * 0.1;
      bar.userData.growX = bw;                  /* bars extend left to right */
      bar.userData.originX = TL_X + TL_W * b.start;
      bar.userData.until = 5.6;
      G[4].add(bar);

      var ms = box(0.2, 0.2, 0.2, C.copper, { emissive: C.copper, emissiveIntensity: 0.7 });
      ms.rotation.y = Math.PI / 4;
      ms.position.set(TL_X + TL_W * (b.start + b.len), TL_Y - bi * 0.42, -5.6);
      ms.userData.seq = 0.08 + bi * 0.1 + 0.06;
      ms.userData.until = 5.6;
      G[4].add(ms);
    });
    /* Sweeping "today" marker down the programme */
    var todayLine = box(0.04, 2.9, 0.04, C.tealLight, { emissive: C.tealLight, emissiveIntensity: 0.9 });
    todayLine.position.set(TL_X, TL_Y - 0.9, -5.6);
    todayLine.userData.today = [TL_X, TL_W];
    todayLine.userData.seq = 0.2; todayLine.userData.until = 5.6;
    G[4].add(todayLine);

    /* 05 — Civil works & shell */
    var slab = box(14.4, 0.18, 9.4, C.slab, { rough: 0.95 });
    slab.position.y = -0.09; G[5].add(slab);
    [-7, -3.5, 0, 3.5, 7].forEach(function (cx) {
      [-4.5, 4.5].forEach(function (cz) {
        var col = box(0.26, 4.2, 0.26, C.steel, { metal: 0.55, rough: 0.45 });
        col.position.set(cx, 2.1, cz);
        col.userData.grow = true; col.userData.growH = 4.2;
        G[5].add(col);
      });
    });
    [-4.5, 4.5].forEach(function (bz) {
      var beam = box(14.4, 0.3, 0.22, C.steel, { metal: 0.55, rough: 0.45 });
      beam.position.set(0, 4.05, bz);
      beam.userData.seq = 0.55;
      G[5].add(beam);
    });

    /* --- Construction underway: tower crane --- */
    var craneX = -9.6, craneZ = -5.8, mastH = 7.2;
    var mast = box(0.24, mastH, 0.24, C.copper, { metal: 0.45, rough: 0.5 });
    mast.position.set(craneX, mastH / 2, craneZ);
    mast.userData.grow = true; mast.userData.growH = mastH; mast.userData.seq = 0;
    G[5].add(mast);

    var jib = new THREE.Group();
    jib.position.set(craneX, mastH, craneZ);
    jib.userData.crane = true;
    G[5].add(jib);
    var arm = box(8.4, 0.16, 0.16, C.copper, { metal: 0.45, rough: 0.5 });
    arm.position.set(3.4, 0, 0); arm.userData.seq = 0.3; jib.add(arm);
    var counter = box(2.4, 0.16, 0.16, C.copper, { metal: 0.45, rough: 0.5 });
    counter.position.set(-1.4, 0, 0); counter.userData.seq = 0.3; jib.add(counter);
    var cwt = box(0.5, 0.5, 0.5, C.steel, { metal: 0.5, rough: 0.5 });
    cwt.position.set(-2.3, -0.2, 0); cwt.userData.seq = 0.34; jib.add(cwt);
    var hoist = box(0.05, 2.6, 0.05, C.steel, { metal: 0.5, rough: 0.5, opacity: 0.85 });
    hoist.position.set(5.6, -1.3, 0); hoist.userData.seq = 0.4; jib.add(hoist);
    var load = box(0.5, 0.34, 0.5, C.panelDim, { rough: 0.7 });
    load.position.set(5.6, -2.75, 0); load.userData.seq = 0.44; jib.add(load);

    /* 06 — Floor finishes */
    ROOMS.forEach(function (r) {
      if (r.cls !== 2) return;
      var f = box(r.w - 0.1, 0.03, r.d - 0.1, C.tealDim, { rough: 0.5, opacity: 0.55 });
      f.position.set(r.x, 0.015, r.z); G[6].add(f);
    });

    /* 07 — Walls */
    function wall(cx, cz, ww, wd) {
      var m = box(ww, WH, wd, C.panel, { rough: 0.7 });
      m.position.set(cx, WH / 2, cz);
      m.userData.grow = true; m.userData.growH = WH;
      G[7].add(m);
    }
    WALLS_X.forEach(function (o) { wall((o.a + o.b) / 2, o.z, o.b - o.a, WT); });
    WALLS_Z.forEach(function (o) { wall(o.x, (o.a + o.b) / 2, WT, o.b - o.a); });

    /* 08 — Windows & doors */
    [{ z: -1.5, xs: [-5, -1.6, 1.4, 5] }, { z: -0.2, xs: [-5.2, -1.9, 1.3, 5] },
     { z: -4.5, xs: [-5, -1.6, 1.4] },    { z: 4.5,  xs: [-4, 0, 4] }].forEach(function (s) {
      s.xs.forEach(function (x) {
        var pane = box(1.25, 0.8, WT + 0.05, C.glass, { opacity: 0.38, rough: 0.15, metal: 0.1 });
        pane.position.set(x, 1.75, s.z); G[8].add(pane);
        var fr = box(1.4, 0.94, WT + 0.02, C.panelDim, { rough: 0.6 });
        fr.position.set(x, 1.75, s.z); G[8].add(fr);
      });
    });

    /* 09 — Classification & airlocks */
    ROOMS.forEach(function (r) {
      if (r.cls !== 2 && r.cls !== 1) return;
      var vol = box(r.w - 0.16, WH - 0.1, r.d - 0.16, r.cls === 2 ? C.teal : C.tealDim,
                    { opacity: r.cls === 2 ? 0.12 : 0.07, rough: 1 });
      vol.position.set(r.x, (WH - 0.1) / 2, r.z); G[9].add(vol);
    });
    [[-3.6, -0.85], [0.6, -0.85], [4.2, -0.85]].forEach(function (p) {
      var al = box(1.1, WH - 0.2, 1.1, C.tealLight, { opacity: 0.18, rough: 1 });
      al.position.set(p[0], (WH - 0.2) / 2, p[1]); G[9].add(al);
    });

    /* 10 — HVAC ducting */
    var main = box(13.4, 0.5, 0.62, C.metal, { metal: 0.5, rough: 0.4 });
    main.position.set(0, 3.62, -0.85); G[10].add(main);
    var ret = box(13.4, 0.36, 0.44, C.metal, { metal: 0.5, rough: 0.4 });
    ret.position.set(0, 3.62, -0.1); G[10].add(ret);
    ROOMS.forEach(function (r) {
      if (r.cls !== 2) return;
      var br = box(0.42, 0.34, Math.abs(r.z + 0.85), C.metal, { metal: 0.5, rough: 0.4 });
      br.position.set(r.x, 3.6, (r.z - 0.85) / 2); G[10].add(br);
      var dr = box(0.42, 0.5, 0.42, C.metal, { metal: 0.5, rough: 0.4 });
      dr.position.set(r.x, 3.35, r.z); G[10].add(dr);
    });

    /* 11 — AHU installation */
    var ahu = box(3.2, 2.3, 2.2, C.metal, { metal: 0.35, rough: 0.5 });
    ahu.position.set(5, 1.15, -3); G[11].add(ahu);
    [-1.1, -0.3, 0.5, 1.3].forEach(function (o) {
      var sg = box(0.06, 2.1, 2.05, C.teal, { metal: 0.4, rough: 0.45, emissive: C.teal, emissiveIntensity: 0.25 });
      sg.position.set(5 + o, 1.15, -3); G[11].add(sg);
    });
    var riser = box(0.7, 1.4, 0.7, C.metal, { metal: 0.5, rough: 0.4 });
    riser.position.set(5, 3.0, -3); G[11].add(riser);
    var spur = box(0.6, 0.5, 2.2, C.metal, { metal: 0.5, rough: 0.4 });
    spur.position.set(5, 3.62, -1.95); G[11].add(spur);

    /* 12 — Process utilities: pipe rack + skids */
    [2.35, 2.62].forEach(function (y, k) {
      var pipe = box(13.4, 0.13, 0.13, k ? C.copper : C.panelDim, { metal: 0.6, rough: 0.35 });
      pipe.position.set(0, y, -1.35); G[12].add(pipe);
    });
    for (var px = -6; px <= 6; px += 2) {
      var hanger = box(0.06, 0.5, 0.06, C.steel, { metal: 0.5, rough: 0.5 });
      hanger.position.set(px, 2.75, -1.35); G[12].add(hanger);
    }
    [3.9, 4.9, 5.9].forEach(function (sx) {
      var skid = box(0.8, 0.9, 0.8, C.panelDim, { metal: 0.4, rough: 0.5 });
      skid.position.set(sx, 0.45, -3.9); G[12].add(skid);
    });

    /* 13 — Electrical, BMS & EMS */
    var tray = box(13.4, 0.08, 0.34, C.steel, { metal: 0.6, rough: 0.4 });
    tray.position.set(0, 2.92, -0.35); G[13].add(tray);
    [[-6.4, -1.2], [6.4, -1.2]].forEach(function (p) {
      var panel = box(0.24, 1.6, 0.9, C.panelDim, { metal: 0.45, rough: 0.5 });
      panel.position.set(p[0], 0.8, p[1]); G[13].add(panel);
    });
    ROOMS.forEach(function (r) {
      if (r.cls !== 2 && r.cls !== 1) return;
      var sensor = box(0.16, 0.16, 0.16, C.tealLight, { emissive: C.tealLight, emissiveIntensity: 0.8 });
      sensor.position.set(r.x + r.w / 2 - 0.35, 2.2, r.z - r.d / 2 + 0.2); G[13].add(sensor);
    });

    /* 14 — Cleanroom ceiling & terminal HEPA */
    ROOMS.forEach(function (r) {
      if (r.cls !== 2 && r.cls !== 1) return;
      var c = box(r.w - 0.14, 0.09, r.d - 0.14, C.panelDim, { rough: 0.8 });
      c.position.set(r.x, WH - 0.06, r.z); G[14].add(c);
      if (r.cls !== 2) return;
      var cols = Math.max(1, Math.floor(r.w / 1.5)), rows = Math.max(1, Math.floor(r.d / 1.5));
      for (var a = 0; a < cols; a++) for (var b = 0; b < rows; b++) {
        var h = box(0.62, 0.07, 0.62, 0xffffff, { rough: 0.25, emissive: C.tealLight, emissiveIntensity: 0.35 });
        h.position.set(r.x - r.w / 2 + (a + 0.5) * (r.w / cols), WH - 0.13,
                       r.z - r.d / 2 + (b + 0.5) * (r.d / rows));
        G[14].add(h);
      }
    });

    /* 15 — Process equipment */
    [[-4.6, 1.3], [-1.6, 1.3], [-1.6, -3], [1.4, -3]].forEach(function (p) {
      var v = box(0.9, 1.5, 0.9, C.metal, { metal: 0.35, rough: 0.5 });
      v.position.set(p[0], 0.75, p[1]); G[15].add(v);
      var cap = box(0.96, 0.08, 0.96, C.teal, { emissive: C.teal, emissiveIntensity: 0.25 });
      cap.position.set(p[0], 1.54, p[1]); G[15].add(cap);
    });

    /* 16 — Packaging line & serialization */
    var conv = box(3.0, 0.12, 0.34, C.metal, { metal: 0.5, rough: 0.4 });
    conv.position.set(1.3, 0.75, 1.3); G[16].add(conv);
    [[-1.15, 0.95, 0.6], [-0.35, 1.25, 0.72], [0.45, 1.05, 0.6], [1.2, 1.35, 0.8]].forEach(function (m) {
      var mach = box(0.6, m[1], m[2], C.panelDim, { metal: 0.3, rough: 0.55 });
      mach.position.set(1.3 + m[0], m[1] / 2, 1.3); G[16].add(mach);
      var cap2 = box(0.64, 0.06, m[2] + 0.04, C.teal, { rough: 0.5, emissive: C.teal, emissiveIntensity: 0.3 });
      cap2.position.set(1.3 + m[0], m[1] + 0.03, 1.3); G[16].add(cap2);
    });
    var cam = box(0.18, 0.18, 0.18, C.tealLight, { emissive: C.tealLight, emissiveIntensity: 0.9 });
    cam.position.set(1.65, 1.7, 1.3); G[16].add(cam);

    /* 17 — Commissioning: test points */
    [[-5, -3], [-1.6, -3], [1.4, -3], [-5.2, 1.3],
     [-1.9, 1.3], [1.3, 1.3], [0, -0.85], [5, -3]].forEach(function (p) {
      var tp = box(0.14, 0.14, 0.14, C.copper, { emissive: C.copper, emissiveIntensity: 0.7 });
      tp.position.set(p[0], 2.4, p[1]); G[17].add(tp);
    });

    /* 18 — Qualification & validation: certification tags */
    ROOMS.forEach(function (r) {
      if (r.cls !== 2) return;
      var tag = box(0.5, 0.5, 0.03, C.tealLight, { emissive: C.tealLight, emissiveIntensity: 0.75, opacity: 0.9 });
      tag.position.set(r.x, 2.2, r.z - r.d / 2 + 0.08); G[18].add(tag);
    });

    /* 19 — Handover: qualified wash, no new geometry */
    var QUAL = new THREE.Color(C.tealLight);

    /* ---------- Cache traverse targets once ---------- */
    var NODES = [];
    for (var gi = 0; gi < STAGES; gi++) {
      var list = [];
      G[gi].traverse(function (o) { if (o.material) list.push(o); });
      list.forEach(function (o) { if (o.material.color) o.userData.orig = o.material.color.clone(); });
      NODES.push(list);
    }

    /* ---------- Scroll progress read from the section ---------- */
    var prog = 0, target = 0;
    function readProgress() {
      var r = scroller.getBoundingClientRect();
      var span = r.height - w.innerHeight;
      target = span > 0 ? Math.min(Math.max(-r.top / span, 0), 1) : 0;
    }
    w.addEventListener("scroll", readProgress, { passive: true });
    readProgress();

    function resize() {
      var cw = host.clientWidth, ch = host.clientHeight;
      if (!cw || !ch) return;
      camera.aspect = cw / ch; camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
      plant.position.x = cw > 900 ? 2.4 : 0;
    }
    w.addEventListener("resize", resize);
    resize();

    var onScreen = true;
    if ("IntersectionObserver" in w) {
      onScreen = false;
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { onScreen = e.isIntersecting; });
      }, { rootMargin: "150px" }).observe(scroller);
    }

    function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }

    var spin = 0, lastIdx = -1, clock = 0;
    var onStage = typeof opts.onStage === "function" ? opts.onStage : null;
    var onProgress = typeof opts.onProgress === "function" ? opts.onProgress : null;

    /* Pointer parallax — the model answers the cursor, which reads as
       "this is live" and invites the visitor to keep going. */
    var pxT = 0, pyT = 0, px = 0, py = 0;
    if (!reduceMotion) {
      w.addEventListener("pointermove", function (e) {
        pxT = (e.clientX / w.innerWidth - 0.5);
        pyT = (e.clientY / w.innerHeight - 0.5);
      }, { passive: true });
    }

    function frame() {
      requestAnimationFrame(frame);
      if (!onScreen) return;

      prog += (target - prog) * 0.075;
      clock += 0.016;
      px += (pxT - px) * 0.045;
      py += (pyT - py) * 0.045;
      if (!reduceMotion) spin += 0.0006;

      var sf = prog * STAGES;
      var idx = Math.min(STAGES - 1, Math.floor(sf));
      var j, list, o, s;

      for (j = 0; j < STAGES; j++) {
        var t = ease(Math.min(Math.max((sf - j) / 0.7, 0), 1));
        G[j].visible = t > 0.002;
        if (!G[j].visible) continue;
        list = NODES[j];
        for (var k = 0; k < list.length; k++) {
          o = list[k];
          var u = o.userData;

          /* Staggered entry: objects carrying .seq animate in sequence
             across the stage rather than all appearing together. */
          var tt = t;
          if (u.seq !== undefined) {
            tt = ease(Math.min(Math.max((sf - j - u.seq * 0.55) / 0.55, 0), 1));
          }
          o.material.opacity = (u.base !== undefined ? u.base : 1) * tt;

          /* Outlines draw themselves along their length */
          if (u.draw) o.geometry.setDrawRange(0, Math.max(2, Math.ceil(tt * u.draw)));

          if (u.grow) {
            s = Math.max(t, 0.001);
            o.scale.y = s;
            o.position.y = (u.growH / 2) * s;
          }

          /* Transient props clear once their stage has passed */
          if (u.until !== undefined) {
            o.material.opacity *= (1 - ease(Math.min(Math.max((sf - u.until) / 0.7, 0), 1)));
          }
          /* Programme bars extend along their length */
          if (u.growX) {
            o.scale.x = Math.max(tt, 0.001);
            o.position.x = u.originX + (u.growX / 2) * Math.max(tt, 0.001);
          }

          if (reduceMotion) continue;

          /* Pen tracking across the specification sheet */
          if (u.pen) {
            var pu = (clock * 0.30) % 1;
            o.position.set(-0.85 + pu * 1.75, 3.05, -0.9 + ((clock * 0.30) % 7) * 0.42 - 0.4);
          }
          /* Site marker ring expanding on the selected location */
          if (u.ring) {
            var rp = (clock * 0.5) % 1;
            o.scale.setScalar(0.5 + rp * 2.4);
            o.material.opacity *= (1 - rp);
          }
          /* Flow arrows travelling their route */
          if (u.flow) {
            var fu = (clock * u.speed + u.offset) % 1;
            var here = samplePath(u.flow, fu);
            var ahead = samplePath(u.flow, Math.min(fu + 0.02, 0.999));
            o.position.copy(here);
            if (ahead.distanceTo(here) > 0.0001) {
              o.lookAt(ahead);
              o.rotateX(Math.PI / 2);
            }
          }
          /* Programme "today" marker sweeping the timeline */
          if (u.today) {
            o.position.x = u.today[0] + ((clock * 0.16) % 1) * u.today[1];
          }

          /* Survey scan sweeping the site during definition */
          if (u.scan) {
            var sweep = (clock * 0.42) % 2;
            o.position.z = -4.5 + (sweep > 1 ? 2 - sweep : sweep) * 9;
            o.material.opacity *= 0.35 + 0.65 * Math.abs(Math.sin(clock * 1.3));
          }
          /* Datum origin pulse */
          if (u.pulse) {
            var pl = 1 + Math.sin(clock * 2.4) * 0.35;
            o.scale.set(pl, 1, pl);
            o.material.opacity *= 0.55 + 0.45 * Math.abs(Math.sin(clock * 2.4));
          }
          /* Survey pins settling */
          if (u.bob !== undefined) {
            o.position.y = u.baseY + Math.sin(clock * 1.6 + u.bob) * 0.07;
          }
          /* Zoning fills breathing as rooms are classified */
          if (u.flash !== undefined) {
            o.material.opacity *= 0.5 + 0.5 * Math.abs(Math.sin(clock * 1.1 + u.flash));
          }
        }
      }

      /* Tower crane slewing */
      if (!reduceMotion) {
        for (var cq = 0; cq < G[5].children.length; cq++) {
          if (G[5].children[cq].userData.crane) G[5].children[cq].rotation.y = clock * 0.16;
        }
      }

      /* Survey scan retires once design is fixed */
      var scanOut = ease(Math.min(Math.max((sf - 3) / 0.8, 0), 1));
      for (var sc = 0; sc < NODES[0].length; sc++) {
        if (NODES[0][sc].userData.scan || NODES[0][sc].userData.pulse)
          NODES[0][sc].material.opacity *= (1 - scanOut);
      }

      /* Anything in the early groups without its own `until` still
         recedes once the shell is up. */
      var fade = ease(Math.min(Math.max((sf - 5) / 0.7, 0), 1));
      [0, 1, 3, 4].forEach(function (gi2) {
        var l = NODES[gi2];
        for (var m = 0; m < l.length; m++) {
          if (l[m].userData.until === undefined) l[m].material.opacity *= (1 - 0.85 * fade);
        }
      });
      var planFade = ease(Math.min(Math.max((sf - 6) / 0.7, 0), 1));
      for (var pf = 0; pf < NODES[2].length; pf++) NODES[2][pf].material.opacity *= (1 - 0.8 * planFade);

      /* Qualified wash from the handover stage */
      var qv = ease(Math.min(Math.max((sf - 19) / 0.8, 0), 1));
      if (qv > 0.001) {
        for (var a2 = 0; a2 < STAGES; a2++) {
          var l2 = NODES[a2];
          for (var b2 = 0; b2 < l2.length; b2++) {
            var ob = l2[b2];
            if (ob.userData.orig) ob.material.color.copy(ob.userData.orig).lerp(QUAL, qv * 0.32);
          }
        }
      }

      var p01 = sf / STAGES;
      var elev = 1.50 - ease(p01) * 0.98 - py * 0.16;
      var azim = -0.45 + ease(p01) * 1.5 + spin + px * 0.30;
      var rad = 16 + ease(p01) * 8;
      if (!reduceMotion) {
        var calm = 1 - ease(Math.min(Math.max(sf / 4, 0), 1));  /* strongest in stages 1-3 */
        azim += Math.sin(clock * 0.25) * 0.05 * calm;
        elev += Math.sin(clock * 0.19) * 0.035 * calm;
      }
      camera.position.set(
        Math.sin(azim) * Math.cos(elev) * rad,
        Math.sin(elev) * rad + 1.3,
        Math.cos(azim) * Math.cos(elev) * rad
      );
      camera.lookAt(plant.position.x, 1.2, 0);

      renderer.render(scene, camera);

      if (onProgress) onProgress(prog);
      if (onStage && idx !== lastIdx) { lastIdx = idx; onStage(idx); }
    }
    requestAnimationFrame(frame);
  }

  w.AkalScene = { mount: mount, STAGES: STAGES };
})(window, document);
