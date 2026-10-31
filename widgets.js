// widgets.js 10/31/26 ek505 interactive demos

(function () {
  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function setupCanvas(cv, aspect) {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = w * aspect;
    cv.style.height = h + "px";
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  function arrow(ctx, x0, y0, x1, y1, color, width) {
    const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
    if (L < 2) return;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width || 2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const hs = Math.min(10, L / 3);
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - hs * Math.cos(a - 0.4), y1 - hs * Math.sin(a - 0.4));
    ctx.lineTo(x1 - hs * Math.cos(a + 0.4), y1 - hs * Math.sin(a + 0.4));
    ctx.closePath(); ctx.fill();
  }
  const f3 = v => (v >= 0 ? " " : "") + v.toFixed(3);

  /* two-link arm: fk, jacobian columns, gradient ik */
  function arm(root) {
    const cv = root.querySelector("canvas");
    const s1 = root.querySelector("#arm-q1"), s2 = root.querySelector("#arm-q2");
    const out = root.querySelector(".readout");
    const l1 = 1.0, l2 = 0.8;
    let q = [0.6, 1.1], target = null, anim = null;
    let G;
    function fk(q) {
      const c1 = Math.cos(q[0]), s1 = Math.sin(q[0]), c12 = Math.cos(q[0] + q[1]), s12 = Math.sin(q[0] + q[1]);
      return { p1: [l1 * c1, l1 * s1], p: [l1 * c1 + l2 * c12, l1 * s1 + l2 * s12],
        J: [[-l1 * s1 - l2 * s12, -l2 * s12], [l1 * c1 + l2 * c12, l2 * c12]] };
    }
    function draw() {
      G = setupCanvas(cv, 0.62);
      const { ctx, w, h } = G;
      const sc = Math.min(w, h * 1.6) / 4.4, ox = w / 2, oy = h * 0.62;
      const X = x => ox + x * sc, Y = y => oy - y * sc;
      ctx.clearRect(0, 0, w, h);
      // grid
      ctx.strokeStyle = css("--rule"); ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(X(i), 0); ctx.lineTo(X(i), h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, Y(i)); ctx.lineTo(w, Y(i)); ctx.stroke();
      }
      // reachable annulus
      ctx.setLineDash([4, 4]); ctx.strokeStyle = css("--ink-2");
      ctx.beginPath(); ctx.arc(X(0), Y(0), (l1 + l2) * sc, 0, 2 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(X(0), Y(0), (l1 - l2) * sc, 0, 2 * Math.PI); ctx.stroke();
      ctx.setLineDash([]);
      const k = fk(q);
      // links
      ctx.lineCap = "round"; ctx.lineWidth = 9;
      ctx.strokeStyle = css("--ink"); ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(k.p1[0]), Y(k.p1[1])); ctx.stroke();
      ctx.strokeStyle = css("--ink-2"); ctx.beginPath(); ctx.moveTo(X(k.p1[0]), Y(k.p1[1])); ctx.lineTo(X(k.p[0]), Y(k.p[1])); ctx.stroke();
      [[0, 0], k.p1].forEach(p => { ctx.fillStyle = css("--surface"); ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 6, 0, 7); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = css("--ink"); ctx.stroke(); });
      // jacobian columns as velocity arrows (scaled 0.6)
      const a = 0.6;
      arrow(ctx, X(k.p[0]), Y(k.p[1]), X(k.p[0] + a * k.J[0][0]), Y(k.p[1] + a * k.J[1][0]), css("--ax-x"), 3);
      arrow(ctx, X(k.p[0]), Y(k.p[1]), X(k.p[0] + a * k.J[0][1]), Y(k.p[1] + a * k.J[1][1]), css("--ax-z"), 3);
      ctx.fillStyle = css("--accent"); ctx.beginPath(); ctx.arc(X(k.p[0]), Y(k.p[1]), 5, 0, 7); ctx.fill();
      if (target) {
        ctx.strokeStyle = css("--ax-y"); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(X(target[0]), Y(target[1]), 8, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(X(target[0]) - 12, Y(target[1])); ctx.lineTo(X(target[0]) + 12, Y(target[1]));
        ctx.moveTo(X(target[0]), Y(target[1]) - 12); ctx.lineTo(X(target[0]), Y(target[1]) + 12); ctx.stroke();
      }
      const det = k.J[0][0] * k.J[1][1] - k.J[0][1] * k.J[1][0];
      out.innerHTML = "q = [" + f3(q[0]) + ", " + f3(q[1]) + "]   p = [" + f3(k.p[0]) + ", " + f3(k.p[1]) + "]<br>" +
        "J = [[" + f3(k.J[0][0]) + ", " + f3(k.J[0][1]) + "], [" + f3(k.J[1][0]) + ", " + f3(k.J[1][1]) + "]]   det J = l1·l2·sin q2 = " + f3(det) +
        (Math.abs(det) < 0.08 ? '   <b style="color:var(--warn)">near singular: the two columns are parallel</b>' : "") +
        (target ? "<br>ik error ‖p − p*‖ = " + Math.hypot(k.p[0] - target[0], k.p[1] - target[1]).toFixed(4) : "");
      G.X = X; G.Y = Y; G.sc = sc; G.ox = ox; G.oy = oy;
    }
    function sync() { s1.value = q[0]; s2.value = q[1]; }
    s1.addEventListener("input", () => { q[0] = +s1.value; stop(); draw(); });
    s2.addEventListener("input", () => { q[1] = +s2.value; stop(); draw(); });
    function stop() { if (anim) cancelAnimationFrame(anim); anim = null; }
    cv.addEventListener("pointerdown", e => {
      const r = cv.getBoundingClientRect();
      target = [(e.clientX - r.left - G.ox) / G.sc, -(e.clientY - r.top - G.oy) / G.sc];
      stop();
      const alpha = +root.querySelector("#arm-alpha").value;
      let it = 0;
      const step = () => {
        // gradient of f(q)=1/2||p(q)-p*||^2 is J^T (p - p*)
        const k = fk(q), e0 = k.p[0] - target[0], e1 = k.p[1] - target[1];
        const g0 = k.J[0][0] * e0 + k.J[1][0] * e1, g1 = k.J[0][1] * e0 + k.J[1][1] * e1;
        q[0] -= alpha * g0; q[1] -= alpha * g1;
        q = q.map(v => Math.atan2(Math.sin(v), Math.cos(v)));
        sync(); draw(); it++;
        if (Math.hypot(g0, g1) > 1e-4 && it < 600) anim = requestAnimationFrame(step); else anim = null;
      };
      step();
    });
    window.addEventListener("resize", draw);
    window.addEventListener("themechange", draw);
    sync(); draw();
  }

  /* rrt / rrt* on the activity 7 map */
  function rrt(root) {
    const cv = root.querySelector("canvas");
    const out = root.querySelector(".readout");
    const W = 12, H = 10;
    const centers = [[1, 5], [4, 5], [6.5, 2.5], [4, 9.5], [7, 6], [10.5, 3.75]];
    let R = 1.5, start = [1, 1], goal = [1, 9], nodes = [], best = null, running = null, iter = 0, clickGoal = true, G;
    const free = p => p[0] >= 0 && p[0] <= W && p[1] >= 0 && p[1] <= H && centers.every(c => Math.hypot(p[0] - c[0], p[1] - c[1]) > R);
    function edgeFree(a, b) {
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.05);
      for (let i = 1; i <= n; i++) { const t = i / n; if (!free([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])])) return false; }
      return true;
    }
    const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    function reset() { nodes = [{ p: start, parent: -1, cost: 0 }]; best = null; iter = 0; }
    function iterate(star) {
      const eta = 0.6, rStar = 1.4;
      iter++;
      const s = Math.random() < 0.05 ? goal : [Math.random() * W, Math.random() * H];
      let ni = 0, nd = Infinity;
      for (let i = 0; i < nodes.length; i++) { const dd = d(nodes[i].p, s); if (dd < nd) { nd = dd; ni = i; } }
      const np = nodes[ni].p;
      const t = Math.min(1, eta / (nd || 1));
      const p = [np[0] + t * (s[0] - np[0]), np[1] + t * (s[1] - np[1])];
      if (!free(p) || !edgeFree(np, p)) return;
      let parent = ni, cost = nodes[ni].cost + d(np, p), near = [];
      if (star) {
        for (let i = 0; i < nodes.length; i++) if (d(nodes[i].p, p) < rStar) near.push(i);
        near.forEach(i => { const c = nodes[i].cost + d(nodes[i].p, p); if (c < cost && edgeFree(nodes[i].p, p)) { cost = c; parent = i; } });
      }
      nodes.push({ p, parent, cost });
      const idx = nodes.length - 1;
      if (star) {
        near.forEach(i => {
          const c = cost + d(p, nodes[i].p);
          if (c < nodes[i].cost && edgeFree(p, nodes[i].p)) {
            nodes[i].parent = idx;
            nodes[i].cost = c;
            // push the cheaper cost down the rewired subtree
            const stack = [i];
            while (stack.length) {
              const j = stack.pop();
              for (let k = 1; k < nodes.length; k++) if (nodes[k].parent === j) { nodes[k].cost = nodes[j].cost + d(nodes[j].p, nodes[k].p); stack.push(k); }
            }
          }
        });
      }
      // goal check over all nodes near goal (costs can improve under rrt*)
      best = null;
      for (let i = 0; i < nodes.length; i++) {
        if (d(nodes[i].p, goal) < eta && edgeFree(nodes[i].p, goal)) {
          const c = nodes[i].cost + d(nodes[i].p, goal);
          if (!best || c < best.cost) best = { i, cost: c };
        }
      }
    }
    function draw() {
      G = setupCanvas(cv, H / W);
      const { ctx, w, h } = G;
      const sc = w / W, X = x => x * sc, Y = y => h - y * sc;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = css("--ax-x"); ctx.globalAlpha = 0.28;
      centers.forEach(c => { ctx.beginPath(); ctx.arc(X(c[0]), Y(c[1]), R * sc, 0, 7); ctx.fill(); });
      ctx.globalAlpha = 1;
      ctx.strokeStyle = css("--ink-2"); ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 1; i < nodes.length; i++) { const a = nodes[i].p, b = nodes[nodes[i].parent].p; ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(b[0]), Y(b[1])); }
      ctx.stroke();
      if (best) {
        ctx.strokeStyle = css("--accent"); ctx.lineWidth = 3.5; ctx.beginPath();
        ctx.moveTo(X(goal[0]), Y(goal[1]));
        for (let i = best.i; i >= 0; i = nodes[i].parent) ctx.lineTo(X(nodes[i].p[0]), Y(nodes[i].p[1]));
        ctx.stroke();
      }
      [[start, "--ax-y"], [goal, "--ax-z"]].forEach(([p, c]) => { ctx.fillStyle = css(c); ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 7, 0, 7); ctx.fill(); });
      out.innerHTML = "iterations " + iter + " · tree nodes " + nodes.length + " · " +
        (best ? "path cost <b>" + best.cost.toFixed(3) + "</b>" : "no path yet") + " · obstacle radius " + R.toFixed(2) +
        (R > 1.9 ? ' <span style="color:var(--warn)">(narrow passages: gaps are ~0.2 wide)</span>' : "");
      G.sc = sc; G.h = h;
    }
    function run(star) {
      if (running) cancelAnimationFrame(running);
      reset();
      const max = 4000;
      const tick = () => { for (let k = 0; k < 25 && iter < max; k++) iterate(star); draw(); if (iter < max) running = requestAnimationFrame(tick); else running = null; };
      tick();
    }
    root.querySelector("#rrt-run").addEventListener("click", () => run(false));
    root.querySelector("#rrtstar-run").addEventListener("click", () => run(true));
    root.querySelector("#rrt-stop").addEventListener("click", () => { if (running) cancelAnimationFrame(running); running = null; });
    const rs = root.querySelector("#rrt-r");
    rs.addEventListener("input", () => { R = +rs.value; if (running) cancelAnimationFrame(running); running = null; reset(); draw(); });
    cv.addEventListener("pointerdown", e => {
      const r = cv.getBoundingClientRect();
      const p = [(e.clientX - r.left) / G.sc, (G.h - (e.clientY - r.top)) / G.sc];
      if (!free(p)) return;
      if (clickGoal) goal = p; else start = p;
      clickGoal = !clickGoal;
      if (running) cancelAnimationFrame(running); running = null; reset(); draw();
    });
    window.addEventListener("resize", draw);
    window.addEventListener("themechange", draw);
    reset(); draw();
  }

  const a = document.getElementById("w-arm"); if (a) arm(a);
  const r = document.getElementById("w-rrt"); if (r) rrt(r);
})();
