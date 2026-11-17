// Efectos: destellos de strass, vinilo que gira con la música, ráfagas de brillo (regalo y sobre)
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Destellos de strass sobre las perlas de las piezas ---------- */
  document.querySelectorAll("[data-twinkles]").forEach(function (panel) {
    panel.getAttribute("data-twinkles").trim().split(/\s+/).forEach(function (pair, i) {
      var xy = pair.split(",").map(Number);
      var t = document.createElement("i");
      t.className = "twinkle";
      t.setAttribute("aria-hidden", "true");
      t.style.left = (xy[0] / 941 * 100).toFixed(2) + "%";
      t.style.top = (xy[1] / 1672 * 100).toFixed(2) + "%";
      t.style.animationDelay = (-(i * 1.37 + Math.random()) % 4.2).toFixed(2) + "s";
      t.style.setProperty("--s", (0.75 + Math.random() * 0.5).toFixed(2));
      panel.appendChild(t);
    });
  });

  /* ---------- Ráfaga de brillitos (en % del contenedor) ---------- */
  function burst(container, x, y, count) {
    if (reduceMotion) return;
    for (var i = 0; i < (count || 14); i++) {
      var s = document.createElement("i");
      s.className = "spark";
      s.setAttribute("aria-hidden", "true");
      var a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 16;
      s.style.left = x + "%";
      s.style.top = y + "%";
      s.style.setProperty("--dx", (Math.cos(a) * d).toFixed(1) + "cqi");
      s.style.setProperty("--dy", (Math.sin(a) * d - 4).toFixed(1) + "cqi");
      s.style.setProperty("--s", (0.6 + Math.random() * 0.8).toFixed(2));
      s.style.animationDelay = (Math.random() * 0.15).toFixed(2) + "s";
      if (i % 3 === 0) s.classList.add("spark--pearl");
      container.appendChild(s);
      setTimeout(function (el) { el.remove(); }.bind(null, s), 1500);
    }
  }
  window.sparkBurst = burst;

  // Regalo: al abrir "Mis datos", la caja cae con rebote y salen brillitos del moño
  var gift = document.querySelector(".gift-modal");
  var giftBtn = document.querySelector("[data-open-gifts]");
  if (gift && giftBtn) {
    giftBtn.addEventListener("click", function () {
      var p = (gift.getAttribute("data-burst") || "50,20").split(",").map(Number);
      setTimeout(function () { burst(gift.querySelector(".img-modal__stage"), p[0], p[1], 18); }, 380);
    });
  }

  // Sobre: al aparecer, destello en el sello de perla
  var rsvp = document.querySelector(".panel--rsvp");
  if (rsvp && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        rsvp.classList.add("is-shown");
        setTimeout(function () { burst(rsvp, 49.4, 73.9, 16); }, 500);
        io.unobserve(rsvp);
      });
    }, { threshold: 0.55 });
    io.observe(rsvp);
  }

  /* ---------- Vinilo: gira mientras suena la música y frena suave al pausar ---------- */
  var planes = Array.prototype.slice.call(document.querySelectorAll(".vinyl__plane"));
  var audio = document.getElementById("backgroundMusic");
  var panel = document.querySelector(".panel--music");
  if (planes.length && audio) {
    var angle = 0, speed = 0, target = 0, running = false, prev = 0;
    var FULL = 200; // grados por segundo (≈ 33 rpm)
    function frame(now) {
      var dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      speed += (target - speed) * Math.min(1, dt * (target ? 1.6 : 0.9));
      angle = (angle + speed * dt) % 360;
      var v = angle.toFixed(2) + "deg";
      planes.forEach(function (p) { p.style.setProperty("--rot", v); });
      if (target || speed > 0.5) requestAnimationFrame(frame);
      else { running = false; speed = 0; }
    }
    function set(on) {
      target = on ? FULL : 0;
      panel.classList.toggle("is-playing", on);
      if (!running) { running = true; prev = performance.now(); requestAnimationFrame(frame); }
    }
    audio.addEventListener("playing", function () { set(true); });
    audio.addEventListener("pause", function () { set(false); });
  }
})();
