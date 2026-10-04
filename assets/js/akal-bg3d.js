/* AKAL Engineering — self-playing 3D page backgrounds
   Home:          plan to production (floor plan → walls → equipment → line → qualified)
   Pharma:        bottling/packaging line built and qualified IQ → OQ → PQ
   Nutraceutical: capsules from hopper into bottles, filled and released

   Usage: <body data-akbg="lifecycle" data-akbg3d="home">
          + akal-bg.js (2D engine, used as fallback) + this file.
   Three.js r128 is lazy-loaded after the page has loaded. Phones, data-saver,
   missing WebGL or a failed load fall back to the matching 2D scene.        */
(function (w, d) {
  "use strict";

  var THREE_SRC = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  var reduceMotion = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { teal: 0x17a2b8, tealL: 0x5fd0e0, mint: 0x7ef2c0, panel: 0x9fc4d4 };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function seg(p, a, b) { return ease((p - a) / (b - a)); }

  function webglOK() {
    try { var c = d.createElement("canvas"); return !!(w.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"))); }
    catch (e) { return false; }
  }
  function loadThree() {
    if (w.THREE) return Promise.resolve(w.THREE);
    return new Promise(function (res, rej) {
      var s = d.createElement("script"); s.src = THREE_SRC; s.async = true;
      s.onload = function () { res(w.THREE); }; s.onerror = rej; d.head.appendChild(s);
    });
  }

  /* ======================================================================
     Shared building blocks
     ====================================================================== */
  function kit(THREE) {
    var K = {};
    /* Outlined solid: faint fill + crisp teal edges, fades as one unit */
    K.part = function (geom, o) {
      o = o || {};
      var g = new THREE.Group();
      var fill = new THREE.Mesh(geom, new THREE.MeshLambertMaterial({ color: o.fill || C.panel, transparent: true, opacity: 0, depthWrite: false }));
      var edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, o.angle || 20), new THREE.LineBasicMaterial({ color: o.line || C.teal, transparent: true, opacity: 0 }));
      g.add(fill); g.add(edges);
      g.userData = { fill: fill, edges: edges, fo: o.fo !== undefined ? o.fo : 0.12, lo: o.lo !== undefined ? o.lo : 0.85, base: new THREE.Color(o.line || C.teal) };
      return g;
    };
    K.show = function (g, f) {
      var u = g.userData; g.visible = f > 0.003;
      if (u.fill) { u.fill.material.opacity = u.fo * f; u.edges.material.opacity = u.lo * f; }
    };
    K.tint = function (g, col, k) { if (g.userData.edges) g.userData.edges.material.color.copy(g.userData.base).lerp(col, k); };
    /* Line loop that draws itself */
    K.loop = function (pts, col, op) {
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: col || C.teal, transparent: true, opacity: op || 0.8 }));
      l.userData.n = pts.length; return l;
    };
    K.draw = function (l, f) { l.visible = f > 0.003; l.geometry.setDrawRange(0, Math.max(2, Math.ceil(l.userData.n * clamp(f, 0, 1)))); };
    K.rect = function (x, z, ww, dd, y) {
      var V = THREE.Vector3, h = ww / 2, e = dd / 2;
      return [new V(x - h, y, z - e), new V(x + h, y, z - e), new V(x + h, y, z + e), new V(x - h, y, z + e), new V(x - h, y, z - e)];
    };
    /* Bottle profile for LatheGeometry */
    K.bottleGeo = function (r, h) {
      var V = THREE.Vector2, p = [new V(0, 0), new V(r, 0), new V(r, h * 0.68), new V(r * 0.5, h * 0.86), new V(r * 0.5, h), new V(0, h)];
      return new THREE.LatheGeometry(p, 14);
    };
    K.capsuleGeo = function (r, len) {
      var pts = [], V = THREE.Vector2, i, a;
      for (i = 0; i <= 6; i++) { a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); pts.push(new V(Math.cos(a) * r, -len / 2 + Math.sin(a) * r)); }
      for (i = 0; i <= 6; i++) { a = (i / 6) * (Math.PI / 2); pts.push(new V(Math.cos(a) * r, len / 2 + Math.sin(a) * r)); }
      return new THREE.LatheGeometry(pts, 10);
    };
    return K;
  }

  /* ======================================================================
     SCENES — build(THREE, root, K) -> { update(p, t), camera: {elev, azim, rad, look} }
     ====================================================================== */
  var SC = {};

  /* ---- Home: plan to production -------------------------------------- */
  SC.home = function (THREE, root, K) {
    var grid = new THREE.GridHelper(30, 30, C.teal, C.teal);
    grid.material.transparent = true; grid.material.opacity = 0.16; root.add(grid);

    var ROOMS = [[-4.5, -2.2, 5, 3.6], [0.6, -2.2, 5.2, 3.6], [5.2, -2.2, 4, 3.6], [-4.5, 1.8, 5, 4.4], [1.8, 1.8, 7.6, 4.4]];
    var plans = [], walls = [], equip = [];
    ROOMS.forEach(function (r, i) {
      var pl = K.loop(K.rect(r[0], r[1], r[2] - 0.15, r[3] - 0.15, 0.02), C.tealL, 0.9); root.add(pl); plans.push(pl);
      var wl = K.part(new THREE.BoxGeometry(r[2] - 0.15, 2.4, r[3] - 0.15), { fo: 0.06, lo: 0.55 });
      wl.position.set(r[0], 1.2, r[1]); root.add(wl); walls.push(wl);
    });
    /* process equipment */
    [[-5.6, -2.2, "tank"], [-3.4, -2.2, "tank"], [0, -2.2, "box"], [1.8, -2.2, "box"], [5.2, -2.2, "ahu"], [-4.5, 1.8, "drum"]].forEach(function (e) {
      var g;
      if (e[2] === "tank") g = K.part(new THREE.CylinderGeometry(0.6, 0.6, 1.8, 18), { lo: 0.9 });
      else if (e[2] === "ahu") g = K.part(new THREE.BoxGeometry(2.6, 1.2, 1.4), { lo: 0.9 });
      else if (e[2] === "drum") g = K.part(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 20), { lo: 0.9 });
      else g = K.part(new THREE.BoxGeometry(1.2, 1.5, 1.2), { lo: 0.9 });
      g.position.set(e[0], (e[2] === "ahu" ? 0.6 : e[2] === "box" ? 0.75 : e[2] === "drum" ? 0.8 : 0.9), e[1]);
      if (e[2] === "drum") g.rotation.z = Math.PI / 2;
      root.add(g); equip.push(g);
    });
    /* packaging line in the large hall */
    var conv = K.part(new THREE.BoxGeometry(7, 0.25, 0.8), { lo: 0.9 }); conv.position.set(1.8, 0.85, 2.6); root.add(conv);
    var bottles = [], bg = K.bottleGeo(0.16, 0.5);
    for (var i = 0; i < 12; i++) { var b = K.part(bg, { line: C.tealL, lo: 0.9, fo: 0.15 }); root.add(b); bottles.push(b); }

    var MINT = new THREE.Color(C.mint);
    return {
      update: function (p, t) {
        var intro = reduceMotion ? 1 : seg(t, 0.3, 3.0);
        var fPlan = Math.max(seg(p, 0, 0.22), intro), fWall = seg(p, 0.18, 0.45), fEq = seg(p, 0.42, 0.68), fLine = seg(p, 0.62, 0.86), fQ = seg(p, 0.86, 1);
        plans.forEach(function (pl, i) { K.draw(pl, seg(fPlan, i * 0.12, i * 0.12 + 0.5)); });
        walls.forEach(function (wl, i) {
          var f = seg(fWall, i * 0.1, i * 0.1 + 0.6); K.show(wl, f);
          wl.scale.y = Math.max(f, 0.001); wl.position.y = 1.2 * wl.scale.y; K.tint(wl, MINT, fQ * 0.7);
        });
        equip.forEach(function (e, i) { var f = seg(fEq, i * 0.12, i * 0.12 + 0.4); K.show(e, f); e.scale.setScalar(0.6 + 0.4 * f); K.tint(e, MINT, fQ * 0.7); });
        K.show(conv, fLine); K.tint(conv, MINT, fQ * 0.7);
        bottles.forEach(function (b, i) {
          var u = ((t * 0.06 + i / bottles.length) % 1);
          b.position.set(1.8 - 3.3 + u * 6.6, 0.98, 2.6);
          K.show(b, fLine * Math.sin(u * Math.PI)); K.tint(b, MINT, fQ);
        });
      },
      camera: function (p) {
        return { elev: 1.38 - ease(p) * 0.86, azim: -0.5 + ease(p) * 1.1, rad: 17 - ease(p) * 2, look: [0.5, 0.4, 0] };
      }
    };
  };

  /* ---- Pharma: packaging line qualified IQ → OQ → PQ ------------------ */
  SC.pharma = function (THREE, root, K) {
    var grid = new THREE.GridHelper(32, 32, C.teal, C.teal);
    grid.material.transparent = true; grid.material.opacity = 0.14; root.add(grid);
    var LEN = 22;
    var conv = K.part(new THREE.BoxGeometry(LEN, 0.3, 1.2), { lo: 0.9, fo: 0.1 }); conv.position.y = 1.1; root.add(conv);
    var legs = [];
    for (var x = -10; x <= 10; x += 4) { var lg = K.part(new THREE.BoxGeometry(0.12, 1.0, 1.0), { lo: 0.6, fo: 0 }); lg.position.set(x, 0.5, 0); root.add(lg); legs.push(lg); }
    var rollers = [];
    for (var rx = -10.6; rx <= 10.6; rx += 0.8) {
      var ro = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 8), new THREE.MeshBasicMaterial({ color: C.teal, wireframe: true, transparent: true, opacity: 0 }));
      ro.rotation.x = Math.PI / 2; ro.position.set(rx, 1.28, 0); root.add(ro); rollers.push(ro);
    }
    /* five generic stations: hopper/counter, filler, capper, sealer, labeler */
    var SX = [-8, -4, 0, 4, 8], stations = [];
    SX.forEach(function (sx, i) {
      var g = new THREE.Group();
      var frame = K.part(new THREE.BoxGeometry(2.4, 2.4, 1.8), { lo: 0.75, fo: 0.07 }); frame.position.y = 3.0; g.add(frame);
      var head;
      if (i === 0) { head = K.part(new THREE.CylinderGeometry(1.0, 0.25, 1.4, 16, 1, true), { lo: 0.95 }); head.position.y = 4.9; }
      else if (i === 1) { head = K.part(new THREE.CylinderGeometry(0.18, 0.18, 1.0, 10), { lo: 0.95 }); head.position.y = 1.95; }
      else if (i === 2) { head = K.part(new THREE.CylinderGeometry(0.45, 0.45, 0.5, 16), { lo: 0.95 }); head.position.y = 2.0; }
      else if (i === 3) { head = K.part(new THREE.BoxGeometry(1.6, 0.35, 1.0), { lo: 0.95 }); head.position.y = 2.05; }
      else { head = K.part(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 20), { lo: 0.95 }); head.rotation.x = Math.PI / 2; head.position.set(0, 2.3, 0.9); }
      g.add(head); g.position.x = sx; root.add(g);
      stations.push({ g: g, parts: [frame, head], head: head });
    });
    /* bottles */
    var bottles = [], NB = 16, bgeo = K.bottleGeo(0.3, 0.9), cgeo = new THREE.CylinderGeometry(0.17, 0.17, 0.14, 12);
    var lgeo = new THREE.CylinderGeometry(0.31, 0.31, 0.3, 14, 1, true);
    for (var i = 0; i < NB; i++) {
      var bt = K.part(bgeo, { line: C.tealL, lo: 0.95, fo: 0.12 });
      var cap = K.part(cgeo, { lo: 1 }); cap.position.y = 0.97; bt.add(cap);
      var lab = K.part(lgeo, { line: C.mint, lo: 0.9, fo: 0.2 }); lab.position.y = 0.32; bt.add(lab);
      bt.userData.cap = cap; bt.userData.lab = lab; root.add(bt); bottles.push(bt);
    }
    /* tablets dropping at the filler */
    var tabs = [], tg = new THREE.SphereGeometry(0.07, 6, 4);
    for (var k = 0; k < 18; k++) {
      var tb = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: C.tealL, transparent: true, opacity: 0 }));
      tb.scale.y = 0.55; tb.userData.o = Math.random(); root.add(tb); tabs.push(tb);
    }
    /* release gate */
    var gate = K.loop(K.rect(10.3, 0, 0.1, 1.6, 1.3).map(function (v) { return new THREE.Vector3(10.3, v.y + (v.z > 0 ? 1.4 : 0), v.z); }), C.mint, 0.9); root.add(gate);

    var MINT = new THREE.Color(C.mint), travel = 0, lastT = 0, phase = "";
    var hud = d.createElement("div"); hud.className = "akbg-hud"; hud.setAttribute("aria-hidden", "true");
    hud.innerHTML = '<span>Qual.</span><b data-k="IQ">IQ</b><b data-k="OQ">OQ</b><b data-k="PQ">PQ</b>';
    d.body.appendChild(hud);
    function hudFits() {
      var wr = d.querySelector("section .wrap"), gut = wr ? wr.getBoundingClientRect().left : 0;
      hud.style.display = gut > hud.offsetWidth + 30 ? "" : "none";
    }
    w.addEventListener("resize", hudFits); hudFits();
    setTimeout(function () { hudFits(); hud.classList.add("on"); }, 400);
    var hb = [].slice.call(hud.querySelectorAll("b"));

    return {
      update: function (p, t) {
        var intro = reduceMotion ? 0.35 : seg(t, 0.3, 3.0) * 0.35;
        var iq = Math.max(seg(p, 0, 0.34), intro), oq = seg(p, 0.3, 0.62), pq = seg(p, 0.6, 0.92), rel = seg(p, 0.9, 1);
        K.show(conv, seg(iq, 0, 0.2)); legs.forEach(function (l, i) { K.show(l, seg(iq, 0.02 * i, 0.2 + 0.02 * i)); });
        stations.forEach(function (s, i) {
          var f = seg(iq, 0.15 + i * 0.15, 0.35 + i * 0.15);
          s.parts.forEach(function (pt) { K.show(pt, f); K.tint(pt, MINT, rel * 0.8); });
          s.g.position.y = (1 - f) * 1.2;
        });
        var speed = 0.05 + oq * 1.6, dt = t - lastT; lastT = t;
        if (!reduceMotion) travel += dt * speed;
        rollers.forEach(function (r) { r.material.opacity = 0.5 * iq; r.rotation.y = -travel * 3; });
        var spacing = LEN / NB;
        bottles.forEach(function (b, i) {
          var x = ((i * spacing + travel) % LEN) - LEN / 2;
          b.position.set(x, 1.27, 0);
          var edge = Math.min(1, (LEN / 2 - Math.abs(x)) / 1.2);
          K.show(b, oq * edge);
          var capped = pq > 0 && x > 0.2, labelled = pq > 0 && x > 8.3;
          K.show(b.userData.cap, capped ? oq * edge : 0); K.show(b.userData.lab, labelled ? oq * edge : 0);
          K.tint(b, MINT, pq > 0 && x > 10.3 ? 1 : rel);
        });
        tabs.forEach(function (tb) {
          var u = ((t * 0.9 + tb.userData.o) % 1);
          tb.position.set(-8 + (tb.userData.o - 0.5) * 0.4, 4.3 - u * 3.0, (tb.userData.o - 0.5) * 0.3);
          tb.material.opacity = 0.9 * pq * (reduceMotion ? 0 : 1);
        });
        K.draw(gate, pq);
        var ph = p < 0.31 ? "IQ" : p < 0.61 ? "OQ" : "PQ";
        if (ph !== phase) {
          phase = ph;
          hb.forEach(function (b) { var k = b.getAttribute("data-k"); b.className = k === ph ? "cur" : (k < ph ? "done" : ""); });
        }
        if (rel > 0.98) hb.forEach(function (b) { b.className = "done"; });
      },
      camera: function (p) {
        return { elev: 0.62 - ease(p) * 0.3, azim: -0.85 + ease(p) * 1.25, rad: 19 - ease(p) * 3, look: [ -2 + ease(p) * 4, 1.6, 0] };
      }
    };
  };

  /* ---- Nutraceutical: capsules from hopper into bottles --------------- */
  SC.nutra = function (THREE, root, K) {
    var grid = new THREE.GridHelper(30, 30, C.teal, C.teal);
    grid.material.transparent = true; grid.material.opacity = 0.14; root.add(grid);
    var HY = 7.2;
    var hop = K.part(new THREE.CylinderGeometry(2.6, 0.5, 2.6, 24, 1, true), { lo: 0.9, fo: 0.08 }); hop.position.y = HY; root.add(hop);
    var hopTop = K.part(new THREE.CylinderGeometry(2.6, 2.6, 1.2, 24, 1, true), { lo: 0.7, fo: 0.05 }); hopTop.position.y = HY + 1.9; root.add(hopTop);
    var spout = K.part(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 16, 1, true), { lo: 0.9 }); spout.position.y = HY - 1.7; root.add(spout);
    var BX = [-4.5, 0, 4.5], bottles = [], fills = [], caps = [], chutes = [];
    BX.forEach(function (bx) {
      var b = K.part(K.bottleGeo(1.0, 2.8), { line: C.tealL, lo: 0.95, fo: 0.06 }); b.position.set(bx, 0, 0); root.add(b); bottles.push(b);
      var f = K.part(new THREE.CylinderGeometry(0.92, 0.92, 1.8, 20), { line: C.teal, lo: 0.6, fo: 0.32 }); f.position.set(bx, 0.9, 0); root.add(f); fills.push(f);
      var c = K.part(new THREE.CylinderGeometry(0.58, 0.58, 0.45, 20), { line: C.mint, lo: 1 }); c.position.set(bx, 3.05, 0); root.add(c); caps.push(c);
      var ch = K.loop([new THREE.Vector3(0, HY - 2.1, 0), new THREE.Vector3(bx * 0.5, 5.0, 0), new THREE.Vector3(bx, 3.4, 0)], C.teal, 0.5); root.add(ch); chutes.push(ch);
    });
    /* falling capsules (two-tone, instanced) */
    var N = 90, geo = K.capsuleGeo(0.14, 0.34);
    var mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    var inst = new THREE.InstancedMesh(geo, mat, N); root.add(inst);
    var cA = new THREE.Color(C.teal), cB = new THREE.Color(0xe8f6f9), seeds = [];
    for (var i = 0; i < N; i++) { inst.setColorAt(i, i % 2 ? cA : cB); seeds.push({ lane: i % 3, u: Math.random(), sp: 0.18 + Math.random() * 0.14, r: Math.random() * 6.28, j: (Math.random() - 0.5) * 0.7 }); }
    /* ambient capsules orbiting the scene */
    var M = 40, orb = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: C.tealL, transparent: true, opacity: 0 }), M); root.add(orb);
    var oseeds = []; for (i = 0; i < M; i++) oseeds.push({ r: 7 + Math.random() * 5, y: 0.5 + Math.random() * 9, a: Math.random() * 6.28, s: 0.04 + Math.random() * 0.06, rot: Math.random() * 6.28 });
    var dummy = new THREE.Object3D(), MINT = new THREE.Color(C.mint);

    return {
      update: function (p, t) {
        var intro = reduceMotion ? 0.6 : seg(t, 0.3, 3.0) * 0.6;
        var build = Math.max(seg(p, 0, 0.3), intro), flow = seg(p, 0.25, 0.68), fill = seg(p, 0.5, 0.92), done = seg(p, 0.9, 1);
        [hopTop, hop, spout].forEach(function (g, i) { K.show(g, seg(build, i * 0.2, 0.5 + i * 0.2)); K.tint(g, MINT, done * 0.6); });
        bottles.forEach(function (b, i) { K.show(b, seg(build, 0.3 + i * 0.15, 0.7 + i * 0.15)); K.tint(b, MINT, done); });
        chutes.forEach(function (c, i) { K.draw(c, seg(build, 0.5 + i * 0.1, 1)); });
        fills.forEach(function (f) { K.show(f, fill > 0.01 ? 1 : 0); f.scale.y = Math.max(fill, 0.001); f.position.y = 0.05 + 0.9 * f.scale.y; });
        caps.forEach(function (c, i) { var f = seg(done, i * 0.2, 0.5 + i * 0.2); K.show(c, f); c.position.y = 3.05 + (1 - f) * 1.5; });
        mat.opacity = 0.7 * flow * (1 - done * 0.8);
        for (var i = 0; i < N; i++) {
          var s = seeds[i], u = (s.u + t * s.sp) % 1, bx = BX[s.lane];
          var x = bx * Math.min(1, u * 1.6) * (u < 0.62 ? u / 0.62 : 1), y = HY - 2.1 - u * (HY - 2.1 - 1.2 - fill * 1.6);
          dummy.position.set(x + s.j * (1 - u), y, s.j * 0.5 * (1 - u));
          dummy.rotation.set(s.r + t * 2, s.r, s.r * 0.5 + t);
          dummy.scale.setScalar(u > 0.96 ? 0.001 : 1);
          dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
        }
        inst.instanceMatrix.needsUpdate = true;
        orb.material.opacity = 0.28 * Math.max(build, 0.3);
        for (i = 0; i < M; i++) {
          var o = oseeds[i], a = o.a + t * o.s + p * 1.2;
          dummy.position.set(Math.cos(a) * o.r, o.y + Math.sin(t * 0.5 + o.a) * 0.3, Math.sin(a) * o.r * 0.6 - 3);
          dummy.rotation.set(o.rot + t * 0.4, o.rot, 0); dummy.scale.setScalar(1.0);
          dummy.updateMatrix(); orb.setMatrixAt(i, dummy.matrix);
        }
        orb.instanceMatrix.needsUpdate = true;
      },
      camera: function (p) {
        return { elev: 0.42 - ease(p) * 0.12, azim: -0.6 + ease(p) * 1.0, rad: 19 - ease(p) * 2.5, look: [0, 3.6 - ease(p) * 1.2, 0] };
      }
    };
  };


  /* Self-playing timeline (no scroll needed): build up after load, hold the
     finished state, rewind gently to a low floor, and repeat forever.     */
  var CYCLE = { rise: 12, hold: 8, fall: 4, floor: 0.08 };
  function autoProgress(sec) {
    var c = CYCLE, len = c.rise + c.hold + c.fall, u = sec % len, from = sec < len ? 0 : c.floor;
    if (u < c.rise) return from + (1 - from) * (u / c.rise);
    if (u < c.rise + c.hold) return 1;
    return 1 - (1 - c.floor) * ease((u - c.rise - c.hold) / c.fall);
  }

  /* ======================================================================
     Engine
     ====================================================================== */
  function build(THREE, name) {
    var host = d.createElement("div"); host.className = "akbg"; host.setAttribute("aria-hidden", "true");
    d.body.insertBefore(host, d.body.firstChild); d.body.classList.add("akbg-on");
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(w.devicePixelRatio || 1, 1.5));
    host.appendChild(renderer.domElement);
    var scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
    scene.add(new THREE.HemisphereLight(0xdff2f7, 0x02182e, 1.0));
    var key = new THREE.DirectionalLight(0xffffff, 0.5); key.position.set(8, 14, 9); scene.add(key);
    var root = new THREE.Group(); scene.add(root);
    var S = SC[name](THREE, root, kit(THREE));

    var W = 0, H = 0;
    function resize() {
      W = host.clientWidth; H = host.clientHeight; if (!W || !H) return;
      camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H, false);
      renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
      /* keep the model clear of the reading column on wide screens */
      root.position.x = W > 1100 ? 2.2 : 0;
    }
    var prog = reduceMotion ? 1 : 0;
    w.addEventListener("resize", function () { resize(); lastP = -1; });
    resize();

    var px = 0, py = 0, pxT = 0, pyT = 0;
    if (!reduceMotion) w.addEventListener("pointermove", function (e) { pxT = e.clientX / w.innerWidth - 0.5; pyT = e.clientY / w.innerHeight - 0.5; }, { passive: true });

    var t0 = performance.now(), lastP = -1;
    function frame(now) {
      requestAnimationFrame(frame);
      if (d.hidden) return;
      if (reduceMotion && lastP === prog) return;   /* reduced motion: one finished, still frame */
      lastP = prog;
      var t = reduceMotion ? 0 : (now - t0) / 1000;
      if (!reduceMotion) prog = autoProgress(t);
      px += (pxT - px) * 0.04; py += (pyT - py) * 0.04;
      S.update(prog, t);
      var cam = S.camera(prog), az = cam.azim + px * 0.25 + (reduceMotion ? 0 : Math.sin(t * 0.12) * 0.04), el = cam.elev - py * 0.1;
      camera.position.set(Math.sin(az) * Math.cos(el) * cam.rad + root.position.x, Math.sin(el) * cam.rad + 1, Math.cos(az) * Math.cos(el) * cam.rad);
      camera.lookAt(cam.look[0] + root.position.x, cam.look[1], cam.look[2]);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
    requestAnimationFrame(function () { host.classList.add("on"); });
  }

  function fallback() { if (w.AkalBG) w.AkalBG.mount(d.body.getAttribute("data-akbg")); }

  function boot() {
    var name = d.body.getAttribute("data-akbg3d");
    if (!name || !SC[name]) return;
    var conn = navigator.connection || {};
    if (w.innerWidth < 760 || conn.saveData || !webglOK()) { fallback(); return; }
    function go() {
      loadThree().then(function (T) {
        try { build(T, name); } catch (e) { var h = d.querySelector(".akbg"); if (h) h.remove(); fallback(); }
      }, fallback);
    }
    /* never compete with first paint: start once the page has loaded */
    function idle() { (w.requestIdleCallback || function (f) { setTimeout(f, 200); })(go); }
    if (d.readyState === "complete") idle(); else w.addEventListener("load", idle);
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})(window, document);
