/* A little birthday gift — all artwork is drawn live, with no image or JS dependencies. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const gift = $('gift');
  const canvas = $('garden');
  const ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const storageKey = 'heart-birthday-greeting-v1';
  const config = Object.assign({ name: '', message: "here's to a year that blooms", from: '', musicOnStart: false }, window.BIRTHDAY_CONFIG || {});
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (_) { /* Local files can have storage disabled. */ }
  let greeting = cleanGreeting(Object.assign({}, config, saved));
  let scene = 'idle';
  let sceneStarted = performance.now();
  let width = 1200, height = 720, pixelRatio = 1, viewWidth = 1200, viewHeight = 720;
  let portrait = false, branches = [], leaves = [];
  let pointer = { x: 0, y: 0 }, sway = { x: 0, y: 0 };
  const sprites = [];
  const colors = [
    ['#ffe4ef', '#ff86b6', '#c52b65'],
    ['#ffd6e6', '#ef4b8d', '#b91b52'],
    ['#fff1f3', '#ffadca', '#e16995'],
    ['#fff7fb', '#ffdae6', '#f09fbc'],
    ['#ffe1ec', '#e84482', '#bd1e55'],
    ['#ffe8ef', '#f56f9f', '#cd326c'],
    ['#fff6d7', '#ffc56f', '#e79a48'],
    ['#fffad9', '#ffde83', '#efbd58'],
    ['#ffffff', '#fff1e2', '#edc7ba'],
    ['#fff2f6', '#fa97bd', '#dc568c']
  ];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };

  function cleanGreeting(value) {
    const text = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
    return { name: text(value.name, 32), message: text(value.message, 120) || "here's to a year that blooms", from: text(value.from, 32) };
  }

  function updateGreeting() {
    $('wishName').textContent = greeting.name ? `for ${greeting.name}` : '';
    $('wishName').hidden = !greeting.name;
    $('wishMessage').textContent = greeting.message;
    $('wishFrom').textContent = greeting.from ? `with love, ${greeting.from}` : '';
    $('wishFrom').hidden = !greeting.from;
  }

  function seededRandom(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let n = Math.imul(seed ^ seed >>> 15, 1 | seed);
      n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n;
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    };
  }

  function heartPath(context, size) {
    context.beginPath();
    context.moveTo(0, size * .48);
    context.bezierCurveTo(-size * .12, size * .35, -size * .57, size * .07, -size * .49, -size * .23);
    context.bezierCurveTo(-size * .43, -size * .5, -size * .12, -size * .52, 0, -size * .27);
    context.bezierCurveTo(size * .15, -size * .53, size * .46, -size * .48, size * .5, -size * .22);
    context.bezierCurveTo(size * .56, size * .06, size * .13, size * .36, 0, size * .48);
    context.closePath();
  }

  function createHeartSprites() {
    colors.forEach(palette => {
      const surface = document.createElement('canvas');
      surface.width = surface.height = 128;
      const c = surface.getContext('2d');
      c.translate(64, 61);
      const gradient = c.createRadialGradient(-18, -25, 3, 2, 4, 59);
      gradient.addColorStop(0, palette[0]);
      gradient.addColorStop(.36, palette[1]);
      gradient.addColorStop(1, palette[2]);
      c.shadowColor = palette[2] + '50';
      c.shadowBlur = 5;
      c.shadowOffsetY = 4;
      heartPath(c, 96);
      c.fillStyle = gradient;
      c.fill();
      c.shadowColor = 'transparent';
      c.save();
      c.rotate(-.45);
      const shine = c.createRadialGradient(-13, -26, 0, -13, -26, 17);
      shine.addColorStop(0, '#ffffffd9');
      shine.addColorStop(.5, '#ffffff66');
      shine.addColorStop(1, '#ffffff00');
      c.fillStyle = shine;
      c.beginPath(); c.ellipse(-13, -26, 18, 11, 0, 0, Math.PI * 2); c.fill();
      c.restore();
      c.strokeStyle = '#ffffff44'; c.lineWidth = 1.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-36, -17); c.quadraticCurveTo(-36, -34, -23, -36); c.stroke();
      sprites.push(surface);
    });
  }

  function layout() {
    return portrait
      ? { cx: viewWidth * .57, cy: viewHeight * .275, rx: viewWidth * .39, ry: viewHeight * .25, baseX: viewWidth * .59, baseY: viewHeight * .77 }
      : { cx: viewWidth * .68, cy: viewHeight * .325, rx: viewWidth * .235, ry: viewHeight * .385, baseX: viewWidth * .685, baseY: viewHeight * 1.06 };
  }

  // The familiar parametric heart gives the canopy its two rounded lobes and pointed base.
  const heartOutline = Array.from({ length: 180 }, (_, i) => {
    const t = i / 180 * Math.PI * 2;
    return [Math.pow(Math.sin(t), 3), (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16];
  });

  function insideHeart(x, y) {
    let inside = false;
    for (let i = 0, j = heartOutline.length - 1; i < heartOutline.length; j = i++) {
      const [xi, yi] = heartOutline[i], [xj, yj] = heartOutline[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function buildGarden() {
    const rand = seededRandom(120720);
    const l = layout();
    branches = []; leaves = [];
    const w = viewWidth, h = viewHeight;
    const p = (x, y) => ({ x: l.cx + x * l.rx, y: l.cy - y * l.ry });
    const core = p(0, -.71);
    const trunkTop = p(.015, -.25);
    branches.push({
      a: { x: l.baseX, y: l.baseY },
      c1: { x: l.baseX - w * .043, y: l.baseY - h * .18 },
      c2: { x: core.x - w * .012, y: core.y + h * .06 },
      b: trunkTop, width: w * (portrait ? .024 : .028), endWidth: w * .01, birth: 0, duration: 1.75
    });

    function addBranch(a, b, thickness, birth, depth) {
      b = { x: clamp(b.x, l.cx - l.rx * 1.02, l.cx + l.rx * 1.02), y: clamp(b.y, l.cy - l.ry * .83, l.cy + l.ry * 1.03) };
      const dx = b.x - a.x, dy = b.y - a.y;
      const bend = (rand() - .5) * .17;
      branches.push({ a, b, c1: { x: a.x + dx * .23 + dy * bend, y: a.y + dy * .4 }, c2: { x: a.x + dx * .8, y: a.y + dy * .83 }, width: thickness, endWidth: thickness * .36, birth, duration: .85 + depth * .12 });
      if (depth < 1) return;
      for (let i = 0; i < 2; i++) {
        const t = .48 + i * .3;
        const start = { x: a.x + dx * t, y: a.y + dy * t };
        const direction = Math.atan2(dy, dx) + (i ? .72 : -.68) + (rand() - .5) * .32;
        const length = Math.hypot(dx, dy) * (.37 + rand() * .14);
        const end = { x: start.x + Math.cos(direction) * length, y: Math.max(h * .018, start.y + Math.sin(direction) * length) };
        addBranch(start, end, thickness * .53, birth + .42, depth - 1);
      }
    }

    const tips = [[-.91,.44],[-.65,.7],[-.32,.68],[.05,.70],[.33,.70],[.65,.65],[.9,.42]];
    tips.forEach((tip, i) => {
      const a = { x: core.x + (i - 3) * w * .001, y: core.y - (i % 3) * h * .025 };
      addBranch(a, p(tip[0], tip[1]), w * (.012 - Math.abs(i - 3) * .0014), .65 + Math.abs(i - 3) * .08, 3);
    });
    // Keep some elegant dark twigs visible in the cleft between the two lobes.
    addBranch(p(.015, -.3), p(-.03, .36), w * .007, 1.0, 2);

    const count = portrait ? 720 : 900;
    while (leaves.length < count) {
      const x = rand() * 2 - 1, y = rand() * 1.85 - 1.08;
      if (!insideHeart(x, y)) continue;
      const c = rand();
      const color = c < .73 ? Math.floor(rand() * 6) : c < .88 ? 6 + Math.floor(rand() * 2) : c < .94 ? 8 : 9;
      const point = p(x, y);
      leaves.push({
        x: point.x, y: point.y, rotation: (rand() - .5) * 1.22,
        size: w * (portrait ? .026 + rand() * .021 : .015 + rand() * .013),
        sprite: color, birth: 1.85 + ((y + 1.08) / 1.85) * 2.4 + rand() * .8,
        speed: 1.1 + rand(), phase: rand() * Math.PI * 2, depth: rand()
      });
    }
    leaves.sort((a, b) => a.depth - b.depth);
  }

  function resize() {
    const bounds = gift.getBoundingClientRect();
    width = bounds.width; height = bounds.height;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    portrait = width / height < 1;
    viewWidth = portrait ? 900 : 1200;
    viewHeight = viewWidth * height / Math.max(1, width);
    buildGarden();
  }

  function cubicPoint(curve, t) {
    const u = 1 - t;
    return { x: u*u*u*curve.a.x + 3*u*u*t*curve.c1.x + 3*u*t*t*curve.c2.x + t*t*t*curve.b.x, y: u*u*u*curve.a.y + 3*u*u*t*curve.c1.y + 3*u*t*t*curve.c2.y + t*t*t*curve.b.y };
  }

  function drawBranch(branch, elapsed) {
    const progress = easeOut((elapsed - branch.birth) / branch.duration);
    if (progress <= 0) return;
    ctx.lineCap = 'round';
    const steps = 22;
    for (let i = 0; i < steps; i++) {
      const t1 = i / steps, t2 = Math.min((i + 1) / steps, progress);
      if (t1 >= progress) break;
      const a = cubicPoint(branch, t1), b = cubicPoint(branch, t2);
      ctx.strokeStyle = '#673a44';
      ctx.lineWidth = branch.width + (branch.endWidth - branch.width) * t1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }

  function drawHeart(x, y, size, rotation, sprite, alpha = 1) {
    if (size < .1 || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    ctx.translate(x, y); ctx.rotate(rotation);
    ctx.drawImage(sprites[sprite % sprites.length], -size * .66, -size * .66, size * 1.32, size * 1.32);
    ctx.restore();
  }

  function drawGarden(elapsed, clock) {
    const l = layout();
    ctx.save();
    ctx.translate(sway.x * 3, 0);
    branches.forEach(branch => drawBranch(branch, elapsed));
    leaves.forEach(leaf => {
      const t = (elapsed - leaf.birth) / .7;
      if (t <= 0) return;
      const grow = t < 1 ? 1 + Math.pow(2, -7 * t) * Math.sin((t - .21) * 10) : 1;
      const flutter = reducedMotion ? 0 : Math.sin(clock * .0007 * leaf.speed + leaf.phase) * .018;
      drawHeart(leaf.x + sway.x * leaf.depth * 3, leaf.y, leaf.size * Math.max(0, grow), leaf.rotation + flutter, leaf.sprite, Math.min(t * 2, 1));
    });
    ctx.restore();
    if (elapsed > 2.8) drawDriftingHearts(clock, Math.min((elapsed - 2.8) / 2, 1), l);
  }

  function drawDriftingHearts(clock, alpha, l) {
    const rand = seededRandom(4451);
    for (let i = 0; i < 20; i++) {
      const phase = rand();
      const speed = .018 + rand() * .015;
      const tick = reducedMotion ? phase : (phase + clock * .00005 * speed * 25) % 1;
      const x = rand() * viewWidth + (reducedMotion ? 0 : Math.sin(tick * 8 + i) * 18);
      const y = -30 + tick * (viewHeight + 60);
      const size = viewWidth * (.006 + rand() * .007);
      const rotate = reducedMotion ? .2 : Math.sin(tick * 10 + i) * .7;
      // Float mostly around the edges, leaving the greeting easy to read.
      if (x < viewWidth * .43 && y > viewHeight * (portrait ? .65 : .7)) continue;
      drawHeart(x, y, size, rotate, i % 7 === 0 ? 7 : 2, alpha * (.14 + rand() * .22));
    }
  }

  function drawArrow(elapsed) {
    const t = clamp(elapsed / .66);
    const start = { x: viewWidth * (portrait ? .26 : .26), y: viewHeight * (portrait ? .72 : .765) };
    const end = { x: viewWidth * (portrait ? .56 : .58), y: viewHeight * (portrait ? .33 : .29) };
    const eased = t * t;
    const x = start.x + (end.x - start.x) * eased, y = start.y + (end.y - start.y) * eased;
    if (elapsed < .85) {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      const length = viewWidth * .085;
      ctx.strokeStyle = '#76534b'; ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.moveTo(-length, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.fillStyle = '#eac0b1'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6,-4); ctx.lineTo(-3,0); ctx.lineTo(-6,4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e583a4';
      ctx.beginPath(); ctx.moveTo(-length+13,0); ctx.lineTo(-length-4,-7); ctx.lineTo(-length-3,0); ctx.lineTo(-length-4,7); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (elapsed > .55) {
      const rand = seededRandom(134);
      const age = (elapsed - .55) * 2.5;
      for (let i = 0; i < 22; i++) {
        const direction = rand() * Math.PI * 2, travel = (20 + rand() * 72) * age;
        drawHeart(end.x + Math.cos(direction) * travel, end.y + Math.sin(direction) * travel + age * age * 8, 5 + rand() * 10, direction, i % 9, 1 - age * .62);
      }
    }
  }

  function setScene(next, now = performance.now()) {
    scene = next; sceneStarted = now; gift.dataset.scene = next;
    $('invitation').inert = next !== 'idle';
    $('openGift').disabled = next !== 'idle';
    $('invitation').setAttribute('aria-hidden', String(next !== 'idle'));
    $('birthdayReveal').setAttribute('aria-hidden', String(next !== 'title'));
    $('wish').setAttribute('aria-hidden', String(next !== 'growing' && next !== 'complete'));
    if (next === 'title') $('announcement').textContent = 'Make a wish. Happy Birthday!';
    if (next === 'complete') {
      $('announcement').textContent = `Happy Birthday${greeting.name ? ', ' + greeting.name : ''}. ${greeting.message}${greeting.from ? '. With love, ' + greeting.from : ''}.`;
      if (document.activeElement === $('openGift')) $('replay').focus({ preventScroll: true });
    }
  }

  function frame(now) {
    const elapsed = (now - sceneStarted) / 1000;
    if (scene === 'shooting' && elapsed >= (reducedMotion ? .12 : 1.08)) setScene('title', now);
    else if (scene === 'title' && elapsed >= (reducedMotion ? 2.4 : 3.65)) setScene('growing', now);
    else if (scene === 'growing' && elapsed >= (reducedMotion ? .3 : 7.0)) setScene('complete', now);

    ctx.setTransform(canvas.width / viewWidth, 0, 0, canvas.height / viewHeight, 0, 0);
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    sway.x += (pointer.x - sway.x) * .035;
    sway.y += (pointer.y - sway.y) * .035;
    if (scene === 'shooting' && !reducedMotion) drawArrow(elapsed);
    if (scene === 'growing' || scene === 'complete') {
      drawGarden(scene === 'complete' || reducedMotion ? 30 : Math.max(0, (now - sceneStarted) / 1000), now);
    }
    requestAnimationFrame(frame);
  }

  // A small, optional music box. Audio starts only after a user gesture.
  class MusicBox {
    constructor() { this.context = null; this.master = null; this.timer = null; this.enabled = false; this.voices = new Set(); }
    async start() {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return false;
      try {
        if (!this.context) {
          this.context = new Audio();
          this.master = this.context.createGain(); this.master.gain.value = .32; this.master.connect(this.context.destination);
        }
        await this.context.resume();
        this.enabled = true; this.master.gain.cancelScheduledValues(this.context.currentTime); this.master.gain.setTargetAtTime(.32, this.context.currentTime, .15);
        this.schedule(); return true;
      } catch (_) { return false; }
    }
    note(midi, start, duration = .5, volume = .18) {
      const frequency = 440 * Math.pow(2, (midi - 69) / 12);
      const gain = this.context.createGain(); const osc = this.context.createOscillator();
      osc.type = 'sine'; osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(volume, start + .012); gain.gain.exponentialRampToValueAtTime(.001, start + duration + .75);
      osc.connect(gain); gain.connect(this.master);
      this.voices.add(osc);
      osc.onended = () => { this.voices.delete(osc); osc.disconnect(); gain.disconnect(); };
      osc.start(start); osc.stop(start + duration + .8);
    }
    schedule() {
      clearTimeout(this.timer);
      if (!this.enabled || document.hidden) return;
      const melody = [[67,.75],[67,.25],[69,1],[67,1],[72,1],[71,2],[67,.75],[67,.25],[69,1],[67,1],[74,1],[72,2],[67,.75],[67,.25],[79,1],[76,1],[72,1],[71,1],[69,2],[77,.75],[77,.25],[76,1],[72,1],[74,1],[72,2.5]];
      const beat = .34; let offset = .15;
      for (const [midi, length] of melody) { this.note(midi + 12, this.context.currentTime + offset, length * beat, .11); offset += length * beat; }
      for (let i = 0; i < 8; i++) [48,55,60].forEach((midi,j) => this.note(midi, this.context.currentTime + .15 + i * 4 * beat + j * .08, 1.15, .025));
      this.timer = setTimeout(() => this.schedule(), (offset + 3) * 1000);
    }
    clearNotes() {
      for (const voice of this.voices) { try { voice.stop(); } catch (_) {} }
      this.voices.clear();
    }
    stop() {
      this.enabled = false; clearTimeout(this.timer);
      this.clearNotes();
      if (this.context) this.master.gain.setTargetAtTime(0, this.context.currentTime, .08);
    }
  }
  const music = new MusicBox();
  let musicBusy = false;
  async function toggleMusic() {
    if (musicBusy) return;
    musicBusy = true;
    try {
      if (music.enabled) music.stop();
      else if (!await music.start()) { $('announcement').textContent = 'Music is unavailable in this browser. The birthday surprise is ready to play.'; return; }
      $('sound').setAttribute('aria-pressed', String(music.enabled));
      $('sound').setAttribute('aria-label', music.enabled ? 'Turn music off' : 'Turn music on');
      $('sound').title = music.enabled ? 'Turn music off' : 'Turn music on';
    } finally { musicBusy = false; }
  }

  $('openGift').addEventListener('click', () => {
    if (scene !== 'idle') return;
    setScene('shooting');
    if (config.musicOnStart && !music.enabled) toggleMusic();
  });
  $('replay').addEventListener('click', () => {
    setScene('idle');
    $('announcement').textContent = 'Your gift is ready again. Click the heart to begin.';
    $('openGift').focus({ preventScroll: true });
  });
  $('sound').addEventListener('click', toggleMusic);
  $('edit').addEventListener('click', () => {
    $('recipient').value = greeting.name; $('message').value = greeting.message; $('sender').value = greeting.from;
    $('personalize').showModal();
  });
  $('closeDialog').addEventListener('click', () => $('personalize').close());
  $('personalize').addEventListener('click', event => { if (event.target === $('personalize')) { const r = $('personalize').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('personalize').close(); } });
  $('greetingForm').addEventListener('submit', event => {
    event.preventDefault();
    greeting = cleanGreeting({ name: $('recipient').value, message: $('message').value, from: $('sender').value });
    try { localStorage.setItem(storageKey, JSON.stringify(greeting)); } catch (_) { /* Personalization still works for this session. */ }
    updateGreeting(); $('personalize').close();
    $('announcement').textContent = 'Birthday greeting saved. Open the heart to see your surprise.';
    setScene('idle');
  });
  gift.addEventListener('pointermove', event => { if (!reducedMotion) { pointer.x = (event.clientX / width - .5) * 2; pointer.y = (event.clientY / height - .5) * 2; } });
  gift.addEventListener('pointerleave', () => { pointer = { x: 0, y: 0 }; });
  document.addEventListener('visibilitychange', () => {
    if (!music.enabled || !music.context) return;
    if (document.hidden) { clearTimeout(music.timer); music.clearNotes(); music.context.suspend().catch(() => {}); }
    else music.context.resume().then(() => music.schedule()).catch(() => {});
  });
  window.addEventListener('pagehide', () => music.stop());
  window.addEventListener('resize', resize);
  createHeartSprites(); updateGreeting(); resize(); requestAnimationFrame(frame);
})();
