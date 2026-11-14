/* ============================================================
   COSMADEDZ — Interface localization engine (ar / en / fr)
   Content data stays in its source language; every interface
   string is translated at render time. Arabic stays default.
   ============================================================ */
(function (g) {
  "use strict";

  var KEY = "cosd_v1_lang";
  var LANGS = {
    ar: { code: "ع", label: "العربية", dir: "rtl", lang: "ar" },
    en: { code: "EN", label: "English", dir: "ltr", lang: "en" },
    fr: { code: "FR", label: "Français", dir: "ltr", lang: "fr" }
  };

  var DATA = g.COSD_I18N_DATA || { en: {}, fr: {} };
  var RULES = g.COSD_I18N_RULES || { en: [], fr: [] };

  var SETTINGS = g.COSD_I18N_SETTINGS || {};
  var SKIP_TAGS = {
    SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1,
    KBD: 1, SVG: 1, PATH: 1, INPUT: 1, SELECT: 1, OPTION: 1
  };
  var EXCLUDE_IDS = { view: 1, toast: 1, sideNav: 1, tabbar: 1, searchResults: 1, langMenu: 1 };
  var ATTRS = ["placeholder", "title", "aria-label", "alt"];

  var current = "ar";
  var started = false;
  var staticTexts = [];
  var staticAttrs = [];
  var metaSrc = {};

  function norm(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/[\u00a0]/g, " ")
      .replace(/[\u200e\u200f\u061c]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasArabic(value) {
    return /[\u0600-\u06FF]/.test(String(value || ""));
  }

  function translate(source) {
    var key = norm(source);
    if (!key || !hasArabic(key) || current === "ar") return null;
    var dict = DATA[current];
    if (dict && Object.prototype.hasOwnProperty.call(dict, key)) {
      return String(dict[key]).replace(/\{ar\}/g, key);
    }
    var rules = RULES[current] || [];
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (rule[0].test(key)) {
        return key.replace(rule[0], rule[1]);
      }
    }
    return null;
  }

  function t(source) {
    if (current === "ar") return source;
    var out = translate(source);
    return out === null ? source : out;
  }

  function tf(source, vars) {
    var out = t(source);
    if (!vars) return out;
    Object.keys(vars).forEach(function (k) {
      out = out.split("{" + k + "}").join(String(vars[k]));
    });
    return out;
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== 3) return;
    var parent = node.parentNode;
    if (!parent) return;
    if (SKIP_TAGS[parent.nodeName]) return;
    if (parent.closest && parent.closest(".no-i18n")) return;
    var raw = node.nodeValue;
    if (!raw || !hasArabic(raw)) return;
    var out = translate(raw);
    if (out === null) return;
    var lead = (raw.match(/^\s*/) || [""])[0];
    var tail = (raw.match(/\s*$/) || [""])[0];
    node.nodeValue = lead + out + tail;
  }

  function translateAttrs(el) {
    if (!el || el.nodeType !== 1 || !el.getAttribute) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var name = ATTRS[i];
      var value = el.getAttribute(name);
      if (!value || !hasArabic(value)) continue;
      var out = translate(value);
      if (out !== null) el.setAttribute(name, out);
    }
  }

  function collectAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var name = ATTRS[i];
      var value = el.getAttribute(name);
      if (value && hasArabic(value)) staticAttrs.push({ el: el, attr: name, src: value });
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateTextNode(root); return; }
    if (root.nodeType !== 1) return;
    if (SKIP_TAGS[root.nodeName]) {
      if (root.nodeName === "INPUT" || root.nodeName === "TEXTAREA") translateAttrs(root);
      return;
    }
    if (root.classList && root.classList.contains("no-i18n")) return;
    translateAttrs(root);
    for (var child = root.firstChild; child; child = child.nextSibling) walk(child);
  }

  function translateTree(root) {
    if (current === "ar") return;
    walk(root);
  }

  function snapshotMeta() {
    metaSrc.title = document.title || "";
    var d = document.querySelector('meta[name="description"]');
    var ot = document.querySelector('meta[property="og:title"]');
    var od = document.querySelector('meta[property="og:description"]');
    var at = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    metaSrc.desc = d ? d.getAttribute("content") : "";
    metaSrc.ogTitle = ot ? ot.getAttribute("content") : "";
    metaSrc.ogDesc = od ? od.getAttribute("content") : "";
    metaSrc.appleTitle = at ? at.getAttribute("content") : "";
  }

  function applyMeta() {
    var dict = DATA[current] || {};
    var suffix = "";
    if (current !== "ar") suffix = " · " + (current === "fr" ? "Français" : "English");
    document.title = dict["@@title"] || (metaSrc.title + suffix);
    var d = document.querySelector('meta[name="description"]');
    if (d) d.setAttribute("content", dict["@@description"] || metaSrc.desc);
    var ot = document.querySelector('meta[property="og:title"]');
    if (ot) ot.setAttribute("content", dict["@@ogTitle"] || metaSrc.ogTitle);
    var od = document.querySelector('meta[property="og:description"]');
    if (od) od.setAttribute("content", dict["@@ogDesc"] || metaSrc.ogDesc);
    var at = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (at) at.setAttribute("content", metaSrc.appleTitle || "COSMADEDZ");
    var og = document.querySelector('meta[property="og:locale"]');
    if (og) og.setAttribute("content", current === "ar" ? "ar_DZ" : current === "fr" ? "fr_FR" : "en_US");
  }

  function snapshotStatic() {
    staticTexts = [];
    staticAttrs = [];
    (function scan(el) {
      if (!el) return;
      if (el.nodeType === 3) {
        if (hasArabic(el.nodeValue)) staticTexts.push({ node: el, src: el.nodeValue });
        return;
      }
      if (el.nodeType !== 1) return;
      if (EXCLUDE_IDS[el.id]) return;
      if (SKIP_TAGS[el.nodeName]) {
        if (el.nodeName === "INPUT" || el.nodeName === "TEXTAREA") collectAttrs(el);
        return;
      }
      if (el.classList && el.classList.contains("no-i18n")) return;
      collectAttrs(el);
      for (var child = el.firstChild; child; child = child.nextSibling) scan(child);
    })(document.body);
  }

  function applyStatic() {
    for (var i = 0; i < staticTexts.length; i++) {
      var item = staticTexts[i];
      if (!item.node || !item.node.parentNode) continue;
      if (current === "ar") { item.node.nodeValue = item.src; continue; }
      var out = translate(item.src);
      if (out === null) { item.node.nodeValue = item.src; continue; }
      var lead = (item.src.match(/^\s*/) || [""])[0];
      var tail = (item.src.match(/\s*$/) || [""])[0];
      item.node.nodeValue = lead + out + tail;
    }
    for (var j = 0; j < staticAttrs.length; j++) {
      var a = staticAttrs[j];
      if (!a.el || !a.el.getAttribute) continue;
      if (current === "ar") { a.el.setAttribute(a.attr, a.src); continue; }
      var val = translate(a.src);
      a.el.setAttribute(a.attr, val === null ? a.src : val);
    }
  }

  function updateSwitcher() {
    var meta = LANGS[current];
    var code = document.getElementById("langCode");
    if (code) code.textContent = meta.code;
    var menu = document.getElementById("langMenu");
    if (menu) {
      var opts = menu.querySelectorAll("[data-lang]");
      for (var i = 0; i < opts.length; i++) {
        var on = opts[i].getAttribute("data-lang") === current;
        opts[i].classList.toggle("is-active", on);
        opts[i].setAttribute("aria-selected", on ? "true" : "false");
      }
    }
    var btn = document.getElementById("langBtn");
    if (btn) {
      var label = t("اللغة");
      btn.setAttribute("aria-label", label + ": " + meta.label);
      btn.setAttribute("title", label + " · " + meta.label);
    }
  }

  function apply() {
    var meta = LANGS[current];
    var html = document.documentElement;
    html.setAttribute("lang", meta.lang);
    html.setAttribute("dir", meta.dir);
    html.setAttribute("data-lang", current);
    applyStatic();
    applyMeta();
    updateSwitcher();
    var tabbar = document.getElementById("tabbar");
    if (tabbar) tabbar.setAttribute("aria-label", t("التنقل السريع"));
  }

  function readLang() {
    try {
      var stored = localStorage.getItem(KEY);
      if (LANGS[stored]) return stored;
    } catch (e) {}
    return "ar";
  }

  function closeMenu() {
    var menu = document.getElementById("langMenu");
    var btn = document.getElementById("langBtn");
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    var menu = document.getElementById("langMenu");
    var btn = document.getElementById("langBtn");
    if (menu) menu.hidden = false;
    if (btn) btn.setAttribute("aria-expanded", "true");
  }

  function setLang(next) {
    if (!LANGS[next]) return;
    if (next === current && started) return;
    current = next;
    try { localStorage.setItem(KEY, next); } catch (e) {}
    apply();
    closeMenu();
    try { g.dispatchEvent(new CustomEvent("cosd:lang", { detail: { lang: next } })); } catch (e) {}
  }

  function bind() {
    var btn = document.getElementById("langBtn");
    var menu = document.getElementById("langMenu");
    if (btn && menu) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (menu.hidden) openMenu(); else closeMenu();
      });
      menu.addEventListener("click", function (e) {
        var opt = e.target.closest("[data-lang]");
        if (!opt) return;
        e.stopPropagation();
        setLang(opt.getAttribute("data-lang"));
      });
      document.addEventListener("click", function (e) {
        if (!menu.hidden && !e.target.closest("#langWrap")) closeMenu();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !menu.hidden) closeMenu();
      });
    }
    document.addEventListener("click", function (e) {
      var opt = e.target.closest("[data-set-lang]");
      if (!opt) return;
      setLang(opt.getAttribute("data-set-lang"));
    });
  }

  function observe() {
    if (!g.MutationObserver) return;
    var mo = new MutationObserver(function (mutations) {
      if (current === "ar") return;
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) translateTree(added[j]);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    if (started) return;
    started = true;
    current = readLang();
    snapshotMeta();
    snapshotStatic();
    apply();
    bind();
    observe();
  }

  function apiError(err) {
    var msg = (err && err.message) || "تعذر إكمال الطلب.";
    return t(msg);
  }

  g.COSD_I18N = {
    LANGS: LANGS,
    init: init,
    apply: apply,
    setLang: setLang,
    getLang: function () { return current; },
    t: t,
    tf: tf,
    translate: translate,
    apiError: apiError,
    formatDate: function (date) {
      var d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return "—";
      var locale = current === "ar" ? "ar-DZ" : current === "fr" ? "fr-FR" : "en-GB";
      try { return d.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" }); }
      catch (e) { return d.toLocaleDateString(); }
    },
    settings: SETTINGS
  };
})(window);
