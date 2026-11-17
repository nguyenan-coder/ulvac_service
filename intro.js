/* ULVAC – landing page cuộn cinematic: ngôn ngữ + hiệu ứng theo vị trí cuộn */
(function () {
  "use strict";

  /* ---------- Ngôn ngữ (dùng chung bản dịch với website) ---------- */
  var LOCAL = {
    vi: { scroll: "Cuộn để khám phá", full: "Website đầy đủ", quote: "Gửi yêu cầu báo giá" },
    en: { scroll: "Scroll to explore", full: "Full website", quote: "Request a quote" },
    zh: { scroll: "向下滚动探索", full: "完整网站", quote: "提交询价" },
    ko: { scroll: "스크롤하여 살펴보기", full: "전체 웹사이트", quote: "견적 요청" },
    ja: { scroll: "スクロールしてご覧ください", full: "Webサイト全体", quote: "お見積り依頼" }
  };
  var DICTS = { en: window.I18N_EN, zh: window.I18N_ZH, ko: window.I18N_KO, ja: window.I18N_JA };
  var HTML_LANG = { vi: "vi", en: "en", zh: "zh-CN", ko: "ko", ja: "ja" };
  var lang = new URLSearchParams(location.search).get("lang");
  if (!lang) { try { lang = localStorage.getItem("lang"); } catch (e) {} }
  if (!HTML_LANG[lang]) lang = "vi";
  document.documentElement.lang = HTML_LANG[lang];

  var dict = DICTS[lang];
  if (dict) document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var v = dict[el.getAttribute("data-i18n")];
    if (v != null) el.innerHTML = v;
  });
  document.querySelectorAll("[data-t]").forEach(function (el) { el.textContent = LOCAL[lang][el.getAttribute("data-t")]; });
  if (dict && dict["meta.title"]) document.title = dict["meta.title"];
  var q = lang === "vi" ? "" : "?lang=" + lang;
  document.getElementById("fullSite").href = "index.html" + q;
  document.getElementById("quoteLink").href = "index.html" + q + "#bao-gia";

  // tiếng Trung: chỉ ngắt dòng giữa các từ
  if (lang === "zh" && window.Intl && Intl.Segmenter) {
    var seg = new Intl.Segmenter("zh-CN", { granularity: "word" }), cjk = /[一-鿿]/;
    document.querySelectorAll("[data-i18n]").forEach(function (root) {
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [], n;
      while ((n = w.nextNode())) if (cjk.test(n.data)) list.push(n);
      list.forEach(function (node) {
        var out = "", prev = "";
        Array.from(seg.segment(node.data)).forEach(function (s) {
          var tiny = (cjk.test(s.segment) && s.segment.length < 2) || (cjk.test(prev) && prev.length < 2);
          if (out && s.isWordLike && !tiny && !/\s$/.test(prev)) out += "​";
          out += s.segment; prev = s.segment;
        });
        node.data = out;
      });
    });
  }

  document.querySelectorAll(".ci-lang button").forEach(function (b) {
    b.classList.toggle("active", b.dataset.lang === lang);
    b.addEventListener("click", function () {
      try { localStorage.setItem("lang", b.dataset.lang); } catch (e) {}
      var u = new URL(location.href);
      if (b.dataset.lang === "vi") u.searchParams.delete("lang"); else u.searchParams.set("lang", b.dataset.lang);
      location.href = u.toString();
    });
  });

  /* ---------- Hiện dần các khối ở phần cuối ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    reveals.forEach(function (el) { io.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add("in"); });

  /* ---------- Chuyển động theo cuộn ---------- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { document.documentElement.classList.add("static"); return; }

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function range(p, a, b) { return clamp((p - a) / (b - a)); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function show(el, t, dist) {
    if (!el) return;
    el.style.opacity = t;
    el.style.transform = "translate3d(0," + ((1 - t) * (dist || 40)) + "px,0)";
  }

  var $ = function (s) { return document.querySelector(s); };
  var heroImg = $(".hero-img"), heroIntro = $(".hero-intro"), heroShade = $(".hero-shade"), hint = $(".scroll-hint");
  var h1 = $(".hero-copy h1"), sub = $(".hero-sub"), badges = $(".hero-badges");
  var heroLines = h1 ? Array.prototype.slice.call(h1.children) : [];
  heroLines.concat([sub, badges]).forEach(function (el) { if (el) el.classList.add("rv"); });

  var track = $(".track"), panels = document.querySelectorAll(".panel"), dots = document.querySelectorAll(".dots i");
  var big24 = $(".big24"), t24 = $(".t24"), c24 = $(".c24"), s24 = $(".s-24 .stage");
  var abHq = $(".ab-hq"), abFuji = $(".ab-fuji"), abCopy = $(".ab-copy"), stats = document.querySelectorAll(".ab-stats div");
  var bar = $(".progress span");

  var scenes = {};
  document.querySelectorAll("[data-scene]").forEach(function (s) { scenes[s.dataset.scene] = s; });

  function progress(s) {
    var vh = window.innerHeight, r = s.getBoundingClientRect(), total = s.offsetHeight - vh;
    return total > 0 ? clamp(-r.top / total) : 0;
  }

  function hero(p) {
    var a = ease(range(p, 0, 0.3));
    heroIntro.style.opacity = 1 - a;
    heroIntro.style.transform = "scale(" + (1 + a * 0.25) + ")";
    heroImg.style.transform = "scale(" + (1.35 - 0.35 * ease(range(p, 0, 0.75))) + ")";
    heroShade.style.setProperty("--veil", (0.88 - 0.88 * a).toFixed(3));
    hint.style.opacity = 1 - range(p, 0, 0.12);
    show(heroLines[0], ease(range(p, 0.28, 0.46)), 60);
    show(heroLines[1], ease(range(p, 0.38, 0.56)), 60);
    show(sub, ease(range(p, 0.5, 0.68)));
    show(badges, ease(range(p, 0.6, 0.78)));
  }

  function services(p) {
    // mỗi tấm dừng lại một nhịp rồi mới trượt sang tấm kế tiếp
    var n = panels.length, seg = p * (n - 1), i0 = Math.min(Math.floor(seg), n - 2), f = seg - i0;
    var t = range(f, 0.22, 0.78); t = t * t * (3 - 2 * t);
    var x = i0 + t;
    track.style.transform = "translate3d(" + (-x * 100) + "vw,0,0)";
    panels.forEach(function (pn, i) {
      // cả cụm ảnh trôi nhẹ khi chuyển tấm; ảnh giữ nguyên khung như trên website, không phóng to
      var local = x - i, gal = pn.querySelector(".gallery"), txt = pn.querySelector(".panel-text");
      if (gal) gal.style.transform = "translate3d(" + (local * -6) + "vw,0,0)";
      if (txt) { var o = 1 - Math.min(Math.abs(local) * 1.6, 1); txt.style.opacity = o; txt.style.transform = "translate3d(" + (local * -60) + "px,0,0)"; }
    });
    var idx = Math.round(x);
    dots.forEach(function (d, i) { d.classList.toggle("on", i === idx); });
  }

  function h24(p) {
    var a = ease(range(p, 0, 0.45));
    big24.style.opacity = a;
    big24.style.transform = "scale(" + (0.55 + a * 0.45) + ")";
    s24.style.setProperty("--glow", a.toFixed(3));
    show(t24, ease(range(p, 0.4, 0.62)));
    show(c24, ease(range(p, 0.55, 0.75)));
  }

  function about(p) {
    abHq.style.transform = "scale(" + (1.25 - 0.2 * ease(range(p, 0, 0.5))) + ")";
    var f = ease(range(p, 0.45, 0.62));
    abFuji.style.opacity = f;
    abFuji.style.transform = "scale(" + (1.15 - 0.15 * ease(range(p, 0.45, 1))) + ")";
    show(abCopy, ease(range(p, 0.05, 0.25)), 50);
    stats.forEach(function (st, i) {
      var t = ease(range(p, 0.55 + i * 0.06, 0.75 + i * 0.06));
      show(st, t, 30);
      var b = st.querySelector("b"), target = +b.dataset.count;
      b.textContent = Math.round(target * t) + (t >= 1 ? (b.dataset.suffix || "") : "");
    });
  }

  var ticking = false;
  function update() {
    ticking = false;
    if (scenes.hero) hero(progress(scenes.hero));
    if (scenes.services) services(progress(scenes.services));
    if (scenes.h24) h24(progress(scenes.h24));
    if (scenes.about) about(progress(scenes.about));
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.setProperty("--prog", max > 0 ? (window.scrollY / max).toFixed(4) : 0);
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();
