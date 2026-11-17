// Mariposa (ilustración, la misma de Julia / Florencia):
// - al hacer scroll hacia abajo aparece y vuela hacia abajo acompañando la lectura;
// - si se hace scroll hacia arriba se desvanece despacio, hasta que se vuelva a bajar;
// - cuando el scroll se detiene, se posa sobre alguna letra que esté a la vista.
// Las letras de las piezas (imágenes) se detectan solas buscando los trazos oscuros del texto;
// en cada panel se puede limitar la zona (data-perch-zone="x1,y1,x2,y2" en %) o dar los puntos
// a mano (data-perches="x,y x,y" en píxeles de la pieza 941×1672).
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var PIECE_W = 941, PIECE_H = 1672;

  /* ---------- La mariposa ---------- */
  var bf = document.createElement("div");
  bf.className = "butterfly";
  bf.setAttribute("aria-hidden", "true");
  bf.innerHTML = '<img src="assets/mariposa.png" alt="" draggable="false">';
  document.body.appendChild(bf);
  var SIZE = 64, HEIGHT = SIZE * 341 / 512, FEET = 0.75; // los "pies" quedan a ese alto de la imagen

  /* ---------- Dónde puede posarse ---------- */
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
  var piecePerches = new Map(); // panel -> [[x%, y%], ...]

  function analyze(panel) {
    var manual = panel.getAttribute("data-perches");
    if (manual) {
      piecePerches.set(panel, manual.trim().split(/\s+/).map(function (p) {
        var xy = p.split(",").map(Number);
        return [xy[0] / PIECE_W * 100, xy[1] / PIECE_H * 100];
      }));
      return;
    }
    var src = panel.querySelector("img");
    if (!src) return;
    var im = new Image();
    im.onload = function () {
      var W = 188, H = Math.round(W * im.naturalHeight / im.naturalWidth);
      var c = document.createElement("canvas");
      c.width = W; c.height = H;
      var g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(im, 0, 0, W, H);
      var d;
      try { d = g.getImageData(0, 0, W, H).data; } catch (_e) { return; }
      var zone = (panel.getAttribute("data-perch-zone") || "0,0,100,100").split(",").map(Number);
      // tinta: oscuro, malva o gris (no verde, no rojo intenso de los pétalos)
      var ink = new Uint8Array(W * H);
      for (var i = 0; i < W * H; i++) {
        var r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2];
        var mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
        var lum = 0.299 * r + 0.587 * gg + 0.114 * b;
        if (lum < 135 && r >= gg - 4 && b >= gg - 12 && (mx - mn) / (mx || 1) < 0.42) ink[i] = 1;
      }
      var x0 = Math.floor(zone[0] / 100 * W), x1 = Math.ceil(zone[2] / 100 * W);
      var y0 = Math.max(2, Math.floor(zone[1] / 100 * H)), y1 = Math.ceil(zone[3] / 100 * H);
      var cand = [];
      for (var y = y0; y < y1 - 4; y++) for (var x = Math.max(16, x0); x < Math.min(W - 16, x1); x++) {
        var k = y * W + x;
        if (!ink[k] || ink[k - W] || ink[k - 2 * W] || !ink[k + W]) continue; // borde superior de un trazo
        var row = 0; // ¿hay más letras al costado? (renglón de texto, no una mancha suelta)
        for (var yy = y; yy < y + 5; yy++) for (var xx = x - 16; xx <= x + 16; xx++) row += ink[yy * W + xx];
        if (row >= 14) cand.push([x, y]);
      }
      var kept = [];
      cand.forEach(function (p) {
        for (var j = 0; j < kept.length; j++) if (Math.abs(kept[j][0] - p[0]) < 9 && Math.abs(kept[j][1] - p[1]) < 9) return;
        kept.push(p);
      });
      piecePerches.set(panel, kept.map(function (p) { return [(p[0] + 0.5) / W * 100, p[1] / H * 100]; }));
    };
    im.src = src.currentSrc || src.src;
  }

  // puntos en coordenadas de la página
  function perchesInView() {
    var vw = window.innerWidth, vh = window.innerHeight, out = [];
    function add(x, y) {
      if (y > vh * 0.12 && y < vh * 0.86 && x > 30 && x < vw - 30) out.push({ x: x + window.scrollX, y: y + window.scrollY });
    }
    panels.forEach(function (panel) {
      var list = piecePerches.get(panel);
      if (!list) return;
      var r = panel.getBoundingClientRect();
      if (!r.height || r.bottom < 0 || r.top > vh) return;
      list.forEach(function (p) { add(r.left + p[0] / 100 * r.width, r.top + p[1] / 100 * r.height); });
    });
    // textos de la página (nombres, título de la galería, números de la cuenta regresiva)
    document.querySelectorAll(".guests__title, .guests__names, .gallery__title, .countdown strong").forEach(function (el) {
      if (!el.textContent.trim()) return;
      var range = document.createRange();
      range.selectNodeContents(el);
      var rects = range.getClientRects();
      for (var i = 0; i < rects.length; i++) {
        var rr = rects[i];
        if (!rr.width) continue;
        var n = Math.max(1, Math.round(rr.width / 45));
        for (var j = 0; j < n; j++) add(rr.left + rr.width * (j + 0.5) / n, rr.top + rr.height * 0.22);
      }
    });
    return out;
  }

  /* ---------- Vuelo ---------- */
  // estados: "gone" (invisible), "fly" (bajando con el scroll), "land" (yendo a posarse),
  // "perch" (posada), "fading" (se está desvaneciendo porque se subió)
  var pos = { x: -80, y: 0 }, vel = { x: 0, y: 0 }, angle = 180;
  var state = "gone", ready = false, target = null, perch = null, retarget = 0, t = 0;
  var running = false, prev = 0, stopTimer = 0, hopTimer = 0, fadeTimer = 0;
  var lastY = window.scrollY, scrollSpeed = 0, lastScrollT = performance.now();

  function bounds() {
    var main = (document.querySelector(".invitation") || document.body).getBoundingClientRect();
    return { left: Math.max(36, main.left + 36), right: Math.min(window.innerWidth - 36, main.right - 36) };
  }
  // al bajar, apunta siempre más abajo en la página: así vuela hacia abajo
  function downTarget() {
    var b = bounds(), vh = window.innerHeight;
    var x = pos.x + (Math.random() - 0.5) * 220;
    x = Math.max(window.scrollX + b.left, Math.min(window.scrollX + b.right, x));
    return { x: x, y: Math.max(pos.y + 120, window.scrollY + vh * (0.55 + Math.random() * 0.25)) };
  }

  function render() {
    var x = pos.x - window.scrollX - SIZE / 2, y = pos.y - window.scrollY - HEIGHT * FEET;
    bf.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) rotate(" + angle.toFixed(1) + "deg)";
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min((now - prev) / 1000, 0.05);
    prev = now; t += dt;
    var vh = window.innerHeight;
    scrollSpeed *= Math.max(0, 1 - dt * 3); // se calma si ya no se scrollea

    // si el scroll la dejó atrás, vuelve a entrar por arriba
    var sy = pos.y - window.scrollY;
    if (sy < -vh * 0.4 && state !== "fading") { pos.y = window.scrollY - 30; vel.y = Math.max(vel.y, 0); }
    if (sy > vh * 1.6) { pos.y = window.scrollY + vh + 30; vel.x = vel.y = 0; }

    if (state === "fly" || state === "fading") {
      retarget -= dt;
      if (!target || retarget <= 0 || Math.hypot(target.x - pos.x, target.y - pos.y) < 50) {
        target = downTarget(); retarget = 1.2 + Math.random();
      }
    }
    var dx = target.x - pos.x, dy = target.y - pos.y, dist = Math.hypot(dx, dy) || 1;
    var landing = state === "land";
    var speed = landing ? Math.min(240, dist * 2.6 + 12) : 170 + Math.min(900, scrollSpeed);
    if (state === "fading") speed *= 0.6;
    var wob = landing ? Math.min(1, dist / 80) : 1; // aleteo en zigzag, se calma al llegar
    var wx = -dy / dist * Math.sin(t * 6.5) * 60 * wob, wy = dx / dist * Math.sin(t * 6.5) * 60 * wob + Math.sin(t * 11) * 20 * wob;
    var k = Math.min(1, dt * (landing ? 5 : 2.6));
    vel.x += ((dx / dist) * speed + wx - vel.x) * k;
    vel.y += ((dy / dist) * speed + wy - vel.y) * k;
    pos.x += vel.x * dt; pos.y += vel.y * dt;

    // la cabeza mira hacia donde vuela (al bajar, mira hacia abajo)
    var v = Math.hypot(vel.x, vel.y);
    var want = landing && dist < 30 ? 0 : (v > 20 ? Math.atan2(vel.x, -vel.y) * 180 / Math.PI : angle);
    var diff = ((want - angle) % 360 + 540) % 360 - 180;
    angle += diff * Math.min(1, dt * (landing && dist < 30 ? 8 : 4));

    if (landing && dist < 2.5) {
      pos.x = target.x; pos.y = target.y;
      state = "perch"; perch = target;
      angle = (Math.random() - 0.5) * 24;
      render();
      bf.classList.add("is-perched");
      running = false;
      clearTimeout(hopTimer);
      hopTimer = setTimeout(hop, 7000 + Math.random() * 5000);
      return;
    }
    render();
    requestAnimationFrame(frame);
  }
  function run() {
    if (running) return;
    running = true; prev = performance.now(); requestAnimationFrame(frame);
  }

  function land(avoid) {
    if (state === "gone" || state === "fading") return false;
    var list = perchesInView().filter(function (p) { return !avoid || Math.hypot(p.x - avoid.x, p.y - avoid.y) > 30; });
    if (!list.length) { state = "fly"; run(); stopTimer = setTimeout(land, 2500); return false; }
    var best = null, bestScore = Infinity;
    list.forEach(function (p) {
      var s = Math.hypot(p.x - pos.x, p.y - pos.y) + Math.random() * 220;
      if (s < bestScore) { bestScore = s; best = p; }
    });
    target = best; state = "land";
    bf.classList.remove("is-perched");
    run();
    return true;
  }
  function hop() { if (state === "perch") land(perch); }

  // scroll hacia abajo: aparece (o retoma el vuelo) y baja
  function goDown() {
    clearTimeout(fadeTimer);
    clearTimeout(hopTimer);
    if (state === "gone") {
      var b = bounds();
      pos = { x: window.scrollX + b.left + Math.random() * (b.right - b.left), y: window.scrollY - 40 };
      vel = { x: 0, y: 120 }; angle = 180; target = null;
    }
    if (state === "gone" || state === "fading") bf.classList.remove("is-gone");
    bf.classList.add("is-visible");
    bf.classList.remove("is-perched");
    if (state !== "fly") { state = "fly"; target = null; }
    run();
    clearTimeout(stopTimer);
    stopTimer = setTimeout(land, 500);
  }

  // scroll hacia arriba: se desvanece despacio
  function goUp() {
    if (state === "gone" || state === "fading") return;
    clearTimeout(stopTimer);
    clearTimeout(hopTimer);
    bf.classList.add("is-gone");
    bf.classList.remove("is-perched");
    state = "fading"; target = null;
    run();
    fadeTimer = setTimeout(function () {
      if (state !== "fading") return;
      state = "gone"; running = false;
      bf.classList.remove("is-visible", "is-gone");
    }, 1800);
  }

  function onScroll() {
    var y = window.scrollY, now = performance.now();
    var d = y - lastY;
    if (Math.abs(d) < 4) return; // ignora temblores (rebote del iPhone)
    var dtS = Math.max(16, now - lastScrollT) / 1000;
    lastY = y; lastScrollT = now;
    if (!ready) return;
    if (d > 0) {
      scrollSpeed = scrollSpeed * 0.6 + (d / dtS) * 0.4;
      goDown();
    } else {
      scrollSpeed = 0;
      goUp();
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    if (state === "perch") { bf.classList.remove("is-perched"); state = "fly"; target = null; run(); stopTimer = setTimeout(land, 450); }
  });

  // se habilita cuando se cierra la intro (aparece recién con el primer scroll hacia abajo)
  function waitIntro() {
    if (!document.body.classList.contains("intro-open")) { ready = true; lastY = window.scrollY; return; }
    new MutationObserver(function (_m, obs) {
      if (!document.body.classList.contains("intro-open")) {
        obs.disconnect();
        setTimeout(function () { ready = true; lastY = window.scrollY; }, 400);
      }
    }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }

  function analyzeAll() {
    var i = 0;
    (function next() {
      if (i >= panels.length) return;
      analyze(panels[i++]);
      setTimeout(next, 60);
    })();
  }
  setTimeout(analyzeAll, 800);
  waitIntro();

  window.__mariposa = { perchesInView: perchesInView, piecePerches: piecePerches };
})();
