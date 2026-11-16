(function () {
  "use strict";

  /* ---------- Language ---------- */
  var VI = {};
  var current = "vi";
  var nodes = document.querySelectorAll("[data-i18n]");
  nodes.forEach(function (el) { VI[el.getAttribute("data-i18n")] = el.innerHTML; });
  document.querySelectorAll("[data-i18n-ph]").forEach(function (el) { VI[el.getAttribute("data-i18n-ph")] = el.getAttribute("placeholder"); });
  document.querySelectorAll("[data-i18n-content]").forEach(function (el) { VI[el.getAttribute("data-i18n-content")] = el.getAttribute("content"); });
  Object.assign(VI, window.I18N_VI_EXTRA || {});

  var DICTS = { vi: VI, en: window.I18N_EN, zh: window.I18N_ZH, ko: window.I18N_KO, ja: window.I18N_JA };
  var HTML_LANG = { vi: "vi", en: "en", zh: "zh-CN", ko: "ko", ja: "ja" };

  function t(key) {
    var dict = DICTS[current] || VI;
    return dict[key] != null ? dict[key] : VI[key];
  }

  /* Tiếng Trung không có dấu cách giữa các từ, nên trình duyệt có thể ngắt dòng
     giữa một từ (vd 维|护). Tách từ bằng Intl.Segmenter rồi chèn dấu cách vô hình
     (U+200B) giữa các từ; CSS word-break: keep-all chỉ cho ngắt tại các điểm này. */
  var OPEN_PUNCT = /[（(“‘《「【\[]$/;
  function zhSegment(root) {
    if (!window.Intl || !Intl.Segmenter) return;
    var seg = new Intl.Segmenter("zh-CN", { granularity: "word" });
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var list = [], n;
    while ((n = walker.nextNode())) if (/[一-鿿]/.test(n.data)) list.push(n);
    list.forEach(function (node) {
      var out = "", prev = "";
      Array.from(seg.segment(node.data)).forEach(function (s) {
        // Không ngắt cạnh từ 1 chữ (氦|检漏仪, 烧结|炉, 低温|泵…) để giữ nguyên cụm thuật ngữ
        var cjk = /[一-鿿]/;
        var tiny = (cjk.test(s.segment) && s.segment.length < 2) || (cjk.test(prev) && prev.length < 2);
        if (out && s.isWordLike && !tiny && !/\s$/.test(prev) && !OPEN_PUNCT.test(prev)) out += "​";
        out += s.segment;
        prev = s.segment;
      });
      node.data = out;
    });
  }

  var langButtons = document.querySelectorAll(".lang button");

  function setLang(lang) {
    current = DICTS[lang] ? lang : "vi";
    document.documentElement.lang = HTML_LANG[current];
    nodes.forEach(function (el) {
      var v = t(el.getAttribute("data-i18n"));
      if (v != null) el.innerHTML = v;
      if (current === "zh" && !el.closest("head") && el.tagName !== "OPTION") zhSegment(el);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
    document.querySelectorAll("[data-i18n-content]").forEach(function (el) { el.setAttribute("content", t(el.getAttribute("data-i18n-content"))); });
    langButtons.forEach(function (b) {
      var on = b.dataset.lang === current;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on);
    });
    try { localStorage.setItem("lang", current); } catch (e) {}
  }

  langButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      setLang(b.dataset.lang);
      // giữ ?lang= trên thanh địa chỉ khớp với ngôn ngữ đang xem, để chia sẻ link đúng bản
      try {
        var u = new URL(location.href);
        if (current === "vi") u.searchParams.delete("lang"); else u.searchParams.set("lang", current);
        history.replaceState(null, "", u);
      } catch (e) {}
    });
  });

  var initial = "vi";
  var q = new URLSearchParams(location.search).get("lang");
  if (q) initial = q;
  else { try { initial = localStorage.getItem("lang") || "vi"; } catch (e) {} }
  if (initial !== "vi") setLang(initial);

  /* ---------- Header & mobile menu ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() { header.classList.toggle("scrolled", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var nav = document.getElementById("nav");
  var toggle = document.getElementById("menuToggle");
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });
  nav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- WeChat QR modal ---------- */
  var modal = document.getElementById("qrModal");
  document.querySelectorAll("[data-open-qr]").forEach(function (b) {
    b.addEventListener("click", function () { modal.classList.add("open"); });
  });
  modal.addEventListener("click", function (e) {
    if (e.target === modal || e.target.hasAttribute("data-close-qr")) modal.classList.remove("open");
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") modal.classList.remove("open"); });

  /* ---------- Quote form ---------- */
  var form = document.getElementById("quoteForm");
  var status = document.getElementById("formStatus");
  var cfg = window.SITE_CONFIG || {};

  function show(key, cls) { status.textContent = t(key); status.className = "form-status " + (cls || ""); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form.website.value) return; // spam bot
    var required = ["name", "company", "phone", "service"];
    var missing = required.some(function (n) { return !form[n].value.trim(); });
    if (missing) { show("f.invalid", "err"); return; }

    var data = {
      name: form.name.value.trim(),
      company: form.company.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      service: form.service.value,
      message: form.message.value.trim(),
      lang: current,
      page: location.href
    };

    if (!cfg.FORM_ENDPOINT) {
      var body = "Họ tên: " + data.name + "\nCông ty: " + data.company + "\nĐiện thoại: " + data.phone +
        "\nEmail: " + data.email + "\nDịch vụ: " + data.service + "\n\n" + data.message;
      location.href = "mailto:" + cfg.FALLBACK_EMAIL + "?subject=" + encodeURIComponent("Yêu cầu tư vấn – " + data.company) +
        "&body=" + encodeURIComponent(body);
      show("f.mailto", "ok");
      return;
    }

    var btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    show("f.sending");
    fetch(cfg.FORM_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(data).toString()
    }).then(function () {
      show("f.ok", "ok");
      form.reset();
    }).catch(function () {
      show("f.err", "err");
    }).finally(function () { btn.disabled = false; });
  });
})();
