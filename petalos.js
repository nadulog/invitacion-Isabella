// Pétalos pastel (rosa, lila, celeste) y destellos de strass que caen suave
// mientras se ven las secciones marcadas con data-petalos.
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var MAX_ALIVE = 14, EVERY_S = 0.8, SEED = 5;
  var COLORS = [
    ["#fbe1e7", "#f2b8c6"], ["#fbe1e7", "#f2b8c6"], ["#fde9ee", "#eeaabd"], // prevalece el rosa
    ["#efe4fa", "#cdb5ea"],                                                  // lila
    ["#e6f0fc", "#b9cdee"]                                                   // celeste
  ];

  var canvas = document.createElement("canvas");
  canvas.className = "falling-petals";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");
  var vw = 0, vh = 0;
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth; vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  var zones = Array.prototype.slice.call(document.querySelectorAll("[data-petalos]"));
  function inZone() {
    for (var i = 0; i < zones.length; i++) {
      var r = zones[i].getBoundingClientRect();
      if (r.top < vh * 0.65 && r.bottom > vh * 0.35) return true;
    }
    return false;
  }

  var items = [], running = false, prev = 0, wasActive = false, acc = 0, fade = 1;

  function spawn(anywhere) {
    if (items.length >= MAX_ALIVE) return;
    var sparkle = Math.random() < 0.22;
    var size = sparkle ? 3 + Math.random() * 3 : 6 + Math.random() * 6;
    items.push({
      sparkle: sparkle,
      x: Math.random() * vw,
      y: anywhere ? Math.random() * vh * 0.8 : -size - Math.random() * 40,
      size: size,
      vy: sparkle ? 22 + Math.random() * 16 : 30 + Math.random() * 28,
      sway: 12 + Math.random() * 22,
      swaySpeed: 0.6 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 1.6,
      tilt: Math.random() * Math.PI * 2,
      vt: 0.8 + Math.random() * 1.4,
      alpha: 0,
      maxAlpha: 0.75 + Math.random() * 0.25,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      t: 0
    });
  }

  function drawPetal(p) {
    var s = p.size;
    var g = ctx.createLinearGradient(0, -s, 0, s);
    g.addColorStop(0, p.color[0]);
    g.addColorStop(1, p.color[1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.9, -s * 0.6, s * 0.7, s * 0.7, 0, s);
    ctx.bezierCurveTo(-s * 0.7, s * 0.7, -s * 0.9, -s * 0.6, 0, -s);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7);
    ctx.lineTo(0, s * 0.6);
    ctx.stroke();
  }

  function drawSparkle(p) {
    var s = p.size * (0.7 + 0.5 * Math.abs(Math.sin(p.t * 3 + p.phase)));
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.shadowColor = "rgba(255,255,255,.9)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, -s * 2);
    ctx.quadraticCurveTo(0, 0, s * 2, 0);
    ctx.quadraticCurveTo(0, 0, 0, s * 2);
    ctx.quadraticCurveTo(0, 0, -s * 2, 0);
    ctx.quadraticCurveTo(0, 0, 0, -s * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function frame(now) {
    var dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;
    ctx.clearRect(0, 0, vw, vh);
    var active = !document.body.classList.contains("intro-open") && inZone();
    if (active && !wasActive) { fade = 1; for (var s = 0; s < SEED; s++) spawn(true); }
    wasActive = active;
    if (active) {
      acc += dt;
      while (acc >= EVERY_S) { acc -= EVERY_S; spawn(false); }
    } else {
      fade = Math.max(0, fade - dt * 2.5);
      if (fade === 0) items.length = 0;
    }
    for (var i = items.length - 1; i >= 0; i--) {
      var p = items[i];
      p.t += dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.tilt += p.vt * dt;
      if (p.y > vh + p.size * 2) { items.splice(i, 1); continue; }
      var x = p.x + Math.sin(p.phase + p.t * p.swaySpeed) * p.sway;
      p.alpha = Math.min(p.maxAlpha, p.alpha + dt * 1.2);
      var fadeOut = Math.max(0, Math.min(1, (vh + p.size - p.y) / (vh * 0.25)));
      ctx.save();
      ctx.globalAlpha = p.alpha * fadeOut * fade;
      ctx.translate(x, p.y);
      if (p.sparkle) drawSparkle(p);
      else {
        ctx.rotate(p.rot);
        ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.cos(p.tilt)));
        drawPetal(p);
      }
      ctx.restore();
    }
    if (active || items.length) requestAnimationFrame(frame);
    else running = false;
  }

  function check() {
    if (running || document.body.classList.contains("intro-open") || !inZone()) return;
    running = true; prev = performance.now(); requestAnimationFrame(frame);
  }
  window.addEventListener("scroll", check, { passive: true });
  window.addEventListener("resize", check);
  document.addEventListener("click", function () { setTimeout(check, 400); });
  check();
})();
