/* ASJ — small, dependency-free behaviour shared by every page.
   Theme and language are applied before paint by the inline snippet in <head>; this file only
   wires the controls. Every storage access is guarded: private mode may refuse it. */
(function () {
  "use strict";
  var root = document.documentElement;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  // Theme: follows the system until the visitor picks one.
  document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = dark ? "light" : "dark";
      store("asj-theme", root.dataset.theme);
    });
  });

  // Text that cannot live in two spans: placeholders and <option>s follow the page language.
  function localize() {
    var ar = root.lang === "ar";
    document.querySelectorAll("[data-ph-en]").forEach(function (el) { el.placeholder = ar ? el.getAttribute("data-ph-ar") : el.getAttribute("data-ph-en"); });
    document.querySelectorAll("option[data-en]").forEach(function (el) { el.textContent = ar ? el.getAttribute("data-ar") : el.getAttribute("data-en"); });
  }
  localize();

  // Language: English / العربية, mirrored for RTL.
  document.querySelectorAll("[data-lang-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var ar = root.lang !== "ar";
      root.lang = ar ? "ar" : "en"; root.dir = ar ? "rtl" : "ltr";
      store("asj-lang", root.lang); localize();
    });
  });

  // Mobile menu.
  var menu = document.querySelector("[data-menu]"), nav = document.querySelector(".nav");
  // on an iPhone the button opens the side panel instead (the same sizes the CSS gives it)
  var drawer = document.querySelector("[data-drawer]"), phone = matchMedia("(max-width: 600px), (max-width: 760px) and (max-height: 500px)");
  function drawerSet(open) {
    document.documentElement.classList.toggle("menu-open", open);
    if (drawer) drawer.setAttribute("aria-hidden", !open);
    if (menu) menu.setAttribute("aria-expanded", open);
  }
  if (drawer) {
    drawer.addEventListener("click", function (e) { if (e.target.closest("[data-drawer-close], a")) drawerSet(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") drawerSet(false); });
    phone.addEventListener && phone.addEventListener("change", function () { drawerSet(false); });
  }
  if (menu && nav) menu.addEventListener("click", function () {
    if (drawer && phone.matches) { drawerSet(!document.documentElement.classList.contains("menu-open")); return; }
    var open = nav.classList.toggle("open"); menu.setAttribute("aria-expanded", open);
  });

  // Toast.
  var toast = document.createElement("div"); toast.className = "toast"; toast.setAttribute("role", "status"); document.body.appendChild(toast);
  function say(en, ar) { toast.textContent = root.lang === "ar" ? ar : en; toast.classList.add("show"); clearTimeout(say.t); say.t = setTimeout(function () { toast.classList.remove("show"); }, 1800); }

  // Copy: clipboard first, a selectable prompt if the browser refuses.
  function copy(text, en, ar) {
    var done = function () { say(en || "Link copied", ar || "تم نسخ الرابط"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { prompt("", text); });
    else prompt("", text);
  }
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () { copy(b.getAttribute("data-copy"), b.getAttribute("data-say-en"), b.getAttribute("data-say-ar")); });
  });

  // Installer links open an iPhone app. Anywhere else - a Mac, a PC, a laptop - there is no app to open,
  // so the click copies that installer's own source instead. (iPadOS Safari says "Macintosh" but has touch.)
  var iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  if (!iOS) document.querySelectorAll("a[data-src]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); copy(a.getAttribute("data-src")); });
  });

  // Sheets.
  function openSheet(id) { var s = document.getElementById(id); if (!s) return; s.classList.add("open"); document.body.style.overflow = "hidden"; var f = s.querySelector("button, a"); if (f) f.focus(); }
  function closeSheets() { document.querySelectorAll(".sheet.open").forEach(function (s) { s.classList.remove("open"); }); document.body.style.overflow = ""; }
  document.querySelectorAll("[data-sheet]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); openSheet(b.getAttribute("data-sheet")); }); });
  document.querySelectorAll("[data-close], .sheet .scrim").forEach(function (b) { b.addEventListener("click", closeSheets); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheets(); });

  // Tabs on an app page, addressable by #description / #screenshots / #changelog; #get opens the sheet.
  var tabs = document.querySelectorAll("[data-tab]");
  function showTab(name) {
    var hit = false;
    tabs.forEach(function (a) { var on = a.getAttribute("data-tab") === name; a.setAttribute("aria-selected", on); if (on) hit = true; });
    if (!hit) return false;
    document.querySelectorAll(".panel-tab").forEach(function (p) { p.classList.toggle("on", p.id === "tab-" + name); });
    return true;
  }
  function route() {
    var h = (location.hash || "").slice(1);
    if (h === "get") { var g = document.querySelector("[data-get]"); if (g) openSheet(g.getAttribute("data-get")); h = ""; }
    if (h === "history") h = "changelog";                     // older links to the release notes
    if (tabs.length && !showTab(h)) showTab(tabs[0].getAttribute("data-tab"));
  }
  tabs.forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); history.replaceState(null, "", "#" + a.getAttribute("data-tab")); showTab(a.getAttribute("data-tab")); }); });
  window.addEventListener("hashchange", route); route();

  // Search + filter chips (apps list, FAQ). Items carry data-text and data-kind.
  document.querySelectorAll("[data-finder]").forEach(function (f) {
    var input = f.querySelector("input"), chips = f.querySelectorAll(".chip"), scope = document.querySelector(f.getAttribute("data-finder"));
    var empty = document.querySelector(f.getAttribute("data-empty")), kind = "all";
    function apply() {
      var q = (input ? input.value : "").trim().toLowerCase(), shown = 0;
      scope.querySelectorAll("[data-text]").forEach(function (it) {
        var ok = (kind === "all" || it.getAttribute("data-kind") === kind) && (!q || it.getAttribute("data-text").toLowerCase().indexOf(q) !== -1);
        it.hidden = !ok; if (ok) shown++;
      });
      scope.querySelectorAll("[data-group]").forEach(function (g) { g.hidden = !g.querySelector("[data-text]:not([hidden])"); });
      if (empty) empty.classList.toggle("show", shown === 0);
    }
    if (input) input.addEventListener("input", apply);
    chips.forEach(function (c) { c.addEventListener("click", function () { chips.forEach(function (x) { x.setAttribute("aria-pressed", x === c); }); kind = c.getAttribute("data-kind"); apply(); }); });
  });

  // Install guide: pick a path, see its route.
  var paths = document.querySelectorAll("[data-path]");
  paths.forEach(function (b) { b.addEventListener("click", function () {
    paths.forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
    document.querySelectorAll(".route").forEach(function (r) { r.classList.toggle("on", r.id === "route-" + b.getAttribute("data-path")); });
    // on a phone the four choices stack, so the steps open below the last one - out of sight: take the reader there
    var shown = document.getElementById("route-" + b.getAttribute("data-path"));
    if (shown && shown.getBoundingClientRect().top > innerHeight - 140)
      shown.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }); });

  // A link like /install/#troll opens the guide on that path.
  try { var pick = location.hash && document.querySelector('[data-path="' + location.hash.slice(1) + '"]'); if (pick) pick.click(); } catch (e) {}

  // ---- motion: every effect is optional, and none runs when the visitor asked for less motion ----
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Things rise into place the first time they are seen.
  var reveals = document.querySelectorAll("[data-reveal]");
  if (!still && "IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); seen.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    reveals.forEach(function (el) { seen.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add("in"); });

  // A soft light follows the pointer across cards and along their edge.
  var SPOT = ".give-card, .card, .ap-side, .path, .tool-card, .principle, .latest-note, .profile, .band, .faq-card";
  if (fine) document.addEventListener("pointermove", function (e) {
    // every lit box under the pointer, outer ones too (a band holds principles), so no light is left behind
    for (var el = e.target.closest && e.target.closest(SPOT); el; el = el.parentElement && el.parentElement.closest(SPOT)) {
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - r.left) + "px"); el.style.setProperty("--my", (e.clientY - r.top) + "px");
    }
  }, { passive: true });

  // One scroll handler, one frame at a time.
  var bar = document.querySelector(".top"), queued = false;
  function frame() { queued = false; if (bar) bar.classList.toggle("scrolled", scrollY > 8); }
  window.addEventListener("scroll", function () { if (!queued) { queued = true; requestAnimationFrame(frame); } }, { passive: true });
  window.addEventListener("resize", frame); frame();

  // Close the phone menu once a link in it is chosen.
  if (nav) nav.addEventListener("click", function (e) { if (e.target.closest("a")) { nav.classList.remove("open"); if (menu) menu.setAttribute("aria-expanded", false); } });

  // Contact form: composes an email in the visitor's own mail app - nothing is sent through this site.
  var form = document.querySelector("[data-mailto]");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = function (n) { return (form.elements[n] && form.elements[n].value || "").trim(); };
    var body = v("message") + "\n\n— " + v("name") + (v("device") ? "\n" + v("device") : "");
    location.href = "mailto:" + form.getAttribute("data-mailto") + "?subject=" + encodeURIComponent("[" + v("topic") + "] " + (v("name") || "ASJ")) + "&body=" + encodeURIComponent(body);
  });
})();
