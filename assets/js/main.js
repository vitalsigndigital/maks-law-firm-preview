/* Maks Law Firm — progressive enhancement only. All content is in the HTML;
   this file adds header behaviour, menus, scroll reveals, the click-to-load
   map and the enquiry form submit. */
(function () {
  "use strict";
  var d = document, de = d.documentElement, w = window;
  var reduce = w.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* copyright year, computed at view time in the firm's timezone */
  try {
    var y = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric" }).format(new Date());
    d.querySelectorAll("[data-year]").forEach(function (e) { e.textContent = y; });
  } catch (e) {}

  /* header: solid after the hero starts scrolling, hides on scroll down, returns on scroll up */
  var header = d.querySelector("[data-header]"), bar = d.querySelector(".actionbar");
  var lastY = w.scrollY, ticking = false;
  function onScroll() {
    var yy = w.scrollY;
    if (header) {
      header.classList.toggle("is-solid", yy > 24);
      var drawerOpen = de.classList.contains("drawer-open");
      header.classList.toggle("is-hidden", !drawerOpen && yy > 420 && yy > lastY + 2);
      if (yy < lastY - 2) header.classList.remove("is-hidden");
    }
    if (bar) bar.classList.toggle("is-shown", yy > 260);
    lastY = yy; ticking = false;
  }
  w.addEventListener("scroll", function () { if (!ticking) { ticking = true; w.requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* practice-areas mega menu (click/tap + hover on fine pointers) */
  d.querySelectorAll(".nav__has").forEach(function (li) {
    var btn = li.querySelector("button"), t;
    function open(v) { if (v) li.setAttribute("data-open", ""); else li.removeAttribute("data-open"); btn.setAttribute("aria-expanded", v ? "true" : "false"); }
    btn.addEventListener("click", function () { open(!li.hasAttribute("data-open")); });
    if (w.matchMedia("(hover: hover)").matches) {
      li.addEventListener("mouseenter", function () { clearTimeout(t); open(true); });
      li.addEventListener("mouseleave", function () { t = setTimeout(function () { open(false); }, 160); });
    }
    d.addEventListener("click", function (e) { if (!li.contains(e.target)) open(false); });
    li.addEventListener("keydown", function (e) { if (e.key === "Escape") { open(false); btn.focus(); } });
  });

  /* mobile drawer */
  var burger = d.querySelector(".burger"), drawer = d.getElementById("drawer");
  if (burger && drawer) {
    drawer.querySelectorAll(".drawer__nav li").forEach(function (li, i) { li.style.setProperty("--i", i); });
    function setDrawer(v) {
      drawer.classList.toggle("is-open", v);
      drawer.setAttribute("aria-hidden", v ? "false" : "true");
      if (v) drawer.removeAttribute("inert"); else drawer.setAttribute("inert", "");
      burger.setAttribute("aria-expanded", v ? "true" : "false");
      burger.setAttribute("aria-label", v ? "Close menu" : "Open menu");
      de.classList.toggle("drawer-open", v);
      d.body.style.overflow = v ? "hidden" : "";
      if (v) header.classList.remove("is-hidden");
    }
    function focusables() { return [burger].concat([].slice.call(drawer.querySelectorAll("a[href], button"))); }
    burger.addEventListener("click", function () {
      var open = !drawer.classList.contains("is-open");
      setDrawer(open);
      if (open) setTimeout(function () { var f = drawer.querySelector("a[href]"); if (f) f.focus({ preventScroll: true }); }, 60);
    });
    d.addEventListener("keydown", function (e) {
      if (!drawer.classList.contains("is-open")) return;
      if (e.key === "Escape") { setDrawer(false); burger.focus(); return; }
      if (e.key === "Tab") {                       // keep focus inside the open menu
        var f = focusables(), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (f.indexOf(d.activeElement) === -1) { e.preventDefault(); first.focus(); }
      }
    });
    drawer.addEventListener("click", function (e) { if (e.target.closest("a")) setDrawer(false); });
  }

  /* scroll reveals — staggered within each parent */
  var els = d.querySelectorAll(".reveal, .reveal-img");
  if (!("IntersectionObserver" in w) || reduce) {
    de.classList.add("reveal-all");
  } else {
    var groups = new Map();
    els.forEach(function (el) {
      var p = el.parentElement, n = groups.get(p) || 0;
      if (!el.style.getPropertyValue("--i")) el.style.setProperty("--i", Math.min(n, 6));
      groups.set(p, n + 1);
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* click-to-load Google map (keeps third-party requests off the page until asked) */
  d.querySelectorAll("[data-map-load]").forEach(function (b) {
    b.addEventListener("click", function () {
      var box = b.closest("[data-map]"), f = d.createElement("iframe");
      f.src = box.getAttribute("data-map"); f.title = "Map: Maks Law Firm, 77 City Centre Drive, Mississauga";
      f.loading = "lazy"; f.referrerPolicy = "no-referrer-when-downgrade";
      box.appendChild(f); var ph = box.querySelector(".map__ph"); if (ph) ph.remove();
    });
  });

  /* practice-area ticker: visible pause/play (WCAG 2.2.2), also pauses while focused */
  d.querySelectorAll("[data-ticker]").forEach(function (t) {
    var b = t.querySelector(".ticker__toggle");
    if (!b) return;
    b.addEventListener("click", function () {
      var p = !t.classList.contains("is-paused");
      t.classList.toggle("is-paused", p);
      b.setAttribute("aria-pressed", p ? "true" : "false");
      b.setAttribute("aria-label", p ? "Play the moving list of practice areas" : "Pause the moving list of practice areas");
    });
  });

  /* enquiry form (Web3Forms) — inline validation, loading state. Until the access key is set,
     the form says so and offers phone/WhatsApp. */
  var form = d.querySelector("[data-enquiry]");
  if (form) {
    var status = form.querySelector(".form__status"), btn = form.querySelector("button[type=submit]");
    var fields = [].slice.call(form.querySelectorAll("[data-msg]")), tried = false;
    function check(el) {
      var ok = el.type === "checkbox" ? el.checked : el.value.trim() !== "" && el.checkValidity();
      if (ok && el.type === "tel") ok = el.value.replace(/\D/g, "").length >= 7;
      var err = d.getElementById(el.getAttribute("aria-describedby"));
      el.setAttribute("aria-invalid", ok ? "false" : "true");
      if (err) err.textContent = ok ? "" : el.getAttribute("data-msg");
      return ok;
    }
    fields.forEach(function (el) {
      el.addEventListener("blur", function () { if (tried || el.value) check(el); });
      el.addEventListener(el.type === "checkbox" ? "change" : "input", function () { if (tried) check(el); });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault(); tried = true;
      var bad = fields.filter(function (el) { return !check(el); });
      if (bad.length) { status.dataset.state = "err"; status.textContent = bad.length === 1 ? "Please fix the highlighted field." : "Please fix the " + bad.length + " highlighted fields."; bad[0].focus(); return; }
      var key = form.querySelector("[name=access_key]").value;
      if (!key || key.indexOf("PLACEHOLDER") === 0) {
        status.dataset.state = "err";
        status.textContent = "Online enquiries are being connected. Please call (647) 955-1681, WhatsApp (647) 739-1639 or email info@makslawfirm.com.";
        return;
      }
      btn.disabled = true; btn.classList.add("is-loading"); status.dataset.state = ""; status.textContent = "Sending…";
      fetch(form.action, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok && j.success }; }); })
        .then(function (res) {
          status.dataset.state = res.ok ? "ok" : "err";
          status.textContent = res.ok ? "Thank you — your enquiry has been sent. We’ll be in touch shortly." : "Sorry, that didn’t send. Please call (647) 955-1681 or email info@makslawfirm.com.";
          if (res.ok) { form.reset(); tried = false; fields.forEach(function (el) { el.removeAttribute("aria-invalid"); }); }
        })
        .catch(function () { status.dataset.state = "err"; status.textContent = "Network error — please call (647) 955-1681 or email info@makslawfirm.com."; })
        .then(function () { btn.disabled = false; btn.classList.remove("is-loading"); });
    });
  }
})();
