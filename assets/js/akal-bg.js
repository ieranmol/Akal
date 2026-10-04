/* AKAL Engineering — self-playing 2D blueprint backgrounds
   One fixed canvas behind page content. Each page picks a scene that
   relates to its content; the drawing builds itself after page load,
   holds, rewinds and repeats, with a gentle ambient motion on top.

   Usage:  <body data-akbg="network">  + <script src="/assets/js/akal-bg.js" defer>
   Scenes: network, lifecycle, products, piping, map, gantt, checklist,
           packline, capsules
   Respects prefers-reduced-motion (shows the finished drawing, no motion)
   and pauses while the tab is hidden.                                      */
(function (w, d) {
  "use strict";

  var reduceMotion = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TEAL = "23,162,184", TEAL_L = "95,208,224", MINT = "126,242,192";
  var MONO = '500 10px "IBM Plex Mono", ui-monospace, monospace';

  /* ---------- helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function seg(p, a, b) { return ease((p - a) / (b - a)); }
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function rgba(c, a) { return "rgba(" + c + "," + clamp(a, 0, 1).toFixed(3) + ")"; }

  /* Draw the first `f` (0..1) of a polyline, by length. Returns the end point. */
  function polyLen(pts) {
    var L = 0;
    for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return L;
  }
  function polyAt(pts, f) {
    var L = polyLen(pts) * clamp(f, 0, 1), acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var sl = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + sl >= L) {
        var u = sl ? (L - acc) / sl : 0;
        return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u, i];
      }
      acc += sl;
    }
    var e = pts[pts.length - 1]; return [e[0], e[1], pts.length - 1];
  }
  function drawPoly(c, pts, f) {
    if (f <= 0 || pts.length < 2) return;
    var end = polyAt(pts, f);
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < end[2]; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.lineTo(end[0], end[1]); c.stroke();
  }
  function arcF(c, x, y, r, f) {
    if (f <= 0) return;
    c.beginPath(); c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(f, 0, 1)); c.stroke();
  }
  function rectF(c, x, y, ww, hh, f) {
    drawPoly(c, [[x, y], [x + ww, y], [x + ww, y + hh], [x, y + hh], [x, y]], f);
  }
  function label(c, txt, x, y, a, align) {
    c.font = MONO; c.textAlign = align || "left"; c.fillStyle = rgba(TEAL_L, a); c.fillText(txt, x, y);
  }

  /* ======================================================================
     SCENES — each has setup(W,H,rnd) -> state, draw(c,W,H,p,t,state)
     p = timeline progress 0..1 (self-playing), t = seconds (0 when reduced motion)
     ====================================================================== */
  var S = {};

  /* ---- About: integrated team network --------------------------------- */
  S.network = {
    setup: function (W, H, r) {
      var n = W < 720 ? 18 : 30, nodes = [], i, j;
      for (i = 0; i < n; i++) nodes.push({ x: r() * W, y: r() * H, g: i % 3 === 0 ? 1 : 0, ph: r() * 6.28, th: r() * 0.85 });
      var edges = [];
      nodes.forEach(function (a, ai) {
        var near = nodes.map(function (b, bi) { return [bi, Math.hypot(a.x - b.x, a.y - b.y)]; })
          .filter(function (q) { return q[0] !== ai; }).sort(function (x, y) { return x[1] - y[1]; });
        for (j = 0; j < 2; j++) {
          var bi = near[j][0];
          if (!edges.some(function (e) { return (e.a === ai && e.b === bi) || (e.a === bi && e.b === ai); }))
            edges.push({ a: ai, b: bi, th: Math.min(a.th, nodes[bi].th), sp: 0.15 + r() * 0.25, of: r() });
        }
      });
      return { nodes: nodes, edges: edges };
    },
    draw: function (c, W, H, p, t, s) {
      function pos(nd) { return [nd.x + Math.sin(t * 0.3 + nd.ph) * 6, nd.y + Math.cos(t * 0.25 + nd.ph) * 6 - p * 40]; }
      c.lineWidth = 1;
      s.edges.forEach(function (e) {
        var f = seg(p, e.th, e.th + 0.18);
        if (f <= 0) return;
        var A = pos(s.nodes[e.a]), B = pos(s.nodes[e.b]);
        var cross = s.nodes[e.a].g !== s.nodes[e.b].g;
        c.strokeStyle = rgba(cross ? TEAL_L : TEAL, cross ? 0.55 : 0.4);
        drawPoly(c, [A, B], f);
        if (f >= 1 && t) {
          var u = (t * e.sp + e.of) % 1;
          c.fillStyle = rgba(TEAL_L, 0.8);
          c.beginPath(); c.arc(A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, 1.8, 0, 6.28); c.fill();
        }
      });
      s.nodes.forEach(function (nd) {
        var f = seg(p, nd.th - 0.05, nd.th + 0.08);
        if (f <= 0) return;
        var P = pos(nd);
        c.strokeStyle = rgba(TEAL, 0.65 * f); c.lineWidth = 1.2;
        if (nd.g) { c.save(); c.translate(P[0], P[1]); c.rotate(Math.PI / 4); c.strokeRect(-5, -5, 10, 10); c.restore(); }
        else { c.beginPath(); c.arc(P[0], P[1], 5, 0, 6.28); c.stroke(); }
        c.fillStyle = rgba(TEAL_L, 0.7 * f); c.beginPath(); c.arc(P[0], P[1], 1.6, 0, 6.28); c.fill();
      });
    }
  };

  /* ---- Services / Home (phone): 11-station lifecycle track ------------ */
  S.lifecycle = {
    setup: function (W, H) {
      var rows = 4, pts = [], mX = W * 0.06, mY = H * 0.14, rowH = (H - mY * 2) / (rows - 1);
      for (var r = 0; r < rows; r++) {
        var y = mY + r * rowH, L = r % 2 ? W - mX : mX, R = r % 2 ? mX : W - mX;
        pts.push([L, y], [R, y]);
      }
      var stations = [];
      for (var i = 0; i < 11; i++) stations.push(polyAt(pts, 0.04 + i * 0.092));
      return { pts: pts, st: stations };
    },
    draw: function (c, W, H, p, t, s) {
      var f = seg(p, 0, 0.92);
      c.lineWidth = 1.2; c.strokeStyle = rgba(TEAL, 0.25);
      c.setLineDash([3, 6]); drawPoly(c, s.pts, 1); c.setLineDash([]);
      c.strokeStyle = rgba(TEAL, 0.6); drawPoly(c, s.pts, f);
      s.st.forEach(function (q, i) {
        var on = seg(f, 0.04 + i * 0.092 - 0.01, 0.04 + i * 0.092 + 0.03);
        c.strokeStyle = rgba(on > 0.5 ? TEAL_L : TEAL, 0.25 + 0.5 * on); c.lineWidth = 1.2;
        c.beginPath(); c.arc(q[0], q[1], 13, 0, 6.28); c.stroke();
        arcF(c, q[0], q[1], 19, on);
        label(c, ("0" + (i + 1)).slice(-2), q[0], q[1] + 3.5, 0.35 + 0.5 * on, "center");
      });
      if (t && f > 0.02) {
        var u = (t * 0.06) % 1, P = polyAt(s.pts, u * f);
        c.fillStyle = rgba(TEAL_L, 0.9); c.beginPath(); c.arc(P[0], P[1], 3, 0, 6.28); c.fill();
      }
    }
  };

  /* ---- Industries: tablets, capsules, bottles ------------------------- */
  function drawProduct(c, kind, sz) {
    c.beginPath();
    if (kind === 0) { /* tablet */
      c.ellipse(0, 0, sz, sz * 0.62, 0, 0, 6.28); c.moveTo(-sz * 0.6, 0); c.lineTo(sz * 0.6, 0);
    } else if (kind === 1) { /* capsule */
      var h = sz * 0.42;
      c.moveTo(-sz + h, -h); c.lineTo(sz - h, -h); c.arc(sz - h, 0, h, -Math.PI / 2, Math.PI / 2);
      c.lineTo(-sz + h, h); c.arc(-sz + h, 0, h, Math.PI / 2, Math.PI * 1.5); c.moveTo(0, -h); c.lineTo(0, h);
    } else if (kind === 2) { /* bottle */
      var bw = sz * 0.55, bh = sz * 1.1;
      c.moveTo(-bw, bh); c.lineTo(-bw, -bh * 0.35); c.quadraticCurveTo(-bw, -bh * 0.7, -bw * 0.45, -bh * 0.75);
      c.lineTo(-bw * 0.45, -bh); c.lineTo(bw * 0.45, -bh); c.lineTo(bw * 0.45, -bh * 0.75);
      c.quadraticCurveTo(bw, -bh * 0.7, bw, -bh * 0.35); c.lineTo(bw, bh); c.closePath();
      c.moveTo(-bw, 0); c.lineTo(bw, 0); c.moveTo(-bw, bh * 0.5); c.lineTo(bw, bh * 0.5);
    } else { /* beverage bottle */
      var vw = sz * 0.38, vh = sz * 1.3;
      c.moveTo(-vw, vh); c.lineTo(-vw, -vh * 0.15); c.lineTo(-vw * 0.35, -vh * 0.6); c.lineTo(-vw * 0.35, -vh);
      c.lineTo(vw * 0.35, -vh); c.lineTo(vw * 0.35, -vh * 0.6); c.lineTo(vw, -vh * 0.15); c.lineTo(vw, vh); c.closePath();
    }
    c.stroke();
  }
  S.products = {
    setup: function (W, H, r) {
      var n = W < 720 ? 14 : 26, it = [];
      for (var i = 0; i < n; i++) it.push({ x: r() * W, y: r() * H * 1.3, k: i % 4, s: 12 + r() * 16, rot: r() * 6.28, vr: (r() - 0.5) * 0.2, th: r() * 0.8, ph: r() * 6.28 });
      return { it: it };
    },
    draw: function (c, W, H, p, t, s) {
      s.it.forEach(function (o) {
        var f = seg(p, o.th - 0.06, o.th + 0.1);
        if (f <= 0) return;
        var y = ((o.y - p * H * 0.35 - t * 6) % (H * 1.3) + H * 1.3) % (H * 1.3) - H * 0.15;
        c.save(); c.translate(o.x + Math.sin(t * 0.4 + o.ph) * 8, y); c.rotate(o.rot + t * o.vr);
        c.scale(0.7 + 0.3 * f, 0.7 + 0.3 * f);
        c.strokeStyle = rgba(o.k === 3 ? TEAL_L : TEAL, 0.6 * f); c.lineWidth = 1.2;
        drawProduct(c, o.k, o.s); c.restore();
      });
    }
  };

  /* ---- FAQ / 404: P&ID piping with valves and instruments ------------- */
  S.piping = {
    setup: function (W, H, r) {
      var g = W < 720 ? 40 : 56, runs = [], n = W < 720 ? 7 : 12;
      for (var i = 0; i < n; i++) {
        var x = Math.round(r() * W / g) * g, y = Math.round(r() * H / g) * g, pts = [[x, y]];
        for (var k = 0; k < 4; k++) {
          var horiz = (k + i) % 2 === 0, len = (2 + Math.floor(r() * 5)) * g * (r() < 0.5 ? -1 : 1);
          x = horiz ? clamp(x + len, -g, W + g) : x; y = horiz ? y : clamp(y + len, -g, H + g); pts.push([x, y]);
        }
        var vAt = 0.3 + r() * 0.4;
        runs.push({ pts: pts, th: i / n * 0.85, v: vAt, tag: ["PI", "FT", "TT", "LT", "PT", "FIC"][i % 6] + " " + (101 + i * 7) });
      }
      return { runs: runs };
    },
    draw: function (c, W, H, p, t, s) {
      s.runs.forEach(function (rn) {
        var f = seg(p, rn.th, rn.th + 0.2);
        if (f <= 0) return;
        c.lineWidth = 1.4; c.strokeStyle = rgba(TEAL, 0.5); drawPoly(c, rn.pts, f);
        if (t && f >= 1) { /* flow */
          c.save(); c.setLineDash([2, 14]); c.lineDashOffset = -t * 22; c.strokeStyle = rgba(TEAL_L, 0.85); c.lineWidth = 2;
          drawPoly(c, rn.pts, 1); c.restore();
        }
        if (f > rn.v) { /* valve bow-tie + instrument bubble */
          var V = polyAt(rn.pts, rn.v), a = rn.pts[V[2] - 1], b = rn.pts[V[2]];
          var horiz = Math.abs(b[1] - a[1]) < 1;
          c.save(); c.translate(V[0], V[1]); if (!horiz) c.rotate(Math.PI / 2);
          c.fillStyle = rgba("244,244,249", 0); c.strokeStyle = rgba(TEAL_L, 0.75); c.lineWidth = 1.2;
          c.beginPath(); c.moveTo(-8, -6); c.lineTo(8, 6); c.lineTo(8, -6); c.lineTo(-8, 6); c.closePath(); c.stroke();
          c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -16); c.stroke(); c.restore();
          var bx = V[0] + (horiz ? 0 : 26), by = V[1] - (horiz ? 34 : 0);
          c.strokeStyle = rgba(TEAL, 0.6); c.beginPath(); c.arc(bx, by, 15, 0, 6.28); c.stroke();
          c.beginPath(); c.moveTo(bx - 15, by); c.lineTo(bx + 15, by); c.stroke();
          var parts = rn.tag.split(" ");
          label(c, parts[0], bx, by - 3, 0.75, "center"); label(c, parts[1], bx, by + 11, 0.6, "center");
        }
      });
    }
  };

  /* ---- Contact: London, Ontario and the cities we reach --------------- */
  var CITIES = [
    ["LONDON", 42.98, -81.25, 1], ["TORONTO", 43.65, -79.38], ["HAMILTON", 43.26, -79.87],
    ["KITCHENER", 43.45, -80.49], ["WINDSOR", 42.31, -83.04], ["SARNIA", 42.97, -82.40],
    ["OTTAWA", 45.42, -75.69], ["MONTREAL", 45.50, -73.57], ["NIAGARA", 43.09, -79.08]
  ];
  S.map = {
    setup: function (W, H) {
      var lonA = -84, lonB = -73, latA = 41.6, latB = 46.2, small = W < 720;
      var mx = small ? 0.04 : 0.03, sc = W * (1 - 2 * mx) / (lonB - lonA);
      var ox = W / 2 - ((lonA + lonB) / 2) * sc, oy = H * 0.5 + 43.9 * sc * 0.75;
      var pts = CITIES.map(function (q) { return { n: q[0], x: ox + q[2] * sc, y: oy - q[1] * sc * 0.75, hub: !!q[3] }; });
      return { pts: pts, sc: sc, ox: ox, oy: oy };
    },
    draw: function (c, W, H, p, t, s) {
      /* graticule */
      c.lineWidth = 1; c.strokeStyle = rgba(TEAL, 0.1);
      for (var lon = -84; lon <= -72; lon++) { var x = s.ox + lon * s.sc; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
      for (var lat = 40; lat <= 47; lat += 1) { var y = s.oy - lat * s.sc * 0.75; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      var hub = s.pts[0];
      s.pts.forEach(function (q, i) {
        if (q.hub) return;
        var f = seg(p, 0.05 + (i - 1) * 0.09, 0.2 + (i - 1) * 0.09);
        if (f <= 0) return;
        var mx2 = (hub.x + q.x) / 2, my2 = Math.min(hub.y, q.y) - Math.hypot(q.x - hub.x, q.y - hub.y) * 0.22;
        var curve = []; for (var k = 0; k <= 24; k++) { var u = k / 24; curve.push([(1 - u) * (1 - u) * hub.x + 2 * (1 - u) * u * mx2 + u * u * q.x, (1 - u) * (1 - u) * hub.y + 2 * (1 - u) * u * my2 + u * u * q.y]); }
        c.strokeStyle = rgba(TEAL, 0.55); c.lineWidth = 1.2; c.setLineDash([4, 5]); drawPoly(c, curve, f); c.setLineDash([]);
        if (f >= 1) {
          c.fillStyle = rgba(TEAL_L, 0.9); c.beginPath(); c.arc(q.x, q.y, 3, 0, 6.28); c.fill();
          label(c, q.n, q.x + 7, q.y - 6, 0.6);
          if (t) { var P = polyAt(curve, (t * 0.18 + i * 0.13) % 1); c.beginPath(); c.arc(P[0], P[1], 1.8, 0, 6.28); c.fill(); }
        }
      });
      var rp = t ? (t * 0.45) % 1 : 0.5;
      c.strokeStyle = rgba(TEAL_L, 0.7 * (1 - rp)); c.lineWidth = 1.4;
      c.beginPath(); c.arc(hub.x, hub.y, 8 + rp * 70, 0, 6.28); c.stroke();
      c.strokeStyle = rgba(TEAL_L, 0.5 * (1 - ((rp + 0.5) % 1))); c.beginPath(); c.arc(hub.x, hub.y, 8 + ((rp + 0.5) % 1) * 70, 0, 6.28); c.stroke();
      c.strokeStyle = rgba(TEAL_L, 0.9); c.beginPath(); c.arc(hub.x, hub.y, 7, 0, 6.28); c.stroke();
      c.fillStyle = rgba(TEAL_L, 1); c.beginPath(); c.arc(hub.x, hub.y, 3, 0, 6.28); c.fill();
      label(c, "LONDON, ON", hub.x + 12, hub.y + 16, 0.85);
      label(c, "42.98°N  81.25°W", hub.x + 12, hub.y + 29, 0.5);
    }
  };

  /* ---- Get in Touch: project schedule building itself ---------- */
  S.gantt = {
    setup: function (W, H) {
      var rows = ["SCOPING", "PROPOSAL", "URS / DQ", "FAT / SAT", "IQ", "OQ", "PQ", "REPORT"];
      var x0 = W < 720 ? 14 : W * 0.05, x1 = W - x0, top = H * 0.16, rh = (H * 0.72) / rows.length;
      var starts = [0, 0.08, 0.16, 0.3, 0.48, 0.6, 0.72, 0.86], lens = [0.1, 0.1, 0.18, 0.2, 0.14, 0.14, 0.16, 0.12];
      return { rows: rows.map(function (n, i) { return { n: n, y: top + i * rh, s: starts[i], l: lens[i] }; }), x0: x0, x1: x1, lab: W < 720 ? 0 : 90, rh: rh, top: top };
    },
    draw: function (c, W, H, p, t, s) {
      var gx = s.x0 + s.lab, gw = s.x1 - gx;
      c.lineWidth = 1; c.strokeStyle = rgba(TEAL, 0.16);
      for (var k = 0; k <= 12; k++) { var x = gx + gw * k / 12; c.beginPath(); c.moveTo(x, s.top - 20); c.lineTo(x, s.top + s.rh * s.rows.length); c.stroke(); }
      s.rows.forEach(function (r, i) {
        var f = seg(p, i * 0.1, i * 0.1 + 0.18);
        if (s.lab) label(c, r.n, s.x0, r.y + s.rh * 0.5 + 3, 0.35 + 0.4 * f);
        c.strokeStyle = rgba(TEAL, 0.2); c.beginPath(); c.moveTo(gx, r.y + s.rh); c.lineTo(s.x1, r.y + s.rh); c.stroke();
        if (f <= 0) return;
        var bx = gx + gw * r.s, bw = gw * r.l * f, bh = s.rh * 0.36, by = r.y + (s.rh - bh) / 2;
        c.fillStyle = rgba(TEAL, 0.18); c.fillRect(bx, by, bw, bh);
        c.strokeStyle = rgba(TEAL, 0.65); c.strokeRect(bx, by, bw, bh);
        if (f >= 1) { /* milestone */
          var mx = bx + bw + 8, my = by + bh / 2;
          c.fillStyle = rgba(i === s.rows.length - 1 ? MINT : TEAL_L, 0.85);
          c.beginPath(); c.moveTo(mx, my - 5); c.lineTo(mx + 5, my); c.lineTo(mx, my + 5); c.lineTo(mx - 5, my); c.closePath(); c.fill();
        }
      });
      var tx = gx + gw * (t ? (t * 0.03) % 1 : p);
      c.strokeStyle = rgba(TEAL_L, 0.5); c.setLineDash([3, 4]);
      c.beginPath(); c.moveTo(tx, s.top - 26); c.lineTo(tx, s.top + s.rh * s.rows.length); c.stroke(); c.setLineDash([]);
      label(c, "TODAY", tx + 4, s.top - 16, 0.55);
    }
  };

  /* ---- Policy: verification checklist and sign-off ------------------- */
  S.checklist = {
    setup: function (W, H) {
      var small = W < 720, cols = small ? 1 : 2, colW = small ? W * 0.8 : W * 0.24;
      var xs = small ? [W * 0.1] : [W * 0.04, W - W * 0.04 - colW], n = small ? 9 : 11, gap = (H * 0.78) / n;
      var rows = [];
      for (var cI = 0; cI < cols; cI++) for (var i = 0; i < n; i++) rows.push({ x: xs[cI], y: H * 0.12 + i * gap, w: colW * (0.55 + ((i * 37 + cI * 11) % 40) / 100), k: rows.length });
      return { rows: rows, cx: small ? W * 0.78 : W * 0.5, cy: H * 0.82, total: rows.length };
    },
    draw: function (c, W, H, p, t, s) {
      s.rows.forEach(function (r) {
        var th = (r.k / s.total) * 0.8, f = seg(p, th, th + 0.08);
        c.lineWidth = 1.2; c.strokeStyle = rgba(TEAL, 0.45);
        c.strokeRect(r.x, r.y - 7, 14, 14);
        c.strokeStyle = rgba(TEAL, 0.22); c.beginPath(); c.moveTo(r.x + 26, r.y); c.lineTo(r.x + 26 + r.w * 0.85, r.y); c.stroke();
        if (f > 0) {
          c.strokeStyle = rgba(TEAL, 0.6); drawPoly(c, [[r.x + 26, r.y], [r.x + 26 + r.w * 0.85, r.y]], f);
          c.strokeStyle = rgba(MINT, 0.9); c.lineWidth = 2;
          drawPoly(c, [[r.x + 3, r.y], [r.x + 6, r.y + 4], [r.x + 12, r.y - 5]], f);
        }
      });
      var sf = seg(p, 0.82, 0.98);
      if (sf > 0) {
        var rot = -0.18 + (t ? Math.sin(t * 0.6) * 0.01 : 0);
        c.save(); c.translate(s.cx, s.cy); c.rotate(rot);
        c.strokeStyle = rgba(MINT, 0.75); c.lineWidth = 1.6;
        arcF(c, 0, 0, 44, sf); arcF(c, 0, 0, 37, sf);
        label(c, "VERIFIED", 0, -2, 0.85 * sf, "center"); label(c, "QA / HSE", 0, 12, 0.6 * sf, "center");
        c.restore();
      }
    }
  };

  /* ---- Pharma (phone fallback): bottling line IQ → OQ → PQ ------------ */
  S.packline = {
    setup: function (W, H) {
      var y = H * 0.7, x0 = -20, x1 = W + 20, n = W < 720 ? 4 : 5, st = [];
      for (var i = 0; i < n; i++) st.push(W * (0.12 + i * (0.76 / (n - 1))));
      return { y: y, x0: x0, x1: x1, st: st };
    },
    draw: function (c, W, H, p, t, s) {
      var iq = seg(p, 0, 0.33), oq = seg(p, 0.3, 0.62), pq = seg(p, 0.6, 0.9);
      c.lineWidth = 1.4; c.strokeStyle = rgba(TEAL, 0.55);
      drawPoly(c, [[s.x0, s.y], [s.x1, s.y]], iq); drawPoly(c, [[s.x0, s.y + 14], [s.x1, s.y + 14]], iq);
      var roll = t ? (t * 40 * oq) % 24 : 0;
      c.strokeStyle = rgba(TEAL, 0.35 * oq);
      for (var x = s.x0 + roll; x < s.x1; x += 24) { c.beginPath(); c.arc(x, s.y + 7, 5, 0, 6.28); c.stroke(); }
      s.st.forEach(function (sx, i) {
        var f = seg(iq, i / s.st.length, (i + 1) / s.st.length);
        c.strokeStyle = rgba(TEAL_L, 0.7); c.lineWidth = 1.2;
        rectF(c, sx - 26, s.y - 110, 52, 64, f);
        drawPoly(c, [[sx, s.y - 46], [sx, s.y - 24]], f);
        if (f >= 1) label(c, "STN " + (i + 1), sx, s.y - 120, 0.55, "center");
      });
      if (pq > 0) {
        var gap = 46, off = t ? (t * 30) % gap : 0;
        for (var bx = s.x0 + off; bx < s.x1; bx += gap) {
          var a = 0.75 * pq; c.save(); c.translate(bx, s.y - 14);
          c.strokeStyle = rgba(TEAL_L, a); c.lineWidth = 1.2; drawProduct(c, 2, 12); c.restore();
          if (bx > s.st[s.st.length - 1] + 20) { c.strokeStyle = rgba(MINT, a); c.lineWidth = 1.8; drawPoly(c, [[bx - 5, s.y - 46], [bx - 1, s.y - 42], [bx + 6, s.y - 51]], 1); }
        }
      }
      var ph = p < 0.31 ? "IQ" : p < 0.61 ? "OQ" : "PQ";
      label(c, "QUALIFICATION  " + ph, s.x0 + 34, s.y + 44, 0.6);
    }
  };

  /* ---- Nutraceutical (phone fallback): capsules into bottles ---------- */
  S.capsules = {
    setup: function (W, H, r) {
      var caps = [];
      for (var i = 0; i < 60; i++) caps.push({ lane: i % 3, u: r(), sp: 0.07 + r() * 0.06, rot: r() * 6.28, vr: (r() - 0.5) * 3 });
      return { caps: caps, hx: W / 2, hy: H * 0.14, bys: H * 0.8, lanes: [W * 0.25, W * 0.5, W * 0.75] };
    },
    draw: function (c, W, H, p, t, s) {
      var build = seg(p, 0, 0.3), flow = seg(p, 0.25, 0.65), fill = seg(p, 0.55, 0.95);
      c.lineWidth = 1.4; c.strokeStyle = rgba(TEAL, 0.6);
      drawPoly(c, [[s.hx - 120, s.hy - 50], [s.hx + 120, s.hy - 50], [s.hx + 30, s.hy + 40], [s.hx + 30, s.hy + 70], [s.hx - 30, s.hy + 70], [s.hx - 30, s.hy + 40], [s.hx - 120, s.hy - 50]], build);
      s.lanes.forEach(function (lx, li) {
        c.strokeStyle = rgba(TEAL, 0.3); c.setLineDash([3, 6]);
        drawPoly(c, [[s.hx, s.hy + 70], [lx, s.bys - 60]], build); c.setLineDash([]);
        c.save(); c.translate(lx, s.bys); c.strokeStyle = rgba(TEAL_L, 0.7 * build); c.lineWidth = 1.3; drawProduct(c, 2, 40); c.restore();
        if (fill > 0) {
          var bh = 44 * 2 * 0.95, fh = bh * fill * 0.9;
          c.fillStyle = rgba(TEAL, 0.25); c.fillRect(lx - 21, s.bys + 44 - fh, 42, fh);
        }
        if (fill >= 0.98) { c.strokeStyle = rgba(MINT, 0.85); c.lineWidth = 2; drawPoly(c, [[lx - 8, s.bys - 70], [lx - 2, s.bys - 64], [lx + 10, s.bys - 78]], 1); }
      });
      if (flow > 0) {
        s.caps.forEach(function (cp) {
          var u = t ? (cp.u + t * cp.sp) % 1 : cp.u, lx = s.lanes[cp.lane];
          var x = s.hx + (lx - s.hx) * u, y = s.hy + 70 + (s.bys - 60 - s.hy - 70) * u;
          c.save(); c.translate(x, y); c.rotate(cp.rot + (t || 0) * cp.vr);
          c.strokeStyle = rgba(TEAL_L, 0.75 * flow); c.lineWidth = 1.1; drawProduct(c, 1, 7); c.restore();
        });
      }
    }
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
  function mount(name) {
    var scene = S[name];
    if (!scene || d.querySelector(".akbg")) return;
    var host = d.createElement("div"); host.className = "akbg"; host.setAttribute("aria-hidden", "true");
    var cv = d.createElement("canvas"); host.appendChild(cv);
    d.body.insertBefore(host, d.body.firstChild);
    d.body.classList.add("akbg-on");
    var c = cv.getContext("2d"), W = 0, H = 0, state = null, dpr = 1;

    function resize() {
      dpr = Math.min(w.devicePixelRatio || 1, 2);
      var nW = host.clientWidth, nH = host.clientHeight;
      /* mobile URL bar show/hide changes height only: keep layout stable */
      if (state && nW === W && Math.abs(nH - H) < 120) return;
      W = nW; H = nH;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      state = scene.setup(W, H, rng(7919));
      dirty = true;
    }
    var prog = reduceMotion ? 1 : 0, dirty = true;
    w.addEventListener("resize", resize);
    resize();

    var t0 = performance.now(), last = 0;
    function frame(now) {
      requestAnimationFrame(frame);
      if (d.hidden || now - last < 31) return;
      last = now;
      if (reduceMotion && !dirty) return;   /* reduced motion: one finished, still frame */
      dirty = false;
      var t = reduceMotion ? 0 : (now - t0) / 1000;
      if (!reduceMotion) prog = autoProgress(t);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      scene.draw(c, W, H, prog, t, state);
    }
    requestAnimationFrame(frame);
    requestAnimationFrame(function () { host.classList.add("on"); });
  }

  w.AkalBG = { mount: mount, scenes: S };

  function boot() {
    var name = d.body.getAttribute("data-akbg");
    /* 3D pages hand over to akal-bg3d.js, which falls back to 2D itself */
    if (name && !d.body.hasAttribute("data-akbg3d")) mount(name);
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})(window, document);
