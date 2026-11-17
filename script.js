// Cuenta regresiva (hora Argentina) — sábado 9 de enero de 2027, 21:00
(function () {
  var EVENT_DATE = new Date(document.body.getAttribute("data-event-date")).getTime();
  var els = {};
  ["days", "hours", "minutes", "seconds"].forEach(function (unit) {
    els[unit] = document.querySelector('[data-unit="' + unit + '"]');
  });
  function pad(n) { return String(n).padStart(2, "0"); }
  function set(el, value) { if (el.textContent !== value) el.textContent = value; }
  function tick() {
    var s = Math.floor(Math.max(0, EVENT_DATE - Date.now()) / 1000);
    set(els.days, pad(Math.floor(s / 86400)));
    set(els.hours, pad(Math.floor((s % 86400) / 3600)));
    set(els.minutes, pad(Math.floor((s % 3600) / 60)));
    set(els.seconds, pad(s % 60));
  }
  tick();
  setInterval(tick, 1000);
})();

// Copiar al portapapeles con aviso
function copyText(text, toast, message) {
  function show(msg) {
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.classList.remove("is-visible"); }, 2200);
  }
  function fallback() {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    (toast.closest("dialog") || document.body).appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); show(message); } catch (_e) { show("No se pudo copiar"); }
    ta.remove();
  }
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { show(message); }, fallback);
  else fallback();
}

// Modales en imagen: abrir, cerrar con la X o tocando fuera de la tarjeta
function setupImageModal(modal, openSelector) {
  var card = (modal.getAttribute("data-card") || "0,0,100,100").split(",").map(Number); // x1,y1,x2,y2 en %
  document.querySelector(openSelector).addEventListener("click", function () { modal.showModal(); });
  modal.querySelectorAll("[data-close]").forEach(function (b) {
    b.addEventListener("click", function () { modal.close(); });
  });
  modal.addEventListener("click", function (e) {
    if (e.target.closest(".img-modal__hit")) return;
    var r = modal.querySelector(".img-modal__stage").getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
    if (x < card[0] || x > card[2] || y < card[1] || y > card[3]) modal.close();
  });
  modal.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      copyText(b.getAttribute("data-copy"), modal.querySelector(".toast"), b.getAttribute("data-msg"));
    });
  });
}
setupImageModal(document.querySelector(".location-modal"), "[data-open-location]");
setupImageModal(document.querySelector(".gift-modal"), "[data-open-gifts]");

// Links pendientes de cargar: no navegan
document.querySelectorAll("a[data-pending]").forEach(function (a) {
  a.addEventListener("click", function (e) { if (a.getAttribute("href") === "#") e.preventDefault(); });
});

// Intro + música + apariciones
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var intro = document.querySelector(".intro");
  var audio = document.getElementById("backgroundMusic");
  var toggle = document.querySelector(".audio-toggle");
  var wantsMusic = false;

  function setPlaying(on) {
    toggle.classList.toggle("is-playing", on);
    toggle.setAttribute("aria-pressed", String(on));
    toggle.setAttribute("aria-label", on ? "Pausar música" : "Reproducir música");
  }
  function play() {
    var p = audio.play();
    if (p && p.then) p.then(function () { setPlaying(true); }, function () { setPlaying(false); });
    else setPlaying(true);
  }
  function enter(withMusic) {
    if (intro.classList.contains("is-leaving")) return;
    wantsMusic = withMusic;
    if (withMusic) play(); // dentro del toque: los celulares lo permiten
    window.scrollTo(0, 0);
    intro.classList.add("is-leaving");
    setTimeout(function () { document.body.classList.remove("intro-open"); }, 300);
    setTimeout(function () { intro.classList.add("is-gone"); }, 1100);
  }
  intro.querySelector("[data-enter-with-music]").addEventListener("click", function () { enter(true); });
  intro.querySelector("[data-enter-without-music]").addEventListener("click", function () { enter(false); });

  document.querySelectorAll("[data-toggle-music]").forEach(function (b) {
    b.addEventListener("click", function () { toggle.click(); });
  });

  toggle.addEventListener("click", function () {
    if (audio.paused) { wantsMusic = true; play(); }
    else { wantsMusic = false; audio.pause(); setPlaying(false); }
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { if (!audio.paused) { audio.pause(); setPlaying(false); } }
    else if (wantsMusic) { play(); }
  });

  if (!reduceMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-reveal");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-revealed"); io.unobserve(e.target); }
      });
    }, { threshold: 0.35 });
    document.querySelectorAll(".guests, .countdown").forEach(function (el) {
      io.observe(el.classList.contains("countdown") ? el.parentElement : el);
    });
    document.querySelectorAll(".countdown strong").forEach(function (el) {
      new MutationObserver(function () {
        el.classList.remove("flick");
        void el.offsetWidth;
        el.classList.add("flick");
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });
  }
})();
