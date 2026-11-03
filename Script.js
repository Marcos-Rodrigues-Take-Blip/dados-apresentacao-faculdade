(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const smooth = () => (reduce.matches ? 'auto' : 'smooth');
  const sections = Array.from(document.querySelectorAll('main > .slide'));
  const total = sections.length;
  const vizOf = new Map();

  /* ---------- Navegação ---------- */
  const nav = document.querySelector('.dots');
  const bar = document.querySelector('.progress span');
  const fsBtn = nav.querySelector('.fs-btn');
  const dots = sections.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dot';
    b.setAttribute('aria-label', (i + 1) + '. ' + s.dataset.label);
    const lbl = document.createElement('span');
    lbl.className = 'dot-label';
    lbl.setAttribute('aria-hidden', 'true');
    lbl.textContent = s.dataset.label;
    b.appendChild(lbl);
    b.addEventListener('click', () => go(i));
    nav.insertBefore(b, fsBtn);
    return b;
  });

  let current = -1;
  function setActive(i) {
    if (i === current) return;
    const prev = current;
    current = i;
    dots.forEach((d, k) => d.setAttribute('aria-current', k === i ? 'true' : 'false'));
    bar.style.width = (total > 1 ? (i / (total - 1)) * 100 : 100) + '%';
    bar.style.background = getComputedStyle(sections[i]).getPropertyValue('--acc').trim() || '#38d4ff';
    sections.forEach((s, k) => s.classList.toggle('is-active', k === i));
    vizOf.forEach((v) => v.pause());
    const v = vizOf.get(sections[i]);
    if (v && prev !== -1) v.reset();
  }
  function activeIndex() {
    const y = window.innerHeight * 0.45;
    let idx = 0;
    for (let i = 0; i < total; i++) if (sections[i].getBoundingClientRect().top <= y) idx = i;
    return idx;
  }
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; setActive(activeIndex()); });
  }, { passive: true });
  function go(i) {
    i = Math.max(0, Math.min(total - 1, i));
    sections[i].scrollIntoView({ behavior: smooth(), block: 'start' });
  }
  function updateSnap() {
    const fits = sections.every((s) => s.offsetHeight <= window.innerHeight + 4);
    root.classList.toggle('snap', fits);
    root.classList.toggle('snap-soft', !fits);
  }
  new ResizeObserver(updateSnap).observe(document.querySelector('main'));
  window.addEventListener('resize', updateSnap);

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: smooth(), block: 'start' });
    });
  });

  // ← → (e passadores de slide) avançam primeiro os passos do exemplo; ↑ ↓ trocam de slide direto
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target instanceof Element ? e.target : document.body;
    const k = e.key;
    if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
    if ((k === ' ' || k === 'Enter') && t.closest('button, a, summary, label')) return;
    if (k === 'f' || k === 'F') { toggleFs(); return; }
    let mode = 0;
    if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) mode = 1;
    else if (k === 'ArrowLeft' || k === 'PageUp' || (k === ' ' && e.shiftKey)) mode = -1;
    else if (k === 'ArrowDown') mode = 2;
    else if (k === 'ArrowUp') mode = -2;
    else if (k === 'Home') { e.preventDefault(); go(0); return; }
    else if (k === 'End') { e.preventDefault(); go(total - 1); return; }
    if (!mode) return;
    e.preventDefault();
    const idx = activeIndex();
    const viz = vizOf.get(sections[idx]);
    if (mode === 1 && viz && viz.next()) return;
    if (mode === -1 && viz && viz.prev()) return;
    const dir = mode > 0 ? 1 : -1;
    const r = sections[idx].getBoundingClientRect();
    const vh = window.innerHeight;
    if (dir > 0 && r.bottom > vh + 8) { window.scrollBy({ top: Math.min(vh * 0.85, r.bottom - vh), behavior: smooth() }); return; }
    if (dir < 0 && r.top < -8) { window.scrollBy({ top: Math.max(-vh * 0.85, r.top), behavior: smooth() }); return; }
    go(idx + dir);
  });

  /* ---------- Tela cheia ---------- */
  function toggleFs() {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else root.requestFullscreen().catch(() => {});
  }
  if (document.fullscreenEnabled) {
    fsBtn.hidden = false;
    fsBtn.addEventListener('click', toggleFs);
    document.addEventListener('fullscreenchange', () => {
      const on = !!document.fullscreenElement;
      fsBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      fsBtn.setAttribute('aria-label', on ? 'Sair da tela cheia' : 'Tela cheia');
    });
  }

  /* ---------- Esfera de partículas (arraste para girar) ---------- */
  function sphere(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const small = window.matchMedia('(max-width: 760px)').matches;
    const N = small ? 4200 : 9000;
    let seed = 20261104;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const gauss = () => { const u = Math.max(rnd(), 1e-7); const v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); };
    const nrm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
    const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const bands = [
      { n: nrm([0.3, 0.45, 1]), a0: -1.2, a1: 1.9, w: 0.085 },
      { n: nrm([-0.6, 0.7, 0.4]), a0: 2.2, a1: 5.1, w: 0.1 }
    ].map((b) => {
      const ref = Math.abs(b.n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const u = nrm(crs(b.n, ref));
      return Object.assign(b, { u: u, v: crs(b.n, u) });
    });
    const groups = [[], [], [], []];
    for (let i = 0; i < N; i++) {
      let x, y, z, br, g;
      if (i % 20 < 9) {
        const u = rnd() * 2 - 1, t = rnd() * 6.2831853, r = Math.sqrt(1 - u * u), k = 1 + gauss() * 0.012;
        x = r * Math.cos(t) * k; y = u * k; z = r * Math.sin(t) * k;
        br = 0.22 + rnd() * 0.5;
        g = rnd() < 0.24 ? 3 : 2;
      } else {
        const b = bands[(i >> 1) % 2];
        const f = rnd();
        const a = b.a0 + f * (b.a1 - b.a0);
        const off = gauss() * b.w;
        const ca = Math.cos(a), sa = Math.sin(a);
        const px = ca * b.u[0] + sa * b.v[0] + off * b.n[0];
        const py = ca * b.u[1] + sa * b.v[1] + off * b.n[1];
        const pz = ca * b.u[2] + sa * b.v[2] + off * b.n[2];
        const l = Math.hypot(px, py, pz) * (1 + gauss() * 0.01);
        x = px / l; y = py / l; z = pz / l;
        const taper = Math.pow(Math.sin(Math.PI * f), 0.8);
        const core = Math.exp(-(off * off) / (2 * Math.pow(b.w * 0.5, 2)));
        br = (0.22 + 0.78 * core) * taper;
        g = core > 0.72 ? 0 : 1;
      }
      groups[g].push(x, y, z, br);
    }
    const G = groups.map((a) => new Float32Array(a));
    const colors = ['#dbe8ff', '#38c8ff', '#1968f0', '#a85aed'];
    const sizes = [1.5, 1.3, 1.05, 1.05];
    const tilt = -0.38, ct = Math.cos(tilt), st = Math.sin(tilt);
    const spin = 0.00011;
    let W = 1, H = 1, dpr = 1, raf = 0, visible = false, last = 0, angle = 0.6, vel = 0, drag = null;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const R = Math.min(W, H) * 0.4, cx = W / 2, cy = H / 2;
      const ca = Math.cos(angle), sa = Math.sin(angle);
      for (let g = 0; g < 4; g++) {
        const a = G[g];
        const base = sizes[g] * dpr;
        ctx.fillStyle = colors[g];
        for (let i = 0; i < a.length; i += 4) {
          const x = a[i], y = a[i + 1], z = a[i + 2];
          const x1 = x * ca + z * sa, z1 = z * ca - x * sa;
          const y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
          const p = 3.2 / (3.2 - z2);
          ctx.globalAlpha = a[i + 3] * (0.22 + 0.78 * (z2 + 1) * 0.5);
          const s = base * p;
          ctx.fillRect(cx + x1 * R * p - s / 2, cy - y2 * R * p - s / 2, s, s);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width * dpr));
      H = Math.max(1, Math.round(r.height * dpr));
      canvas.width = W; canvas.height = H;
      draw();
    }
    function loop(now) {
      const dt = Math.min(64, now - last);
      last = now;
      if (!drag) {
        angle += dt * ((reduce.matches ? 0 : spin) + vel);
        vel *= Math.pow(0.94, dt / 16.7);
        if (Math.abs(vel) < 1e-6) vel = 0;
      }
      draw();
      const keep = visible && !document.hidden && (!reduce.matches || drag || vel !== 0);
      raf = keep ? requestAnimationFrame(loop) : 0;
    }
    function start() {
      if (raf || !visible || document.hidden) return;
      if (reduce.matches && !drag && !vel) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    canvas.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, t: performance.now() };
      vel = 0;
      canvas.setPointerCapture(e.pointerId);
      start();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const now = performance.now();
      const da = (e.clientX - drag.x) * 0.0065;
      angle += da;
      vel = da / Math.max(8, now - drag.t);
      drag = { x: e.clientX, t: now };
      if (!raf) draw();
    });
    const endDrag = () => { drag = null; start(); };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) start(); else stop();
    }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    new ResizeObserver(resize).observe(canvas);
    resize();
  }
  document.querySelectorAll('canvas.sphere').forEach(sphere);

  /* ---------- Exemplos visuais passo a passo ---------- */
  function createViz(el, algo) {
    const slide = el.closest('.slide');
    const track = el.querySelector('.track');
    const row = el.querySelector('.row');
    const idxRow = el.querySelector('.idx');
    const brWrap = el.querySelector('.brackets');
    const arcsSvg = el.querySelector('.arcs');
    const statusEl = el.querySelector('.status');
    const countEl = el.querySelector('.count');
    const badgeEl = el.querySelector('.badge-slot');
    const btn = (a) => el.querySelector('[data-act="' + a + '"]');
    const howItems = Array.from(slide.querySelectorAll('.how li'));
    const cxCards = Array.from(slide.querySelectorAll('.cx[data-case]'));
    const n = algo.values.length;
    track.style.setProperty('--n', n);
    const cells = new Map();
    algo.values.forEach((v, i) => {
      const c = document.createElement('div');
      c.className = 'cell';
      c.style.setProperty('--i', i);
      const box = document.createElement('span');
      box.className = 'box';
      box.textContent = v;
      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.setAttribute('aria-hidden', 'true');
      c.append(box, mark);
      row.appendChild(c);
      cells.set(v, { el: c, mark: mark });
    });
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.textContent = i;
      s.style.setProperty('--i', i);
      idxRow.appendChild(s);
    }
    const brMap = new Map();
    let states = algo.build();
    let k = 0, playTimer = null, scanTimers = [];

    function applyCells(st) {
      st.order.forEach((v, i) => cells.get(v).el.style.setProperty('--i', i));
      cells.forEach((c, v) => {
        const cls = (st.cls && st.cls[v]) || '';
        c.el.className = cls ? 'cell ' + cls : 'cell';
        const col = st.colors && st.colors[v];
        if (col) c.el.style.setProperty('--gc', col); else c.el.style.removeProperty('--gc');
        const m = st.marks && st.marks[v];
        if (m) { c.mark.textContent = m; c.mark.classList.add('on'); } else { c.mark.classList.remove('on'); }
      });
    }
    function applyBrackets(list) {
      const keep = new Set();
      (list || []).forEach((b) => {
        keep.add(b.key);
        let e = brMap.get(b.key);
        if (!e) {
          e = document.createElement('div');
          e.className = 'br';
          e.appendChild(document.createElement('span'));
          brWrap.appendChild(e);
          brMap.set(b.key, e);
        }
        e.classList.remove('leaving');
        e.classList.toggle('acc', b.tone === 'acc');
        e.style.setProperty('--a', b.a);
        e.style.setProperty('--b', b.b);
        e.firstChild.textContent = b.label || '';
      });
      brMap.forEach((e, key) => { if (!keep.has(key)) e.classList.add('leaving'); });
    }
    function applyArcs(list) {
      if (!arcsSvg) return;
      arcsSvg.innerHTML = (list || []).map((a) => {
        const x1 = (((a.a + 0.5) / n) * 1000).toFixed(1), x2 = (((a.b + 0.5) / n) * 1000).toFixed(1);
        const h = Math.min(96, 30 + Math.abs(a.b - a.a) * 13 + (a.lift || 0));
        const c = (100 - h / 0.75).toFixed(1);
        return '<path d="M' + x1 + ' 100C' + x1 + ' ' + c + ' ' + x2 + ' ' + c + ' ' + x2 + ' 100" style="stroke:' + a.color + '"/>';
      }).join('');
    }
    function clearScan() { scanTimers.forEach(clearTimeout); scanTimers = []; }
    function runScan(st) {
      const pre = st.preCls || {};
      st.scan.forEach((s, j) => {
        scanTimers.push(setTimeout(() => {
          const cls = Object.assign({}, pre);
          const add = (v, c) => { cls[v] = cls[v] ? cls[v] + ' ' + c : c; };
          add(st.order[s.i], 'is-scan');
          add(s.min, 'is-min');
          applyCells({ order: st.order, cls: cls, marks: { [s.min]: 'menor' } });
        }, j * 320));
      });
      scanTimers.push(setTimeout(() => { applyCells(st); applyArcs(st.arcs); }, st.scan.length * 320 + 120));
    }
    function render(animate) {
      clearScan();
      const st = states[k];
      if (animate && st.scan && !reduce.matches) {
        applyCells({ order: st.order, cls: st.preCls || {}, marks: {} });
        applyArcs([]);
        runScan(st);
      } else {
        applyCells(st);
        applyArcs(st.arcs);
      }
      applyBrackets(st.brackets);
      statusEl.textContent = st.status;
      countEl.textContent = (k + 1) + '/' + states.length;
      if (badgeEl) badgeEl.innerHTML = st.badge || '';
      howItems.forEach((li, i) => li.classList.toggle('is-now', !!st.how && st.how.indexOf(i) > -1));
      cxCards.forEach((c) => c.classList.toggle('is-hit', !!st.hit && c.dataset.case === st.hit));
      btn('prev').disabled = k === 0;
      btn('next').disabled = k === states.length - 1;
    }
    function goTo(to, animate) { k = Math.max(0, Math.min(states.length - 1, to)); render(animate); }
    function setPlaying(on) {
      const b = btn('play');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', on ? 'Pausar' : 'Reproduzir');
      b.querySelector('use').setAttribute('href', on ? '#i-pause' : '#i-play');
    }
    function pause() { if (playTimer) clearTimeout(playTimer); playTimer = null; setPlaying(false); }
    function play() {
      if (k >= states.length - 1) goTo(0, false);
      setPlaying(true);
      const tick = () => {
        if (k >= states.length - 1) { playTimer = null; setPlaying(false); return; }
        goTo(k + 1, true);
        playTimer = setTimeout(tick, states[k].scan ? 2700 : 1800);
      };
      playTimer = setTimeout(tick, 700);
    }
    function next() { if (k >= states.length - 1) return false; pause(); goTo(k + 1, true); return true; }
    function prev() { if (k <= 0) return false; pause(); goTo(k - 1, false); return true; }
    btn('next').addEventListener('click', () => next());
    btn('prev').addEventListener('click', () => prev());
    btn('reset').addEventListener('click', () => { pause(); goTo(0, false); });
    btn('play').addEventListener('click', () => { if (playTimer) pause(); else play(); });
    render(false);
    return {
      next: next,
      prev: prev,
      pause: pause,
      reset() { pause(); goTo(0, false); },
      toEnd() { pause(); goTo(states.length - 1, false); },
      rebuild() { pause(); states = algo.build(); goTo(0, false); }
    };
  }

  /* Busca Binária */
  const BIN = [3, 8, 12, 17, 21, 25, 30, 34, 41, 47, 52, 58, 63, 70, 77];
  const binSelect = document.querySelector('[data-target]');
  function binaryStates(target) {
    const n = BIN.length;
    const worst = Math.floor(Math.log2(n)) + 1;
    const out = new Set();
    const base = () => { const c = {}; out.forEach((i) => { c[BIN[i]] = 'is-out'; }); return c; };
    const range = (a, b) => [{ key: 'r', a: a, b: b, label: 'intervalo de busca', tone: 'acc' }];
    const restam = (q) => (q === 1 ? 'Resta 1 número' : 'Restam ' + q + ' números');
    const st = [{ order: BIN, cls: {}, brackets: range(0, n - 1), how: [], status: 'Lista ordenada com ' + n + ' números. Vamos procurar o ' + target + '.' }];
    let lo = 0, hi = n - 1, comps = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, v = BIN[mid];
      comps++;
      const hit = comps === 1 ? 'best' : comps >= worst ? 'worst' : 'avg';
      if (v === target) {
        const cls = base(); cls[v] = 'is-found';
        st.push({ order: BIN, cls: cls, marks: { [v]: 'encontrado' }, brackets: range(lo, hi), how: [0, 1, 3], hit: hit,
          status: 'Encontrado! O ' + target + ' está na posição ' + mid + (comps === 1 ? ', logo na primeira comparação.' : ', depois de ' + comps + ' comparações.') });
        return st;
      }
      const right = target > v;
      const cls = base(); cls[v] = 'is-mid';
      st.push({ order: BIN, cls: cls, marks: { [v]: 'meio' }, brackets: range(lo, hi), how: [0, 1],
        status: 'Elemento central: ' + v + '. Como ' + target + (right ? ' > ' : ' < ') + v + ', o valor só pode estar à ' + (right ? 'direita' : 'esquerda') + '.' });
      if (right) { for (let i = lo; i <= mid; i++) out.add(i); lo = mid + 1; }
      else { for (let i = mid; i <= hi; i++) out.add(i); hi = mid - 1; }
      if (lo <= hi) {
        st.push({ order: BIN, cls: base(), brackets: range(lo, hi), how: [2],
          status: 'Descarta a metade ' + (right ? 'esquerda' : 'direita') + '. ' + restam(hi - lo + 1) + '.' });
      } else {
        st.push({ order: BIN, cls: base(), brackets: [], how: [2, 3], hit: hit,
          status: 'Não sobrou nenhum número: o ' + target + ' não está na lista. Foram ' + comps + ' comparações.' });
        return st;
      }
    }
    return st;
  }

  /* Quick Sort (pivô = último elemento da partição) */
  function quickStates() {
    const tag = (vals, c) => Object.fromEntries(vals.map((v) => [v, c]));
    return [
      { order: [7, 2, 9, 4, 1, 8, 5], cls: {}, how: [], status: 'Lista desorganizada com 7 números.' },
      { order: [7, 2, 9, 4, 1, 8, 5], cls: { 5: 'is-pivot' }, marks: { 5: 'pivô' }, how: [0], status: 'Escolhe o pivô. Aqui, o último elemento: 5.' },
      { order: [2, 4, 1, 5, 9, 8, 7], cls: { 5: 'is-pivot' }, marks: { 5: 'pivô' }, how: [1, 2],
        brackets: [{ key: 'a', a: 0, b: 2, label: 'menores que 5' }, { key: 'b', a: 4, b: 6, label: 'maiores que 5' }],
        status: 'Menores que 5 vão para a esquerda e maiores para a direita. O 5 já está na posição final.' },
      { order: [2, 4, 1, 5, 9, 8, 7], cls: { 5: 'is-done', 1: 'is-pivot', 7: 'is-pivot' }, marks: { 1: 'pivô', 7: 'pivô' }, how: [3],
        brackets: [{ key: 'a', a: 0, b: 2, label: 'partição esquerda' }, { key: 'b', a: 4, b: 6, label: 'partição direita' }],
        status: 'O mesmo processo em cada partição, com os pivôs 1 e 7.' },
      { order: [1, 4, 2, 5, 7, 8, 9], cls: tag([1, 5, 7], 'is-done'), how: [1, 2, 3],
        brackets: [{ key: 'c', a: 1, b: 2 }, { key: 'd', a: 5, b: 6 }],
        status: 'O 1 e o 7 chegam à posição final. Sobram duas partições pequenas.' },
      { order: [1, 4, 2, 5, 7, 8, 9], cls: Object.assign(tag([1, 5, 7], 'is-done'), { 2: 'is-pivot', 9: 'is-pivot' }), marks: { 2: 'pivô', 9: 'pivô' }, how: [3],
        brackets: [{ key: 'c', a: 1, b: 2 }, { key: 'd', a: 5, b: 6 }],
        status: 'Novos pivôs: 2 e 9.' },
      { order: [1, 2, 4, 5, 7, 8, 9], cls: tag([1, 2, 4, 5, 7, 8, 9], 'is-final'), how: [3],
        status: 'Partições com um só elemento já estão ordenadas. Lista ordenada!' }
    ];
  }

  /* Shell Sort (intervalos 4, 2 e 1) */
  function shellStates() {
    const P = { 4: ['#a85aed', '#38d4ff', '#35de90', '#fb4bc1'], 2: ['#a85aed', '#38d4ff'], 1: ['#a85aed'] };
    const s0 = [35, 33, 42, 10, 14, 19, 27, 44];
    const s1 = [14, 19, 27, 10, 35, 33, 42, 44];
    const s2 = [14, 10, 27, 19, 35, 33, 42, 44];
    const s3 = [10, 14, 19, 27, 33, 35, 42, 44];
    const badge = (g) => 'Intervalo <strong class="pill">' + g + '</strong>';
    const step = (order, gap, how, status) => {
      const cls = {}, colors = {}, arcs = [];
      order.forEach((v, i) => { cls[v] = 'is-group'; colors[v] = P[gap][i % gap]; });
      for (let i = 0; i + gap < order.length; i++) arcs.push({ a: i, b: i + gap, color: P[gap][i % gap], lift: (i % gap) * 6 });
      return { order: order, cls: cls, colors: colors, arcs: arcs, how: how, status: status, badge: badge(gap) };
    };
    return [
      { order: s0, cls: {}, how: [], status: 'Lista com 8 números fora de ordem.' },
      step(s0, 4, [0, 1], 'Intervalo 4: cada cor é um grupo de elementos a 4 posições de distância.'),
      step(s1, 4, [1], 'Pares fora de ordem trocam de lugar: 35 e 14, 33 e 19, 42 e 27.'),
      step(s1, 2, [2], 'O intervalo cai para 2. Agora são dois grupos.'),
      step(s2, 2, [1], 'Ordenando cada grupo, só o 19 e o 10 trocam de lugar.'),
      step(s2, 1, [3], 'Intervalo 1: uma última passada por inserção, com a lista quase pronta.'),
      { order: s3, cls: Object.fromEntries(s3.map((v) => [v, 'is-final'])), how: [3], status: 'Lista ordenada!', badge: badge(1) }
    ];
  }

  /* Selection Sort */
  function selectionStates() {
    const arr = [64, 25, 12, 22, 11];
    const n = arr.length;
    const st = [{ order: arr.slice(), cls: {}, how: [], brackets: [{ key: 'u', a: 0, b: n - 1, label: 'não ordenada' }], status: 'Lista com 5 números fora de ordem.' }];
    for (let i = 0; i < n - 1; i++) {
      let m = i;
      const seq = [];
      for (let j = i; j < n; j++) { if (arr[j] < arr[m]) m = j; seq.push({ i: j, min: arr[m] }); }
      const sorted = {};
      for (let s = 0; s < i; s++) sorted[arr[s]] = 'is-sorted';
      const br = [];
      if (i > 0) br.push({ key: 's', a: 0, b: i - 1, label: 'ordenada', tone: 'acc' });
      br.push({ key: 'u', a: i, b: n - 1, label: 'não ordenada' });
      const minV = arr[m];
      const cls = Object.assign({}, sorted);
      cls[minV] = 'is-min';
      if (m !== i) cls[arr[i]] = 'is-target';
      st.push({ order: arr.slice(), cls: cls, preCls: sorted, marks: { [minV]: 'menor' }, brackets: br,
        arcs: m !== i ? [{ a: i, b: m, color: 'var(--acc)' }] : [], scan: seq, how: i === 0 ? [0] : [2, 0],
        status: (i === 0 ? 'Percorre a lista: o menor é o ' : 'Na parte não ordenada, o menor é o ') + minV + '.' });
      const swapped = arr[i];
      if (m !== i) { arr[m] = arr[i]; arr[i] = minV; }
      const after = {};
      for (let s = 0; s <= i; s++) after[arr[s]] = 'is-sorted';
      const status = m !== i ? 'O ' + minV + ' troca de lugar com o ' + swapped + ' e vai para a posição ' + i + '.' : 'O ' + minV + ' já está na posição ' + i + '.';
      if (i === n - 2) {
        after[arr[n - 1]] = 'is-sorted';
        st.push({ order: arr.slice(), cls: after, how: [1, 3], brackets: [{ key: 's', a: 0, b: n - 1, label: 'ordenada', tone: 'acc' }],
          status: status + ' O ' + arr[n - 1] + ' sobra por último: lista ordenada!' });
      } else {
        st.push({ order: arr.slice(), cls: after, how: [1], status: status,
          brackets: [{ key: 's', a: 0, b: i, label: 'ordenada', tone: 'acc' }, { key: 'u', a: i + 1, b: n - 1, label: 'não ordenada' }] });
      }
    }
    return st;
  }

  const ALGOS = {
    binary: { values: BIN, build: () => binaryStates(Number(binSelect.value)) },
    quick: { values: [7, 2, 9, 4, 1, 8, 5], build: quickStates },
    shell: { values: [35, 33, 42, 10, 14, 19, 27, 44], build: shellStates },
    selection: { values: [64, 25, 12, 22, 11], build: selectionStates }
  };
  document.querySelectorAll('.viz[data-algo]').forEach((el) => {
    vizOf.set(el.closest('.slide'), createViz(el, ALGOS[el.dataset.algo]));
  });
  binSelect.addEventListener('change', () => vizOf.get(binSelect.closest('.slide')).rebuild());

  /* ---------- Comparativo ---------- */
  const range = document.getElementById('n-range');
  const nOut = document.getElementById('n-out');
  function human(x) {
    if (x < 1000) return String(Math.round(x));
    const U = [[1e12, 'trilhão', 'trilhões'], [1e9, 'bilhão', 'bilhões'], [1e6, 'milhão', 'milhões'], [1e3, 'mil', 'mil']];
    for (let i = 0; i < U.length; i++) {
      const [u, one, many] = U[i];
      if (x >= u) {
        const v = x / u;
        const r = v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
        return String(r).replace('.', ',') + ' ' + (r < 2 ? one : many);
      }
    }
    return String(x);
  }
  function updateGrow() {
    const n = Math.pow(10, Number(range.value));
    nOut.textContent = n.toLocaleString('pt-BR');
    const vals = { log: Math.ceil(Math.log2(n + 1)), nlog: n * Math.log2(n), n2: n * n };
    Object.keys(vals).forEach((key) => {
      const rowEl = document.querySelector('[data-grow="' + key + '"]');
      const v = vals[key];
      rowEl.querySelector('.bar-fill').style.width = Math.max(2, (Math.log10(v) / 12) * 100) + '%';
      rowEl.querySelector('.bar-val').textContent = (key === 'nlog' ? '≈ ' : '') + human(v);
    });
  }
  range.addEventListener('input', updateGrow);
  updateGrow();

  /* ---------- Início ---------- */
  updateSnap();
  setActive(activeIndex());
})();