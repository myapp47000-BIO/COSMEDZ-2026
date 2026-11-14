/* ============================================================
   COSMADEDZ — Application core
   Training PWA for cosmetics & body-care manufacturing
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- Data ---------------- */
  const D = {
    cats: window.COSMA_CATEGORIES || [],
    materials: window.COSMA_MATERIALS || [],
    modules: window.COSMA_MODULES || [],
    lessons: window.COSMA_LESSONS || [],
    recipes: window.COSMA_RECIPES || [],
    methods: window.COSMA_METHODS || [],
    quizzes: window.COSMA_QUIZZES || [],
    glossary: window.COSMA_GLOSSARY || []
  };

  const byId = (arr, id) => arr.find(x => x && x.id === id) || null;
  const CAT = {};
  D.cats.forEach(c => { CAT[c.id] = c; });
  const MAT = {};
  D.materials.forEach(m => { if (m && m.id) MAT[m.id] = m; });
  const LSN = {};
  D.lessons.forEach(l => { if (l && l.id) LSN[l.id] = l; });
  const MOD = {};
  D.modules.forEach(m => { if (m && m.id) MOD[m.id] = m; });
  const REC = {};
  D.recipes.forEach(r => { if (r && r.id) REC[r.id] = r; });
  const MTH = {};
  D.methods.forEach(m => { if (m && m.id) MTH[m.id] = m; });
  const QUIZ = {};
  D.quizzes.forEach(q => { if (q && q.id) QUIZ[q.id] = q; });

  const FALLBACK_CAT = { id: "other", title: "مواد متنوعة", fr: "Divers", icon: "drop", color: "#b76e79" };

  /* ---------------- Storage & state ---------------- */
  const PREFIX = "cosd_v1_";
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    del(key) { try { localStorage.removeItem(PREFIX + key); } catch (e) {} }
  };

  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const S = {
    lessons: new Set(store.get("lessons", [])),
    quizzes: store.get("quizzes", {}),
    favs: new Set(store.get("favs", [])),
    checklist: store.get("checklist", {}),
    notes: store.get("notes", {}),
    name: store.get("name", ""),
    theme: store.get("theme", prefersDark ? "dark" : "light"),
    cert: store.get("cert", null),
    last: store.get("last", "")
  };

  function saveLessons() { store.set("lessons", Array.from(S.lessons)); }
  function saveQuiz(id, correct, total) {
    const prev = S.quizzes[id];
    const best = prev ? Math.max(prev.best || 0, correct) : correct;
    S.quizzes[id] = { best: best, total: total, last: correct, date: Date.now() };
    store.set("quizzes", S.quizzes);
  }

  /* ---------------- Access / auth (server-backed) ---------------- */
  const AUTH = window.COSD_AUTH || null;
  // Static hosting (GitHub Pages, Netlify, file://) has no backend: the app
  // stays fully usable for study, while activation still requires the server.
  let STATIC_MODE = false;
  function isStatic() { return STATIC_MODE; }
  function probeServer() {
    if (!AUTH) return Promise.resolve(false);
    // Known static hosts never expose the Python API: skip the probe delay.
    if (location.protocol === "file:" ||
        /\.(github|gitlab)\.io$|\.netlify\.app$|\.vercel\.app$|\.pages\.dev$/i.test(location.hostname)) {
      return Promise.resolve(false);
    }
    return new Promise(function (resolve) {
      let settled = false;
      const finish = function (ok) { if (settled) return; settled = true; resolve(!!ok); };
      const timer = setTimeout(function () { finish(false); }, 2200);
      AUTH.health().then(function () { clearTimeout(timer); finish(true); })
        .catch(function () { clearTimeout(timer); finish(false); });
    });
  }
  function normEmail(v) { return String(v || "").trim().toLowerCase(); }
  function getSession() { return store.get("session", null); }
  function setSession(s) {
    store.set("session", s);
    try { renderNav(); } catch (e) {}
  }
  function clearSession() {
    store.del("session");
    try { renderNav(); } catch (e) {}
  }
  function isAuthed() {
    const s = getSession();
    return !!(s && s.token && s.email && (s.role === "admin" || s.activated));
  }
  function isAdmin() {
    const s = getSession();
    return !!(s && s.token && s.role === "admin");
  }
  function logoutSession() {
    const s = getSession();
    const done = (s && s.token && AUTH) ? AUTH.logout(s.token).catch(function () {}) : Promise.resolve();
    clearSession();
    return done;
  }
  function validateSession() {
    const s = getSession();
    if (!s || !s.token) {
      if (s) clearSession();
      return Promise.resolve(false);
    }
    if (!AUTH) return Promise.resolve(true);
    return AUTH.me(s.token).then(function (data) {
      if (data && data.user) {
        const next = Object.assign({}, s, data.user, { token: s.token });
        if (next.role === "admin") next.activated = true;
        setSession(next);
        return true;
      }
      return false;
    }).catch(function (err) {
      // Keep the local session when the network is down so offline study keeps working.
      if (err && (err.status === 401 || err.status === 403)) {
        clearSession();
        return false;
      }
      return true;
    });
  }

  /* ---------------- Utilities ---------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(value) {
    return String(value === null || value === undefined ? "" : value).replace(/[&<>"']/g, c => ESC[c]);
  }

  function inline(value) {
    let s = esc(value);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\n/g, "<br>");
    return s;
  }

  function fmt(n, dec) {
    const num = Number(n);
    if (!isFinite(num)) return "—";
    const d = dec === undefined ? (Number.isInteger(num) ? 0 : 1) : dec;
    return num.toFixed(d).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function dayIndex() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now - start) / 86400000);
  }

  function catOf(id) { return CAT[id] || FALLBACK_CAT; }
  function matOf(id) { return MAT[id] || null; }
  function recipeOf(id) { return REC[id] || null; }
  function lessonOf(id) { return LSN[id] || null; }
  function moduleOf(id) { return MOD[id] || null; }

  function moduleLessons(m) {
    if (!m) return [];
    return (m.lessons || []).map(id => LSN[id]).filter(Boolean);
  }
  function modulePct(m) {
    const ls = moduleLessons(m);
    if (!ls.length) return 0;
    const done = ls.filter(l => S.lessons.has(l.id)).length;
    return Math.round(done / ls.length * 100);
  }
  function totalLessons() { return D.lessons.length; }
  function doneLessons() { return D.lessons.filter(l => S.lessons.has(l.id)).length; }
  function overallPct() {
    const total = totalLessons();
    return total ? Math.round(doneLessons() / total * 100) : 0;
  }
  function nextLesson() {
    for (const m of D.modules) {
      for (const id of (m.lessons || [])) {
        const l = LSN[id];
        if (l && !S.lessons.has(id)) return l;
      }
    }
    return D.lessons[0] || null;
  }
  function passedQuizCount() {
    return Object.keys(S.quizzes).filter(id => {
      const q = S.quizzes[id];
      return q && q.total > 0 && (q.best / q.total) >= 0.7;
    }).length;
  }
  function isEligible() {
    return totalLessons() > 0 && doneLessons() >= totalLessons() && passedQuizCount() >= 4;
  }

  function favKey(type, id) { return type + ":" + id; }
  function isFav(type, id) { return S.favs.has(favKey(type, id)); }
  function toggleFav(type, id) {
    const key = favKey(type, id);
    if (S.favs.has(key)) S.favs.delete(key); else S.favs.add(key);
    store.set("favs", Array.from(S.favs));
    return S.favs.has(key);
  }

  function diffLabel(d) { return t(d === 1 ? "سهلة" : d === 2 ? "متوسطة" : "متقدمة"); }
  function t(msg) {
    var i18n = window.COSD_I18N;
    return i18n ? i18n.t(msg) : msg;
  }
  function diffStars(d) {
    let out = "";
    for (let i = 1; i <= 3; i++) out += '<span class="' + (i <= d ? "on" : "off") + '">★</span>';
    return '<span class="stars" aria-label="صعوبة ' + diffLabel(d) + '">' + out + "</span>";
  }

  const RECIPE_CATS = {
    face: { label: "العناية بالوجه", icon: "face" },
    body: { label: "العناية بالجسم", icon: "body" },
    hair: { label: "العناية بالشعر", icon: "hair" },
    cleanse: { label: "التنظيف", icon: "bubbles" },
    sun: { label: "الحماية الشمسية", icon: "sun" },
    anhydrous: { label: "تركيبات لامائية", icon: "butter" },
    soap: { label: "الصابون", icon: "soap" }
  };
  function recipeCatLabel(c) { return t((RECIPE_CATS[c] && RECIPE_CATS[c].label) || c || "تركيبة"); }

  const TYPE_LABEL = { "o/w": "مستحلب زيت في ماء", "w/o": "مستحلب ماء في زيت", gel: "جل", anhydrous: "لامائي", surfactant: "منظف", serum: "سيروم", soap: "صابون" };
  function typeLabel(tp) { return t(TYPE_LABEL[tp] || tp || "—"); }

  function phaseName(p) { return t(p.name || "مرحلة"); }

  /* ---------------- Icons ---------------- */
  const ICONS = {
    home: '<path d="M3.5 10.8 12 3.5l8.5 7.3V20a1 1 0 0 1-1 1h-5.2v-6.4H9.7V21H4.5a1 1 0 0 1-1-1z"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 5.5v15"/><path d="M8 7h8M8 10.5h6"/>',
    layers: '<path d="M12 3 21 8l-9 5-9-5z"/><path d="M3 12l9 5 9-5M3 16l9 5 9-5"/>',
    flask: '<path d="M9.5 3h5M10.5 3v6L4.8 19a2 2 0 0 0 1.8 3h10.8a2 2 0 0 0 1.8-3L13.5 9V3"/><path d="M7 15h10"/>',
    recipe: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h6M9 16h6"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z"/><path d="M8.6 12l2.3 2.3 4.5-4.6"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
    drop: '<path d="M12 3c0 0 6 6.6 6 10.5a6 6 0 0 1-12 0C6 9.6 12 3 12 3z"/>',
    butter: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M8 8V5h8v3M4 13h16"/>',
    blend: '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>',
    bubbles: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="8" r="2"/><circle cx="13" cy="16" r="2.6"/><circle cx="6" cy="16.5" r="1.4"/>',
    water: '<path d="M3 10c3-3 6-3 9 0s6 3 9 0M3 15c3-3 6-3 9 0s6 3 9 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.5 1.5M17.3 17.3l1.5 1.5M18.8 5.2l-1.5 1.5M6.7 17.3l-1.5 1.5"/>',
    silicone: '<path d="M12 2.5 20 7v10l-8 4.5L4 17V7z"/><circle cx="12" cy="12" r="3"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    leaf: '<path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16z"/><path d="M4 20c4-6 8-10 12-12"/>',
    grain: '<path d="M12 3v18M8 7c0-2 2-3 4-3s4 1 4 3M7 12c0-2 2-3 5-3s5 1 5 3M7 17c0-2 2-3 5-3s5 1 5 3"/>',
    scale: '<path d="M12 3v18M5 7h14M8 21h8"/><path d="M7 7l-3 6h6zM17 7l-3 6h6z"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    bottle: '<path d="M10 3h4v3l2 3v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9l2-3z"/><path d="M8 13h8"/>',
    flower: '<circle cx="12" cy="12" r="2.4"/><path d="M12 9.6C12 6 10.5 4 12 4s0 5.6 0 5.6zM14.4 12c3.6 0 5.6-1.5 5.6 0s-5.6 0-5.6 0zM12 14.4c0 3.6 1.5 5.6 0 5.6s0-5.6 0-5.6zM9.6 12c-3.6 0-5.6 1.5-5.6 0s5.6 0 5.6 0z"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.6 0 2-1 1.2-2.2-.7-1.1.1-2.3 1.4-2.3h1.9A4.5 4.5 0 0 0 21 12c0-5-4-9-9-9z"/><circle cx="7.5" cy="11" r="1"/><circle cx="9.5" cy="7" r="1"/><circle cx="14" cy="6.5" r="1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/>',
    heart: '<path d="M12 20s-7-4.4-7-9.4A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.6C19 15.6 12 20 12 20z"/>',
    check: '<path d="M4.5 12.5l5 5 10-11"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.2l2.6 2.6 5.4-5.6"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    chevronLeft: '<path d="M15 6l-6 6 6 6"/>',
    chevronRight: '<path d="M9 6l6 6-6 6"/>',
    arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 20h14"/>',
    printer: '<path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="9" rx="2"/><path d="M7 17h10v4H7z"/>',
    copy: '<rect x="9" y="9" width="11" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    alert: '<path d="M12 3 2.5 20h19z"/><path d="M12 9v5M12 17.2v.1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/>',
    play: '<path d="M8 5l11 7-11 7z"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21c0-4.1 3.4-6.5 7.5-6.5s7.5 2.4 7.5 6.5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    thermometer: '<path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M12 9v6"/>',
    ruler: '<path d="M3 15 15 3l6 6L9 21z"/><path d="M7 11l2 2M10 8l2 2M13 5l2 2"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    face: '<circle cx="12" cy="12" r="9"/><path d="M8.5 10v.1M15.5 10v.1M8.5 15c2 1.5 5 1.5 7 0"/>',
    body: '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M7 11h10M12 15l-3 6M12 15l3 6"/>',
    hair: '<path d="M5 21c0-8 2-13 7-13s7 5 7 13"/><path d="M8 21c0-5 1.5-9 4-9s4 4 4 9"/>',
    soap: '<rect x="5" y="7" width="14" height="12" rx="4"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 1 1 3.7 2.4c-.8.4-1.2 1-1.2 1.9"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/>',
    certificate: '<rect x="4" y="3" width="16" height="13" rx="2"/><path d="M8 7h8M8 10.5h5"/><circle cx="12" cy="17.5" r="3"/><path d="M10 20l-.7 2.5 2.7-1.5 2.7 1.5-.7-2.5"/>',
    calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h1M12 11h1M16 11h1M8 15h1M12 15h1M16 15h1M8 18h1M12 18h1M16 18h1"/>',
    database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    flame: '<path d="M12 22c4 0 7-2.8 7-7 0-3-2-5.5-3.5-7C14 6 13 4 13 2c-3 2-5 5-5 8 0 1.2.4 2.2 1 3-1.4-.3-2.5-1.4-3-2.8C4.5 13 5 22 12 22z"/>'
  };
  function ic(name, extra) {
    const path = ICONS[name] || ICONS.drop;
    return '<svg class="ic ' + (extra || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + "</svg>";
  }

  /* ---------------- UI helpers ---------------- */
  function ring(pct, size) {
    const p = clamp(Number(pct) || 0, 0, 100);
    const s = size || 64;
    const r = (s - 11) / 2;
    const c = 2 * Math.PI * r;
    const off = c * (1 - p / 100);
    return '<div class="ring" style="--size:' + s + 'px">' +
      '<svg viewBox="0 0 ' + s + " " + s + '"><circle class="track" cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '"/><circle class="bar" cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>' +
      '<span class="ring-text">' + Math.round(p) + "%</span></div>";
  }

  function stars(d) {
    let out = "";
    for (let i = 1; i <= 3; i++) out += '<span style="color:' + (i <= d ? "#c19a5b" : "var(--line-strong)") + '">★</span>';
    return '<span class="stars" aria-label="صعوبة: ' + diffLabel(d) + '" title="' + diffLabel(d) + '">' + out + "</span>";
  }

  function crumbs(items) {
    return '<nav class="crumbs no-print" aria-label="مسار التنقل">' + items.map((it, i) => {
      const sep = i ? '<span class="sep">/</span>' : "";
      return sep + (it.href ? '<a href="' + it.href + '">' + esc(it.label) + "</a>" : "<span>" + esc(it.label) + "</span>");
    }).join("") + "</nav>";
  }

  function pageHead(eyebrow, title, lead, right) {
    return '<div class="page-head"><div class="page-head-row"><div>' +
      (eyebrow ? '<span class="eyebrow">' + esc(eyebrow) + "</span>" : "") +
      '<h1 class="page-title">' + title + "</h1>" +
      (lead ? '<p class="lead">' + inline(lead) + "</p>" : "") +
      "</div>" + (right || "") + "</div></div>";
  }

  function favButton(type, id, label) {
    const on = isFav(type, id);
    return '<button class="icon-btn fav-btn ' + (on ? "is-on" : "") + '" type="button" data-fav="' + type + ":" + esc(id) + '" aria-pressed="' + on + '" aria-label="' + esc(label || "حفظ في المفضلة") + '" title="' + (on ? "إزالة من المفضلة" : "حفظ في المفضلة") + '">' + ic("heart") + "</button>";
  }

  function moduleColor(m) { return (m && m.color) || "#b76e79"; }

  function moduleCard(m) {
    const pct = modulePct(m);
    const count = moduleLessons(m).length;
    return '<a class="module-card" href="#/module/' + esc(m.id) + '" style="--accent:' + esc(moduleColor(m)) + '">' +
      '<div class="module-top"><span class="module-icon">' + ic(m.icon || "book") + "</span>" +
      '<span class="level-badge">المستوى ' + esc(fmt(m.level || 1)) + "</span></div>" +
      "<h3>" + esc(m.title) + "</h3><div class=\"fr\">" + esc(m.fr || "") + "</div>" +
      "<p>" + inline(m.desc || "") + "</p>" +
      '<div class="module-meta"><span>' + ic("book") + fmt(count) + " درساً</span><span>" + ic("clock") + fmt(m.duration || 0) + " دقيقة</span></div>" +
      '<div class="progress-line"><i style="width:' + pct + '%"></i></div>' +
      '<div class="module-foot"><small>' + (pct === 100 ? "مكتمل ✓" : pct ? pct + "% مكتمل" : count + " دروس") + "</small>" +
      '<span class="link-more">افتح المسار' + ic("arrowLeft") + "</span></div></a>";
  }

  function renderBlocks(blocks) {
    if (!Array.isArray(blocks)) return "";
    return blocks.map(b => {
      if (!b || !b.type) return "";
      switch (b.type) {
        case "p": return "<p>" + inline(b.text) + "</p>";
        case "h": return "<h2>" + inline(b.text) + "</h2>";
        case "list": return "<ul>" + (b.items || []).map(i => "<li>" + inline(i) + "</li>").join("") + "</ul>";
        case "steps": return "<ol>" + (b.items || []).map(i => "<li>" + inline(i) + "</li>").join("") + "</ol>";
        case "table":
          return '<div class="table-wrap"><table class="table"><thead><tr>' +
            (b.head || []).map(h => "<th>" + inline(h) + "</th>").join("") +
            "</tr></thead><tbody>" +
            (b.rows || []).map(r => "<tr>" + r.map(c => "<td>" + inline(c) + "</td>").join("") + "</tr>").join("") +
            "</tbody></table></div>";
        case "tip":
          return '<div class="callout callout-tip">' + ic("sparkle") + "<div>" + (b.title ? "<strong>" + esc(b.title) + "</strong>" : "") + "<p>" + inline(b.text) + "</p></div></div>";
        case "warn":
          return '<div class="callout callout-warn">' + ic("alert") + "<div>" + (b.title ? "<strong>" + esc(b.title) + "</strong>" : "") + "<p>" + inline(b.text) + "</p></div></div>";
        case "info":
          return '<div class="callout callout-info">' + ic("info") + "<div>" + (b.title ? "<strong>" + esc(b.title) + "</strong>" : "") + "<p>" + inline(b.text) + "</p></div></div>";
        case "quote":
          return '<div class="callout callout-gold">' + ic("award") + "<div><p>" + inline(b.text) + "</p></div></div>";
        case "key":
          return '<div class="key-box"><h3>' + ic("target") + "خلاصة الدرس</h3><ul>" + (b.items || []).map(i => "<li>" + inline(i) + "</li>").join("") + "</ul></div>";
        default: return "";
      }
    }).join("");
  }

  /* ---------------- Toast ---------------- */
  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = t(msg);
    el.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-show"), 2800);
  }

  /* ---------------- Theme ---------------- */
  function applyTheme(theme) {
    S.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    store.set("theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#151014" : "#b76e79");
  }

  /* ---------------- Navigation ---------------- */
  const NAV = [
    { group: "التكوين", items: [
      { href: "#/home", icon: "home", label: "الرئيسية", key: "home" },
      { href: "#/learn", icon: "book", label: "المسارات التكوينية", key: "learn", count: D.modules.length },
      { href: "#/quizzes", icon: "quiz", label: "الاختبارات", key: "quizzes" },
      { href: "#/certificate", icon: "certificate", label: "الشهادة", key: "certificate" }
    ] },
    { group: "المكتبة الفنية", items: [
      { href: "#/materials", icon: "drop", label: "المواد الأولية", key: "materials", count: D.materials.length },
      { href: "#/recipes", icon: "recipe", label: "الوصفات", key: "recipes", count: D.recipes.length },
      { href: "#/methods", icon: "flame", label: "طرق التصنيع", key: "methods", count: D.methods.length }
    ] },
    { group: "المختبر", items: [
      { href: "#/lab", icon: "calculator", label: "حاسبات الصياغة", key: "lab" },
      { href: "#/quality", icon: "shield", label: "الجودة والتشريع", key: "quality" }
    ] },
    { group: "المراجع", items: [
      { href: "#/glossary", icon: "list", label: "المعجم المهني", key: "glossary" },
      { href: "#/favorites", icon: "heart", label: "المفضلة", key: "favorites" },
      { href: "#/about", icon: "info", label: "عن التطبيق", key: "about" }
    ] }
  ];

  function renderNav() {
    const side = $("#sideNav");
    if (side) {
      const adminNav = isAdmin()
        ? '<div class="nav-label">الإدارة</div>' +
          '<a class="nav-item" data-nav="admin" href="#/admin">' + ic("shield") + "<span>لوحة الإدارة</span></a>"
        : "";
      side.innerHTML = NAV.map(g =>
        '<div class="nav-label">' + esc(g.group) + "</div>" +
        g.items.map(it =>
          '<a class="nav-item" data-nav="' + it.key + '" href="' + it.href + '">' +
          ic(it.icon) + "<span>" + esc(it.label) + "</span>" +
          (it.count ? '<span class="nav-badge">' + fmt(it.count) + "</span>" : "") +
          "</a>"
        ).join("")
      ).join("") + adminNav;
    }
    const tabs = [
      { href: "#/home", icon: "home", label: "الرئيسية", key: "home" },
      { href: "#/learn", icon: "book", label: "التكوين", key: "learn" },
      { href: "#/materials", icon: "drop", label: "المواد", key: "materials" },
      { href: "#/recipes", icon: "recipe", label: "الوصفات", key: "recipes" },
      { href: "#/menu", icon: "menu", label: "القائمة", key: "menu" }
    ];
    if (isAdmin()) tabs.push({ href: "#/admin", icon: "shield", label: "الإدارة", key: "admin" });
    const bar = $("#tabbar");
    if (bar) {
      bar.innerHTML = tabs.map(t =>
        '<a class="tab-item" data-nav="' + t.key + '" href="' + t.href + '">' + ic(t.icon) + "<span>" + esc(t.label) + "</span></a>"
      ).join("");
    }
  }

  function setActiveNav(path) {
    const root = path.split("/")[1] || "home";
    const alias = { module: "learn", lesson: "learn", quiz: "quizzes", material: "materials", recipe: "recipes", method: "methods" };
    const active = alias[root] || root;
    $$("[data-nav]").forEach(el => {
      const k = el.getAttribute("data-nav");
      const on = k === active || (active === "home" && k === "home");
      el.classList.toggle("is-active", on);
      if (on) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
    });
  }

  function closeSidebar() {
    const sb = $("#sidebar"), sc = $("#scrim"), btn = $("#menuBtn");
    if (sb) sb.classList.remove("is-open");
    if (sc) sc.classList.remove("is-open");
    if (btn) btn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  function openSidebar() {
    const sb = $("#sidebar"), sc = $("#scrim"), btn = $("#menuBtn");
    if (sb) sb.classList.add("is-open");
    if (sc) sc.classList.add("is-open");
    if (btn) btn.setAttribute("aria-expanded", "true");
    if (window.innerWidth <= 920) document.body.style.overflow = "hidden";
  }

  /* ---------------- Router ---------------- */
  const PAGES = {};

  function parseRoute() {
    const raw = (location.hash || "#/home").replace(/^#/, "");
    const qi = raw.indexOf("?");
    const path = (qi >= 0 ? raw.slice(0, qi) : raw) || "/home";
    const query = new URLSearchParams(qi >= 0 ? raw.slice(qi + 1) : "");
    return { path: path.replace(/\/+$/, "") || "/home", parts: path.split("/").filter(Boolean), query: query };
  }

  const ROUTES = [
    { re: /^\/login$/, page: "login" },
    { re: /^\/admin$/, page: "admin" },
    { re: /^\/menu$/, page: "menu" },
    { re: /^\/home$/, page: "home" },
    { re: /^\/learn$/, page: "learn" },
    { re: /^\/module\/([^/]+)$/, page: "module", keys: ["id"] },
    { re: /^\/lesson\/([^/]+)$/, page: "lesson", keys: ["id"] },
    { re: /^\/materials$/, page: "materials" },
    { re: /^\/material\/([^/]+)$/, page: "material", keys: ["id"] },
    { re: /^\/recipes$/, page: "recipes" },
    { re: /^\/recipe\/([^/]+)$/, page: "recipe", keys: ["id"] },
    { re: /^\/methods$/, page: "methods" },
    { re: /^\/method\/([^/]+)$/, page: "method", keys: ["id"] },
    { re: /^\/quizzes$/, page: "quizzes" },
    { re: /^\/quiz\/([^/]+)$/, page: "quiz", keys: ["id"] },
    { re: /^\/lab$/, page: "lab" },
    { re: /^\/quality$/, page: "quality" },
    { re: /^\/glossary$/, page: "glossary" },
    { re: /^\/favorites$/, page: "favorites" },
    { re: /^\/certificate$/, page: "certificate" },
    { re: /^\/profile$/, page: "profile" },
    { re: /^\/about$/, page: "about" }
  ];

  function renderRoute() {
    const r = parseRoute();
    closeSidebar();
    document.body.classList.remove("printing-cert", "printing-recipe");
    const authed = isAuthed();
    const admin = isAdmin();
    if (r.path === "/login" && authed) { try { location.hash = "#/home"; } catch (e) {} return; }
    if (r.path !== "/login" && r.path !== "/admin" && !authed && !STATIC_MODE) { try { location.hash = "#/login"; } catch (e) {} return; }
    if (r.path === "/admin" && authed && !admin) { try { location.hash = "#/home"; } catch (e) {} return; }
    let matched = null, params = {};
    for (const rt of ROUTES) {
      const m = r.path.match(rt.re);
      if (m) {
        matched = rt;
        (rt.keys || []).forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
        break;
      }
    }
    const view = $("#view");
    if (!view) return;

    let fn = matched && PAGES[matched.page];
    if (!fn && matched && (matched.page === "login" || matched.page === "admin")) {
      view.innerHTML = '<div class="empty-state"><div class="es-ico">' + ic("sparkle") + '</div><h2>جارٍ التحميل…</h2><p>يتم تجهيز الصفحة.</p></div>';
      setTimeout(renderRoute, 60);
      return;
    }
    if (!fn) {
      view.innerHTML = '<div class="empty-state"><div class="es-ico">' + ic("search") + "</div><h2>الصفحة غير موجودة</h2><p> قد يكون الرابط قديماً أو غير صحيح.</p><a class=\"btn btn-primary\" href=\"#/home\">العودة للرئيسية</a></div>";
      setActiveNav(r.path);
      return;
    }

    let result;
    try {
      result = fn(params, r.query);
    } catch (err) {
      console.error(err);
      view.innerHTML = '<div class="empty-state"><div class="es-ico">' + ic("alert") + "</div><h2>تعذر عرض الصفحة</h2><p>حدث خطأ غير متوقع. أعد تحميل التطبيق وحاول مجدداً.</p><button class=\"btn btn-ghost\" onclick=\"location.reload()\">إعادة التحميل</button></div>";
      return;
    }

    if (typeof result === "string") view.innerHTML = result;
    else if (result && result.html) view.innerHTML = result.html;
    else view.innerHTML = "";

    setActiveNav(r.path);
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    if (result && typeof result.after === "function") {
      try { result.after(); } catch (e) { console.error(e); }
    }
    // remember location
    if (r.path !== "/home") { S.last = r.path; store.set("last", r.path); }
  }

  function go(hash) { location.hash = hash; }

  /* ---------------- Search ---------------- */
  let SEARCH_INDEX = null;
  function buildSearchIndex() {
    if (SEARCH_INDEX) return SEARCH_INDEX;
    const idx = [];
    D.lessons.forEach(l => {
      const m = MOD[l.mid];
      const body = (l.blocks || []).map(b => [b.text, (b.items || []).join(" "), (b.rows || []).map(r => r.join(" ")).join(" "), b.title].filter(Boolean).join(" ")).join(" ");
      idx.push({ kind: "درس", title: l.title, sub: m ? m.title : "درس", href: "#/lesson/" + l.id, icon: "book", text: (l.summary || "") + " " + body });
    });
    D.materials.forEach(m => {
      idx.push({ kind: "مادة", title: m.name, sub: m.inci + (m.fr ? " · " + m.fr : ""), href: "#/material/" + m.id, icon: (catOf(m.cat).icon || "drop"), text: [m.name, m.inci, m.fr, m.desc, (m.tags || []).join(" "), catOf(m.cat).title].filter(Boolean).join(" ") });
    });
    D.recipes.forEach(r => {
      const items = (r.phases || []).map(p => (p.items || []).map(i => [i.name, i.inci, i.role].join(" ")).join(" ")).join(" ");
      idx.push({ kind: "وصفة", title: r.title, sub: r.fr || recipeCatLabel(r.cat), href: "#/recipe/" + r.id, icon: "recipe", text: [r.title, r.fr, r.desc, items, (r.claims || []).join(" ")].filter(Boolean).join(" ") });
    });
    D.methods.forEach(m => {
      idx.push({ kind: "طريقة", title: m.title, sub: m.fr || "طريقة تصنيع", href: "#/method/" + m.id, icon: "flame", text: [m.title, m.fr, m.desc, (m.equipment || []).join(" "), (m.steps || []).map(s => s.t + " " + s.d).join(" ")].filter(Boolean).join(" ") });
    });
    D.glossary.forEach(g => {
      idx.push({ kind: "مصطلح", title: g.ar, sub: [g.fr, g.en].filter(Boolean).join(" · "), href: "#/glossary?q=" + encodeURIComponent(g.ar), icon: "list", text: [g.ar, g.fr, g.en, g.def].filter(Boolean).join(" ") });
    });
    SEARCH_INDEX = idx;
    return idx;
  }

  function normText(s) {
    return String(s || "").toLowerCase()
      .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
      .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
      .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }

  function searchAll(q) {
    const needle = normText(q);
    if (!needle) return [];
    const words = needle.split(/\s+/).filter(w => w.length > 1);
    return buildSearchIndex().map(item => {
      const hay = normText(item.title + " " + item.sub + " " + item.text);
      let score = 0;
      if (normText(item.title).includes(needle)) score += 60;
      if (normText(item.sub).includes(needle)) score += 20;
      words.forEach(w => { if (hay.includes(w)) score += 8; });
      if (hay.includes(needle)) score += 25;
      return { item: item, score: score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).map(x => x.item);
  }

  let searchTimer = null;
  function renderSearchResults(q) {
    const box = $("#searchResults");
    if (!box) return;
    if (!q.trim()) {
      box.innerHTML = '<div class="search-empty"><div class="empty-mark">⌕</div><p>ابحث عبر كل مكتبة COSMADEDZ</p><small>الدروس · المواد الأولية · الوصفات · طرق التصنيع · المعجم</small></div>';
      return;
    }
    const results = searchAll(q).slice(0, 24);
    if (!results.length) {
      box.innerHTML = '<div class="search-empty"><div class="empty-mark">⌕</div><p>لا توجد نتائج عن «' + esc(q) + '»</p><small>جرّب كلمة أقصر أو اسماً لاتينياً للمادة.</small></div>';
      return;
    }
    const groups = {};
    results.forEach(r => { (groups[r.kind] = groups[r.kind] || []).push(r); });
    box.innerHTML = Object.keys(groups).map(kind =>
      '<div class="search-group-label">' + esc(kind) + "</div>" +
      groups[kind].map(r =>
        '<a class="search-item" href="' + r.href + '" data-search-close>' +
        '<span class="sico">' + ic(r.icon) + "</span>" +
        '<span class="scopy"><strong>' + esc(r.title) + "</strong><span>" + esc(r.sub) + "</span></span>" +
        '<span class="stype">' + esc(kind) + "</span></a>"
      ).join("")
    ).join("");
  }

  function openSearch() {
    const modal = $("#searchModal");
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => { const inp = $("#globalSearch"); if (inp) { inp.focus(); inp.select(); } }, 40);
  }
  function closeSearch() {
    const modal = $("#searchModal");
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  /* ---------------- Page: Home ---------------- */
  function viewHome() {
    const total = totalLessons();
    const done = doneLessons();
    const pct = overallPct();
    const nl = nextLesson();
    const nlModule = nl ? MOD[nl.mid] : null;
    const featured = D.recipes.length ? D.recipes[dayIndex() % D.recipes.length] : null;

    const stats = [
      { icon: "book", value: fmt(total), label: "درساً تكوينياً" },
      { icon: "drop", value: fmt(D.materials.length), label: "مادة أولية مصنفة" },
      { icon: "recipe", value: fmt(D.recipes.length), label: "وصفة كاملة" },
      { icon: "flame", value: fmt(D.methods.length), label: "طريقة تصنيع" }
    ];

    const hero = '<section class="hero">' +
      '<div class="hero-copy"><span class="eyebrow">منصة تكوينية جزائرية · صياغة تجميلية</span>' +
      "<h1>من المادة الأولية إلى <em>منتج احترافي</em></h1>" +
      "<p>مسار تكويني متكامل في صناعة مستحضرات التجميل والعناية بالجسم: أساسيات علمية، مواد أولية مصنفة وظيفياً، وصفات محسوبة، طرق تصنيع دقيقة، وجودة وتشريع. كل ذلك يعمل دون إنترنت.</p>" +
      '<div class="hero-actions"><a class="btn btn-primary btn-lg" href="' + (nl ? "#/lesson/" + nl.id : "#/learn") + '">' + (done ? "أكمل التكوين" : "ابدأ التكوين") + ic("arrowLeft") + "</a>" +
      '<a class="btn btn-ghost btn-lg" href="#/materials">' + ic("database") + "استكشف المواد</a></div>" +
      '<div class="hero-stats"><div class="hero-stat"><strong>' + pct + '%</strong><span>تقدمك الكلي</span></div><div class="hero-stat"><strong>' + fmt(done) + "/" + fmt(total) + "</strong><span>دروس مكتملة</span></div><div class=\"hero-stat\"><strong>" + fmt(passedQuizCount()) + "</strong><span>اختبارات ناجحة</span></div></div>" +
      "</div>" +
      '<div class="hero-visual"><div class="formula-card">' +
      '<div class="formula-card-head"><strong>كريم مرطب · O/W</strong><span>100 g</span></div>' +
      [["ماء مقطر", 68], ["زبدة الشيا", 10], ["زيت جوجوبا", 8], ["مستحلب", 8], ["جليسرين", 5], ["حافظة", 1]].map(row =>
        '<div class="formula-row"><span>' + row[0] + "</span><b>" + row[1] + "%</b><div class=\"fr-bar\"><i style=\"width:" + row[1] + '%"></i></div></div>'
      ).join("") +
      '<div class="formula-foot"><span>pH 5.4 · ثبات 3 أشهر</span><b>مجرّبة ✓</b></div>' +
      "</div></div></section>";

    const statGrid = '<div class="stat-grid" style="margin-top:16px">' + stats.map(s =>
      '<div class="stat-card"><span class="stat-icon">' + ic(s.icon) + "</span><div><strong>" + s.value + "</strong><span>" + esc(s.label) + "</span></div></div>"
    ).join("") + "</div>";

    let continueBlock = "";
    if (nl) {
      const ls = nlModule ? moduleLessons(nlModule) : [];
      const idx = ls.findIndex(x => x.id === nl.id);
      const lp = ls.length ? Math.round((idx / ls.length) * 100) : 0;
      continueBlock = '<div class="section"><div class="continue-card">' +
        '<div class="continue-thumb">' + ic(nlModule ? nlModule.icon : "book") + "</div>" +
        '<div class="continue-copy"><strong>' + (done ? "تابع من حيث توقفت" : "ابدأ بأول درس") + " · " + esc(nl.title) + "</strong>" +
        "<span>" + esc(nlModule ? nlModule.title : "") + " · " + fmt(nl.time) + " دقيقة قراءة</span>" +
        '<div class="progress-line"><i style="width:' + lp + '%"></i></div></div>' +
        '<a class="btn btn-soft" href="#/lesson/' + nl.id + '">' + (done ? "متابعة" : "ابدأ الآن") + ic("chevronLeft") + "</a></div></div>";
    }

    const modulesBlock = '<section class="section"><div class="section-head"><div><h2>' + ic("book") + "المسارات التكوينية</h2><p>ستة مسارات متدرجة تغطي دورة حياة المنتج التجميلي كاملة.</p></div><a class=\"link-more\" href=\"#/learn\">كل المسارات" + ic("arrowLeft") + "</a></div>" +
      '<div class="grid-3">' + D.modules.map(moduleCard).join("") + "</div></section>";

    const featuredBlock = featured ? (function () {
      const cat = catOf((D.materials.find(m => (featured.phases || []).some(p => (p.items || []).some(i => i.inci && m.inci && i.inci.toLowerCase() === m.inci.toLowerCase()))) || {}).cat);
      return '<section class="section"><div class="section-head"><div><h2>' + ic("recipe") + "وصفة اليوم</h2><p>تركيبة كاملة بالنسب والخطوات، جاهزة للحساب والتطبيق.</p></div><a class=\"link-more\" href=\"#/recipes\">كل الوصفات" + ic("arrowLeft") + "</a></div>" +
        '<a class="card card-hover" href="#/recipe/' + featured.id + '" style="display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center;padding:22px;--accent:' + cat.color + '">' +
        '<span class="continue-thumb" style="background:linear-gradient(135deg,' + cat.color + ',#b76e79);width:62px;height:62px;border-radius:18px">' + ic("recipe") + "</span>" +
        "<div><span class=\"tag tag-rose\">" + esc(recipeCatLabel(featured.cat)) + "</span><h3 style=\"margin-top:6px;font-size:1.05rem\">" + esc(featured.title) + "</h3><p class=\"small muted\" style=\"margin-top:3px\">" + inline(featured.desc || "") + "</p>" +
        '<div class="module-meta" style="margin-top:8px"><span>' + ic("clock") + esc(featured.time || "") + "</span><span>" + ic("flame") + esc(typeLabel(featured.type)) + "</span><span>" + stars(featured.diff) + "</span></div></div>" +
        '<span class="btn btn-soft">افتح الوصفة' + ic("chevronLeft") + "</span></a></section>";
    })() : "";

    const catsBlock = D.cats.length ? '<section class="section"><div class="section-head"><div><h2>' + ic("layers") + "عائلات المواد الأولية</h2><p>تصنيف وظيفي على نمط منصات المواد الأولية المهنية مثل ULProspector.</p></div><a class=\"link-more\" href=\"#/materials\">المكتبة الكاملة" + ic("arrowLeft") + "</a></div>" +
      '<div class="grid-3">' + D.cats.slice(0, 9).map(c => {
        const n = D.materials.filter(m => m.cat === c.id).length;
        return '<a class="mat-card" href="#/materials?cat=' + encodeURIComponent(c.id) + '" style="--accent:' + esc(c.color) + ';padding:14px 16px">' +
          '<div class="mat-top"><span class="module-icon" style="--accent:' + esc(c.color) + ';background:color-mix(in srgb,' + esc(c.color) + ' 13%,var(--surface));color:' + esc(c.color) + ';width:38px;height:38px;border-radius:11px">' + ic(c.icon) + "</span><span class=\"tag\">" + fmt(n) + " مادة</span></div>" +
          "<h3 style=\"font-size:.86rem;margin-top:4px\">" + esc(c.title) + "</h3>" +
          '<div class="mat-inci">' + esc(c.fr) + "</div></a>";
      }).join("") + "</div></section>" : "";

    const tip = (function () {
      const tips = [
        { t: "قاعدة 70/75", d: "سخّن المرحلتين المائية والزيتية معاً إلى 70–75 °م، وأضف المرحلة المائية فوق الزيتية مع تحريك مستمر. الفرق الحراري بينهما لا يتجاوز 5 °م." },
        { t: "لا تبرد بسرعة", d: "التبريد التدريجي مع تحريك لطيف يمنع تكون البلورات ويحافظ على استقرار المستحلب. أضف المواد الحساسة تحت 40 °م." },
        { t: "سجّل كل دفعة", d: "رقم الدفعة، تاريخ التحضير، الأوزان الفعلية، pH، ورقم المواد. هذا السجل هو أساس تتبع الجودة عند أي مشكلة." },
        { t: "اختبر قبل التعبئة", d: "pH، اللزوجة، المظهر، والرائحة. ثم اترك عينة 24 ساعة في حرارة الغرفة قبل التعبئة النهائية." }
      ];
      const x = tips[dayIndex() % tips.length];
      return '<section class="section"><div class="card card-pad" style="display:grid;grid-template-columns:auto 1fr;gap:15px;align-items:start;background:linear-gradient(135deg,var(--gold-soft),var(--surface))">' +
        '<span class="stat-icon" style="background:var(--gold-soft);color:#8a6a2f">' + ic("sparkle") + "</span>" +
        "<div><span class=\"eyebrow\">نصيحة المختبر</span><h3 style=\"font-size:1rem;margin-top:3px\">" + esc(x.t) + "</h3><p class=\"small\" style=\"color:var(--ink-2);margin-top:3px\">" + esc(x.d) + "</p></div></div></section>";
    })();

    const trust = '<section class="section"><div class="grid-2">' +
      '<div class="card card-pad"><div style="display:flex;gap:11px;align-items:flex-start"><span class="stat-icon" style="background:var(--ok-soft);color:var(--ok)">' + ic("shield") + '</span><div><strong style="font-size:.9rem">جودة على أسس مهنية</strong><p class="small muted" style="margin-top:3px">مبادئ GMP / ISO 22716، اختبارات الثبات، والتوثيق — مدمجة في المسارات.</p></div></div></div>' +
      '<div class="card card-pad"><div style="display:flex;gap:11px;align-items:flex-start"><span class="stat-icon" style="background:var(--info-soft);color:var(--info)">' + ic("globe") + '</span><div><strong style="font-size:.9rem">تصنيف وظيفي مرجعي</strong><p class="small muted" style="margin-top:3px">عائلات المواد ومناطق الاستخدام مبنية على منطق ULProspector Personal Care وINCI.</p></div></div></div>' +
      "</div></section>";

    return hero + statGrid + continueBlock + modulesBlock + featuredBlock + catsBlock + tip + trust;
  }

  /* ---------------- Page: Learn ---------------- */
  function viewLearn() {
    const pct = overallPct();
    const done = doneLessons();
    const total = totalLessons();
    return crumbs([{ label: "الرئيسية", href: "#/home" }, { label: "المسارات التكوينية" }]) +
      pageHead("التكوين المهني", "مسارات تكوينية <span class=\"accent\">متدرجة</span>", "من أساسيات علم التجميل إلى إدارة مشروع صغير. كل مسار يحتوي دروساً عملية واختباراً نهائياً.",
        '<div style="display:flex;align-items:center;gap:13px">' + ring(pct, 72) + '<div><strong class="num" style="font-size:1.3rem">' + fmt(done) + "/" + fmt(total) + '</strong><div class="tiny muted">درساً مكتملاً</div></div></div>') +
      '<div class="card card-pad" style="margin-bottom:20px;background:linear-gradient(120deg,var(--brand-tint),var(--surface))">' +
      '<div style="display:flex;gap:12px;align-items:flex-start"><span class="stat-icon">' + ic("target") + '</span><div><strong style="font-size:.9rem">كيف تتابع التكوين؟</strong><p class="small muted" style="margin-top:3px">افتح المسار بالترتيب، اقرأ الدرس، دوّن ملاحظاتك، ثم علّم الدرس كمكتمل. بعد كل مسار اجتز الاختبار بـ 70% على الأقل. أكمل 4 اختبارات لتفتح الشهادة.</p></div></div></div>' +
      '<h2 class="sr-only">المسارات التكوينية</h2>' +
      '<div class="grid-2">' + D.modules.map(moduleCard).join("") + "</div>";
  }

  /* ---------------- Page: Module ---------------- */
  function viewModule(params) {
    const m = moduleOf(params.id);
    if (!m) return notFound("المسار");
    const ls = moduleLessons(m);
    const pct = modulePct(m);
    const quiz = m.quiz ? QUIZ[m.quiz] : null;
    const score = quiz ? S.quizzes[quiz.id] : null;
    const accent = moduleColor(m);

    const rows = ls.map((l, i) => {
      const done = S.lessons.has(l.id);
      return '<a class="lesson-row ' + (done ? "is-done" : "") + '" href="#/lesson/' + l.id + '">' +
        '<span class="lesson-num"><span>' + fmt(i + 1) + "</span></span>" +
        '<span class="lesson-copy"><strong>' + esc(l.title) + '</strong><span>' + esc(l.summary || "") + "</span></span>" +
        '<span class="lesson-meta">' + ic("clock") + fmt(l.time || 0) + " د" + (done ? ' <span class="tag tag-green">مكتمل</span>' : "") + "</span></a>";
    }).join("");

    return crumbs([{ label: "الرئيسية", href: "#/home" }, { label: "المسارات", href: "#/learn" }, { label: m.title }]) +
      '<section class="detail-hero module-hero" style="--accent:' + esc(accent) + '">' +
      '<div class="detail-hero-top"><div style="display:flex;gap:15px;align-items:flex-start">' +
      '<span class="module-icon" style="width:58px;height:58px;border-radius:17px">' + ic(m.icon || "book") + "</span>" +
      "<div><span class=\"eyebrow\">المسار " + fmt(m.level || 1) + " · " + fmt(m.duration || 0) + " دقيقة</span>" +
      "<h1>" + esc(m.title) + "</h1><div class=\"fr\">" + esc(m.fr || "") + "</div></div></div>" +
      '<div style="display:flex;align-items:center;gap:12px">' + ring(pct, 70) + "</div></div>" +
      '<p class="lead">' + inline(m.desc || "") + "</p>" +
      '<div class="meta-grid"><div class="meta-item"><span>الدروس</span><strong>' + fmt(ls.length) + " دروس</strong></div><div class=\"meta-item\"><span>المدة التقديرية</span><strong>" + fmt(m.duration || 0) + " دقيقة</strong></div><div class=\"meta-item\"><span>المستوى</span><strong>" + fmt(m.level || 1) + " / 4</strong></div><div class=\"meta-item\"><span>التقدم</span><strong>" + pct + "%</strong></div></div></section>" +
      '<div class="detail-grid"><div>' +
      '<div class="panel"><h2>' + ic("target") + "أهداف المسار</h2><ul class=\"check-list\">" + (m.objectives || []).map(o => "<li>" + inline(o) + "</li>").join("") + "</ul></div>" +
      '<div class="panel" style="margin-top:16px"><h2>' + ic("list") + "دروس المسار</h2><div class=\"lesson-list\">" + rows + "</div></div>" +
      "</div><aside class=\"sticky-side\">" +
      (quiz ? '<div class="panel"><h2>' + ic("quiz") + "اختبار المسار</h2><p>" + esc(quiz.title) + "</p><p class=\"tiny muted\" style=\"margin-top:4px\">" + fmt((quiz.questions || []).length) + " أسئلة · النجاح 70%</p>" +
        (score ? '<div class="result-box" style="margin-top:11px"><div class="result-big">' + fmt(score.best) + "<small> / " + fmt(score.total) + '</small></div><div class="tiny muted">أفضل نتيجة سابقة</div></div>' : "") +
        '<a class="btn btn-primary btn-block" style="margin-top:12px" href="#/quiz/' + quiz.id + '">' + (score ? "أعد الاختبار" : "ابدأ الاختبار") + ic("play") + "</a></div>" : "") +
      '<div class="panel"><h2>' + ic("sparkle") + "نصيحة دراسة</h2><p>اقرأ الدرس مرة بتركيز، ثم أعد صياغة الفكرة بكلماتك في خانة الملاحظات أسفل الدرس. التدوين يضاعف التذكر.</p></div>" +
      "</aside></div>";
  }

  /* ---------------- Page: Lesson ---------------- */
  function viewLesson(params) {
    const l = lessonOf(params.id);
    if (!l) return notFound("الدرس");
    const m = MOD[l.mid] || null;
    const ls = m ? moduleLessons(m) : [];
    const idx = ls.findIndex(x => x.id === l.id);
    const prev = idx > 0 ? ls[idx - 1] : null;
    const next = idx >= 0 && idx < ls.length - 1 ? ls[idx + 1] : null;
    const done = S.lessons.has(l.id);
    const accent = moduleColor(m);
    const note = S.notes[l.id] || "";

    const nav = '<div class="lesson-nav no-print">' +
      (prev ? '<a class="btn btn-ghost btn-sm" href="#/lesson/' + prev.id + '">' + ic("chevronRight") + "السابق: " + esc(prev.title) + "</a>" : "<span></span>") +
      (next ? '<a class="btn btn-soft btn-sm" href="#/lesson/' + next.id + '">التالي: ' + esc(next.title) + ic("chevronLeft") + "</a>" : (m && m.quiz ? '<a class="btn btn-soft btn-sm" href="#/quiz/' + m.quiz + '">إلى اختبار المسار' + ic("quiz") + "</a>" : "")) +
      "</div>";

    return crumbs([{ label: "الرئيسية", href: "#/home" }, { label: "المسارات", href: "#/learn" }, { label: m ? m.title : "درس", href: m ? "#/module/" + m.id : "#/learn" }, { label: l.title }]) +
      '<div class="lesson-header"><span class="eyebrow">' + esc(m ? m.title : "درس") + " · الدرس " + fmt(idx + 1) + "</span>" +
      "<h1>" + esc(l.title) + "</h1>" +
      (l.fr ? '<div class="fr" style="direction:ltr;text-align:start;color:var(--ink-3);font-size:.78rem">' + esc(l.fr) + "</div>" : "") +
      '<p class="summary">' + inline(l.summary || "") + "</p>" +
      '<div class="lesson-meta-row"><span>' + ic("clock") + fmt(l.time || 0) + " دقيقة</span><span>" + ic("book") + "درس " + fmt(idx + 1) + " من " + fmt(ls.length) + "</span>" +
      (done ? '<span class="tag tag-green">' + ic("check") + " مكتمل</span>" : '<span class="tag">غير مكتمل</span>') + "</div></div>" +
      '<article class="lesson-body">' + renderBlocks(l.blocks) +
      ((l.key && l.key.length) ? '<div class="key-box"><h3>' + ic("target") + "ما يجب أن تتذكره</h3><ul>" + l.key.map(k => "<li>" + inline(k) + "</li>").join("") + "</ul></div>" : "") +
      "</article>" +
      '<div class="lesson-footer no-print">' +
      '<div class="lesson-nav">' +
      '<button class="btn ' + (done ? "btn-soft" : "btn-primary") + '" type="button" data-complete="' + l.id + '">' + ic(done ? "checkCircle" : "check") + (done ? "تم إكمال الدرس — اضغط للتراجع" : "علّم الدرس كمكتمل") + "</button>" +
      '<span class="tiny muted">يُحفظ تقدمك تلقائياً على هذا الجهاز</span></div>' +
      nav +
      '<div class="lesson-notes"><label for="lessonNote">' + ic("recipe") + "ملاحظاتي على هذا الدرس</label>" +
      '<textarea id="lessonNote" data-note="' + l.id + '" placeholder="اكتب خلاصة، سؤالاً، أو تعديلاً على الصيغة…" maxlength="4000">' + esc(note) + "</textarea>" +
      '<div class="notes-status" id="noteStatus">' + (note ? "محفوظ محلياً" : "تُحفظ الملاحظات تلقائياً أثناء الكتابة") + "</div></div></div>";
  }

  /* ---------------- Page: Materials ---------------- */
  function materialMatches(m, q) {
    if (!q) return true;
    const n = normText(q);
    const hay = normText([m.name, m.inci, m.fr, (m.tags || []).join(" "), m.desc, catOf(m.cat).title].filter(Boolean).join(" "));
    return n.split(/\s+/).every(w => hay.includes(w));
  }

  function materialCard(m) {
    const c = catOf(m.cat);
    return '<a class="mat-card" href="#/material/' + m.id + '" style="--accent:' + esc(c.color) + '">' +
      '<div class="mat-top"><h3>' + esc(m.name) + "</h3>" + (isFav("material", m.id) ? '<span style="color:#c04f63">' + ic("heart") + "</span>" : "") + "</div>" +
      '<div class="mat-inci">' + esc(m.inci) + "</div>" +
      '<div class="mat-tag-row">' + (m.tags || []).slice(0, 3).map(t => '<span class="tag">' + esc(t) + "</span>").join("") + "</div>" +
      '<div class="mat-foot"><span class="cat-dot" style="--c:' + esc(c.color) + '"></span><span class="tiny muted">' + esc(c.title) + '</span><span class="use">' + esc(m.use || "—") + "</span></div></a>";
  }

  function viewMaterials(params, query) {
    const q0 = query.get("q") || "";
    const cat0 = query.get("cat") || "all";
    const list = D.materials;
    const cats = D.cats;
    const html = crumbs([{ label: "الرئيسية", href: "#/home" }, { label: "المواد الأولية" }]) +
      pageHead("المكتبة الفنية", "بنك <span class=\"accent\">المواد الأولية</span>", "تصنيف وظيفي، أسماء INCI، نسب استخدام، طور الإضافة، ومحاذير الصياغة. ابحث بالاسم العربي أو اللاتيني.",
        '<span class="tag tag-rose" style="padding:6px 12px">' + fmt(list.length) + " مادة</span>") +
      '<div class="toolbar"><div class="search-input-wrap">' + ic("search") + '<input class="input" id="matSearch" type="search" placeholder="ابحث: زبدة الشيا، Niacinamide، حافظة…" value="' + esc(q0) + '" autocomplete="off"></div>' +
      '<div class="result-count" id="matCount"></div></div>' +
      '<div class="chips scroll" style="margin-bottom:16px">' +
      '<button class="chip ' + (cat0 === "all" ? "is-active" : "") + '" data-mat-cat="all">كل العائلات <span class="count">' + fmt(list.length) + "</span></button>" +
      cats.map(c => {
        const n = list.filter(m => m.cat === c.id).length;
        return '<button class="chip ' + (cat0 === c.id ? "is-active" : "") + '" data-mat-cat="' + esc(c.id) + '"><span class="cat-dot" style="--c:' + esc(c.color) + '"></span>' + esc(c.title) + ' <span class="count">' + fmt(n) + "</span></button>";
      }).join("") + "</div>" +
      '<h2 class="sr-only">نتائج المواد الأولية</h2>' +
      '<div class="mat-grid" id="matResults"></div>';

    function apply() {
      const q = $("#matSearch") ? $("#matSearch").value : "";
      const active = $(".chip.is-active[data-mat-cat]");
      const cat = active ? active.getAttribute("data-mat-cat") : "all";
      let arr = list.filter(m => (cat === "all" || m.cat === cat) && materialMatches(m, q));
      arr.sort((a, b) => String(a.name).localeCompare(String(b.name), "ar"));
      const box = $("#matResults");
      if (box) box.innerHTML = arr.length ? arr.map(materialCard).join("") : '<div class="empty-state" style="grid-column:1/-1"><div class="es-ico">' + ic("search") + "</div><h2>لا توجد مواد مطابقة</h2><p>جرّب اسماً آخر أو أزل التصفية.</p></div>";
      const cnt = $("#matCount");
      if (cnt) cnt.textContent = fmt(arr.length) + " مادة";
    }
    function after() {
      apply();
      const inp = $("#matSearch");
      if (inp) inp.addEventListener("input", apply);
      $$(".chip[data-mat-cat]").forEach(ch => ch.addEventListener("click", () => {
        $$(".chip[data-mat-cat]").forEach(x => x.classList.remove("is-active"));
        ch.classList.add("is-active");
        apply();
        const url = "#/materials" + (ch.getAttribute("data-mat-cat") === "all" ? "" : "?cat=" + ch.getAttribute("data-mat-cat"));
        try { history.replaceState(null, "", url); } catch (e) {}
      }));
    }
    return { html: html, after: after };
  }

  /* ---------------- Page: Material ---------------- */
  function recipesUsingMaterial(m) {
    if (!m) return [];
    const inci = normText(m.inci);
    return D.recipes.filter(r => (r.phases || []).some(p => (p.items || []).some(it => {
      const a = normText(it.inci || "");
      const b = normText(it.name || "");
      return (inci && a && a === inci) || (inci && a && (a.includes(inci) || inci.includes(a))) || (b && normText(m.name) && b.includes(normText(m.name)));
    })));
  }

  function viewMaterial(params) {
    const m = matOf(params.id);
    if (!m) return notFound("المادة");
    const c = catOf(m.cat);
    const related = recipesUsingMaterial(m);
    const alts = (m.alt || []).map(matOf).filter(Boolean);
    const meta = [
      ["العائلة الوظيفية", c.title],
      ["نسبة الاستخدام", m.use || "—"],
      ["طور الإضافة", m.phase || "—"],
      ["قيمة HLB", m.hlb === null || m.hlb === undefined ? "—" : fmt(m.hlb, 1)],
      ["الذوبان", m.sol || "—"],
      ["المصدر", m.origin || "—"]
    ];
    return crumbs([{ label: "الرئيسية", href: "#/home" }, { label: "المواد الأولية", href: "#/materials" }, { label: m.name }]) +
      '<section class="detail-hero" style="--accent:' + esc(c.color) + '">' +
      '<div class="detail-hero-top"><div><span class="eyebrow">' + esc(c.title) + '</span><h1>' + esc(m.name) + "</h1>" +
      '<div class="fr">' + esc(m.fr || "") + '</div><div class="inci">' + esc(m.inci) + "</div></div>" +
      '<div class="detail-actions">' + favButton("material", m.id) + "</div></div>" +
      '<p class="lead">' + inline(m.desc || "") + "</p>" +
      '<div class="meta-grid">' + meta.map(x => '<div class="meta-item"><span>' + esc(x[0]) + "</span><strong class=\"" + (x[0] === "قيمة HLB" ? "mono" : "") + "\">" + esc(x[1]) + "</strong></div>").join("") + "</div></section>" +
      '<div class="detail-grid"><div>' +
      '<div class="panel"><h2>' + ic("sparkle") + "الدور والفوائد في التركيبة</h2><ul class=\"check-list\">" + (m.benefits || []).map(b => "<li>" + inline(b) + "</li>").join("") + "</ul></div>" +
      '<div class="panel" style="margin-top:16px"><h2>' + ic("thermometer") + "الإحساس والاستخدام</h2><p><strong>الإحساس:</strong> " + inline(m.feel || "—") + "</p><p><strong>طور الإضافة:</strong> " + esc(m.phase || "—") + " — <span>" + (m.phase === "A" ? "يضاف مع المرحلة الساخنة (مائية أو زيتية) حسب الذوبان." : m.phase === "B" ? "يضاف بعد التبريد إلى ما دون 40–45 °م." : m.phase === "C" ? "يضاف في نهاية التبريد، تحت 40 °م، للمواد الحساسة للحرارة." : "حسب نوع التركيبة وتعليمات المورد.") + "</span></p>" +
      (m.caution ? '<div class="callout callout-warn" style="margin-top:12px">' + ic("alert") + "<div><strong>محاذير الصياغة</strong><p>" + inline(m.caution) + "</p></div></div>" : "") +
      "</div>" +
      (m.algeria ? '<div class="panel" style="margin-top:16px"><h2>' + ic("globe") + "التوفر في السوق الجزائري</h2><p>" + inline(m.algeria) + "</p></div>" : "") +
      "</div><aside class=\"sticky-side\">" +
      '<div class="panel"><h2>' + ic("layers") + "بدائل ممكنة</h2>" +
      (alts.length ? '<div class="chips">' + alts.map(a => '<a class="chip" href="#/material/' + a.id + '">' + esc(a.name) + "</a>").join("") + "</div>" : '<p class="small muted">لا توجد بدائل مسجلة لهذه المادة في المكتبة.</p>') +
      '<div class="divider"></div><h2>' + ic("recipe") + "وصفات تستخدمها</h2>" +
      (related.length ? '<div class="chips">' + related.slice(0, 6).map(r => '<a class="chip" href="#/recipe/' + r.id + '">' + esc(r.title) + "</a>").join("") + "</div>" : '<p class="small muted">لم تُستخدم هذه المادة في وصفات المكتبة بعد.</p>') +
      "</div>" +
      '<div class="panel"><h2>' + ic("shield") + "قبل الاستخدام</h2><p class=\"small\">اطلب دائماً بطاقة السلامة (SDS) والبطاقة التقنية من المورد، وتأكد من نسبة الاستخدام القصوى والتشريع المحلي. جرّب على منطقة صغيرة قبل أي استعمال واسع.</p></div>" +
      "</aside></div>";
  }

  /* ---------------- Page: Favorites ---------------- */
  function viewFavorites() {
    const mats = Array.from(S.favs).filter(k => k.startsWith("material:")).map(k => MAT[k.split(":")[1]]).filter(Boolean);
    const recs = Array.from(S.favs).filter(k => k.startsWith("recipe:")).map(k => REC[k.split(":")[1]]).filter(Boolean);
    return crumbs([{ label: "الرئيسية", href: "#/home" }, { label: "المفضلة" }]) +
      pageHead("مكتبتي", "المفضلة", "المواد والوصفات التي حفظتها للرجوع السريع أثناء العمل.",
        '<span class="tag tag-rose" style="padding:6px 12px">' + fmt(mats.length + recs.length) + " عنصر</span>") +
      (mats.length + recs.length === 0 ? '<div class="empty-state"><div class="es-ico">' + ic("heart") + "</div><h2>لا توجد مفضلة بعد</h2><p>اضغط رمز القلب في أي مادة أو وصفة لحفظها هنا.</p><a class=\"btn btn-primary\" href=\"#/materials\">استكشف المواد</a></div>" :
        (mats.length ? '<section class="section" style="margin-top:0"><div class="section-head"><h2>' + ic("drop") + "مواد محفوظة</h2></div><div class=\"mat-grid\">" + mats.map(materialCard).join("") + "</div></section>" : "") +
        (recs.length ? '<section class="section"><div class="section-head"><h2>' + ic("recipe") + "وصفات محفوظة</h2></div><div class=\"grid-2\">" + recs.map(recipeCard).join("") + "</div></section>" : ""));
  }

  function notFound(kind) {
    return '<div class="empty-state"><div class="es-ico">' + ic("search") + "</div><h2>لم يتم العثور على " + esc(kind || "العنصر") + "</h2><p>قد يكون الرابط غير صحيح أو حُذف المحتوى.</p><a class=\"btn btn-primary\" href=\"#/home\">العودة للرئيسية</a></div>";
  }

  /* ---------------- Recipe card (shared with pages file) ---------------- */
  function recipeCard(r) {
    return '<a class="card card-hover" href="#/recipe/' + r.id + '" style="display:flex;flex-direction:column;gap:9px;padding:18px">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px"><div><span class="tag tag-rose">' + esc(recipeCatLabel(r.cat)) + '</span><h3 style="font-size:.95rem;margin-top:7px">' + esc(r.title) + '</h3><div class="tiny muted" style="direction:ltr;text-align:start">' + esc(r.fr || "") + "</div></div>" +
      (isFav("recipe", r.id) ? '<span style="color:#c04f63">' + ic("heart") + "</span>" : "") + "</div>" +
      '<p class="small muted" style="flex:1">' + inline(r.desc || "") + "</p>" +
      '<div class="module-meta"><span>' + ic("clock") + esc(r.time || "") + "</span><span>" + ic("flame") + esc(typeLabel(r.type)) + "</span><span>" + stars(r.diff) + "</span></div>" +
      '<div class="mat-foot" style="margin-top:2px"><span class="tiny muted">pH ' + esc(r.ph || "—") + '</span><span class="tiny muted" style="margin-inline-start:auto">' + fmt((r.phases || []).reduce((n, p) => n + (p.items || []).length, 0)) + " مكوناً</span></div></a>";
  }

  /* ---------------- Page: Menu ---------------- */
  function viewMenu() {
    const s = getSession() || {};
    const admin = isAdmin();
    const groups = NAV.map(g => ({ group: g.group, items: g.items }));
    if (admin) {
      groups.push({ group: "الإدارة", items: [{ href: "#/admin", icon: "shield", label: "لوحة الإدارة", key: "admin" }] });
    }
    const links = groups.map(g =>
      '<section class="section" style="margin-top:0">' +
      '<div class="section-head"><h2>' + esc(g.group) + '</h2></div>' +
      '<div class="card-grid">' + g.items.map(it =>
        '<a class="panel" href="' + it.href + '" data-nav="' + it.key + '" style="display:flex;align-items:center;gap:12px;padding:16px;color:inherit">' +
        '<span style="color:var(--brand-strong);display:inline-flex">' + ic(it.icon) + '</span>' +
        '<span style="flex:1"><strong style="display:block">' + esc(it.label) + '</strong>' +
        (it.count ? '<span class="tiny muted">' + fmt(it.count) + ' عنصراً</span>' : '') + '</span>' +
        ic("arrowLeft") + '</a>'
      ).join("") + '</div></section>'
    ).join("");

    const html = crumbs([{ label: "الرئيسية", href: "#/home" }, { label: "القائمة" }]) +
      pageHead("القائمة", "كل أقسام <span class='accent'>COSMADEDZ</span>", "اختر ما تريد فتحه. القائمة متاحة أيضاً من الشريط السفلي.") +
      '<div class="panel"><h2>' + ic("globe") + ' اللغة</h2>' +
      '<div class="lang-choice" id="menuLang">' +
      [["ar", "العربية", "AR"], ["en", "English", "EN"], ["fr", "Français", "FR"]].map(function (l) {
        return '<button class="lang-choice-btn" type="button" data-set-lang="' + l[0] + '"><span>' + l[1] + '</span><small>' + l[2] + '</small></button>';
      }).join("") + '</div>' +
      '<p class="tiny muted" style="margin-top:8px">تتغير لغة الواجهة والاتجاه فوراً. يبقى المحتوى العلمي بلغته الأصلية.</p></div>' +
      '<div class="panel"><h2>' + ic("user") + ' الحساب</h2>' +
      '<div class="result-list"><div><span>البريد</span><b dir="ltr">' + esc(s.email || "—") + '</b></div>' +
      '<div><span>الدور</span><b>' + (admin ? "مسؤول (Admin)" : "مستخدم مفعّل") + '</b></div>' +
      '<div><span>التقدم</span><b>' + overallPct() + '%</b></div></div>' +
      '<div class="btn-row" style="margin-top:12px"><a class="btn btn-soft" href="#/profile">' + ic("user") + ' حسابي</a>' +
      (admin ? '<a class="btn btn-primary" href="#/admin">' + ic("shield") + ' لوحة الإدارة</a>' : '') +
      '<button class="btn btn-ghost" id="menuLogout">' + ic("close") + ' تسجيل الخروج</button></div></div>' +
      links;
    return { html: html, after: function () {
      const b = $("#menuLogout");
      if (b) b.addEventListener("click", function () {
        if (!confirm(t("تسجيل الخروج من هذا الجهاز؟"))) return;
        logoutSession().then(function () {
          toast("تم تسجيل الخروج");
          go("#/login");
        });
      });
    }};
  }

  /* ---------------- Remaining pages are registered in app-pages.js ---------------- */
  PAGES.home = viewHome;
  PAGES.menu = viewMenu;
  PAGES.learn = viewLearn;
  PAGES.module = viewModule;
  PAGES.lesson = viewLesson;
  PAGES.materials = viewMaterials;
  PAGES.material = viewMaterial;
  PAGES.favorites = viewFavorites;

  /* ---------------- Shared API ---------------- */
  const API = {
    D, CAT, MAT, LSN, MOD, REC, MTH, QUIZ, S, store,
    byId, catOf, matOf, recipeOf, lessonOf, moduleOf, moduleLessons, modulePct,
    totalLessons, doneLessons, overallPct, nextLesson, passedQuizCount, isEligible,
    favKey, isFav, toggleFav, diffLabel, diffStars, stars, typeLabel, recipeCatLabel, phaseName,
    RECIPE_CATS, FALLBACK_CAT,
    esc, inline, fmt, clamp, ring, crumbs, pageHead, favButton, renderBlocks, ic, ICONS,
    toast, moduleColor, moduleCard, recipeCard, notFound, normText, searchAll,
    PAGES, renderRoute, go, saveLessons, saveQuiz, requestInstall,
    applyTheme, openSearch, closeSearch, openSidebar, closeSidebar,
    recipesUsingMaterial, materialCard, materialMatches, viewMaterials,
    AUTH, normEmail, getSession, setSession, clearSession, isAuthed, isAdmin,
    validateSession, logoutSession, isStatic,
    t: t, I18N: window.COSD_I18N
  };
  window.cosd = API;

  /* ---------------- Chrome bindings + init ---------------- */
  function bindChrome() {
    const menuBtn = $("#menuBtn"), scrim = $("#scrim"), closeBtn = $("#sidebarClose");
    if (menuBtn) menuBtn.addEventListener("click", () => {
      const sb = $("#sidebar");
      if (sb && sb.classList.contains("is-open")) closeSidebar(); else openSidebar();
    });
    if (scrim) scrim.addEventListener("click", closeSidebar);
    if (closeBtn) closeBtn.addEventListener("click", closeSidebar);

    const searchBtn = $("#searchBtn"), searchMobile = $("#searchMobile");
    if (searchBtn) searchBtn.addEventListener("click", openSearch);
    if (searchMobile) searchMobile.addEventListener("click", openSearch);
    const searchClose = $("#searchClose");
    if (searchClose) searchClose.addEventListener("click", closeSearch);
    const searchModal = $("#searchModal");
    if (searchModal) searchModal.addEventListener("click", e => { if (e.target === searchModal) closeSearch(); });
    const globalSearch = $("#globalSearch");
    if (globalSearch) globalSearch.addEventListener("input", e => {
      clearTimeout(searchTimer);
      const v = e.target.value;
      searchTimer = setTimeout(() => renderSearchResults(v), 120);
    });
    $$("#searchHints [data-search-term]").forEach(btn => btn.addEventListener("click", () => {
      const term = btn.getAttribute("data-search-term");
      if (globalSearch) { globalSearch.value = term; globalSearch.focus(); }
      renderSearchResults(term);
    }));
    document.addEventListener("click", e => {
      const link = e.target.closest("[data-search-close]");
      if (link) closeSearch();
    });

    const themeBtn = $("#themeBtn");
    if (themeBtn) themeBtn.addEventListener("click", () => {
      applyTheme(S.theme === "dark" ? "light" : "dark");
      toast(S.theme === "dark" ? "تم تفعيل الوضع الليلي" : "تم تفعيل الوضع النهاري");
    });

    document.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); return; }
      if (e.key === "Escape") {
        if (searchModal && !searchModal.hidden) closeSearch();
        else closeSidebar();
      }
    });

    document.addEventListener("click", e => {
      const fav = e.target.closest("[data-fav]");
      if (!fav) return;
      e.preventDefault();
      const raw = fav.getAttribute("data-fav");
      const i = raw.indexOf(":");
      const type = raw.slice(0, i), id = raw.slice(i + 1);
      const on = toggleFav(type, id);
      $$('[data-fav="' + raw.replace(/"/g, '\\"') + '"]').forEach(el => {
        el.classList.toggle("is-on", on);
        el.setAttribute("aria-pressed", String(on));
      });
      toast(on ? "تم الحفظ في المفضلة" : "تمت الإزالة من المفضلة");
    });

    document.addEventListener("click", e => {
      const btn = e.target.closest("[data-complete]");
      if (!btn) return;
      const id = btn.getAttribute("data-complete");
      if (S.lessons.has(id)) {
        S.lessons.delete(id);
        toast("أُلغي إكمال الدرس");
      } else {
        S.lessons.add(id);
        toast("أحسنت! تم إكمال الدرس");
      }
      saveLessons();
      const done = S.lessons.has(id);
      btn.classList.toggle("btn-primary", !done);
      btn.classList.toggle("btn-soft", done);
      btn.innerHTML = ic(done ? "checkCircle" : "check") + (done ? "تم إكمال الدرس — اضغط للتراجع" : "علّم الدرس كمكتمل");
    });

    document.addEventListener("input", e => {
      const note = e.target.closest("[data-note]");
      if (!note) return;
      const id = note.getAttribute("data-note");
      S.notes[id] = note.value;
      store.set("notes", S.notes);
      const st = $("#noteStatus");
      if (st) st.textContent = "محفوظ محلياً ✓";
    });

    document.addEventListener("change", e => {
      const chk = e.target.closest("[data-check]");
      if (!chk) return;
      const id = chk.getAttribute("data-check");
      S.checklist[id] = chk.checked;
      store.set("checklist", S.checklist);
      const item = chk.closest(".check-item");
      if (item) item.classList.toggle("is-checked", chk.checked);
      const boxes = $$("[data-check]");
      if (boxes.length) {
        const done = boxes.filter(b => b.checked).length;
        const bar = $("#gmpBar");
        if (bar) bar.style.width = Math.round(done / boxes.length * 100) + "%";
        const cnt = $("#gmpCount");
        if (cnt) cnt.textContent = fmt(done) + "/" + fmt(boxes.length);
      }
    });

    document.addEventListener("click", e => {
      const acc = e.target.closest("[data-acc]");
      if (!acc) return;
      const item = acc.closest(".acc-item");
      if (item) item.classList.toggle("is-open");
    });

    // install
    setupInstall();
    // offline indicator
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
  }

  let deferredPrompt = null;
  function showInstall(on) {
    ["#installTop", "#installSide"].forEach(sel => {
      const el = $(sel);
      if (el) el.hidden = !on;
    });
  }
  async function requestInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch (e) {}
      deferredPrompt = null;
      showInstall(false);
    } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      toast("على iPhone: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»");
    } else {
      toast("افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»");
    }
  }
  function setupInstall() {
    window.addEventListener("beforeinstallprompt", e => {
      e.preventDefault();
      deferredPrompt = e;
      showInstall(true);
    });
    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      showInstall(false);
      toast("تم تثبيت COSMADEDZ على جهازك");
    });
    ["#installTop", "#installSide"].forEach(sel => {
      const el = $(sel);
      if (el) el.addEventListener("click", async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          try { await deferredPrompt.userChoice; } catch (e) {}
          deferredPrompt = null;
          showInstall(false);
        } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
          toast("على iPhone: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»");
        } else {
          toast("افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»");
        }
      });
    });
  }
  function updateOnline() {
    const el = $("#offlineState");
    if (!el) return;
    el.textContent = navigator.onLine ? t("جاهز للعمل دون إنترنت") : t("أنت الآن دون اتصال — كل شيء يعمل");
    el.parentElement.style.color = navigator.onLine ? "" : "var(--gold)";
  }

  function hideSplash() {
    const sp = $("#splash");
    if (!sp) return;
    setTimeout(() => {
      sp.classList.add("is-hidden");
      setTimeout(() => { try { sp.remove(); } catch (e) {} }, 700);
    }, 900);
  }

  function registerSW() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });
    navigator.serviceWorker.register("sw.js").then(reg => {
      const offer = worker => {
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            const bar = $("#updateBar");
            if (bar) bar.hidden = false;
            const btn = $("#updateBtn");
            if (btn) btn.addEventListener("click", () => worker.postMessage({ type: "SKIP_WAITING" }), { once: true });
          }
        });
      };
      if (reg.waiting) offer(reg.waiting);
      reg.addEventListener("updatefound", () => offer(reg.installing));
    }).catch(() => {});
  }

  function applyModeChrome() {
    const badge = $("#staticBadge");
    if (badge) {
      badge.hidden = !STATIC_MODE;
      badge.textContent = t("نسخة عرض ثابتة");
    }
  }

  function bootOnServer() {
    // Full server mode: enforce activation before any study page.
    if (!location.hash) {
      const start = isAuthed() ? "#/home" : "#/login";
      try { history.replaceState(null, "", start); } catch (e) { location.hash = start; }
    } else if (!isAuthed() && location.hash.replace(/^#/, "").split("?")[0] !== "/login") {
      try { history.replaceState(null, "", "#/login"); } catch (e) { location.hash = "#/login"; }
    }
    renderRoute();
    hideSplash();
    validateSession().then(function (ok) {
      if (!ok && !isAuthed()) {
        if (parseRoute().path !== "/login") {
          try { location.hash = "#/login"; } catch (e) {}
        }
        return;
      }
      renderNav();
      if (parseRoute().path === "/login" && isAuthed()) {
        try { location.hash = "#/home"; } catch (e) {}
      }
    });
  }

  function bootStatic() {
    // Static hosting: no backend. Content is readable, activation is not.
    if (!location.hash || /^#\/?$/.test(location.hash)) {
      try { history.replaceState(null, "", "#/home"); } catch (e) { location.hash = "#/home"; }
    }
    renderRoute();
    renderNav();
    hideSplash();
  }

  function init() {
    if (window.COSD_I18N) window.COSD_I18N.init();
    applyTheme(S.theme);
    const legacy = getSession();
    if (legacy && !legacy.token) clearSession();
    renderNav();
    bindChrome();
    registerSW();
    const y = $("#sideYear");
    if (y) y.textContent = "© " + new Date().getFullYear();
    window.addEventListener("hashchange", renderRoute);
    window.addEventListener("cosd:lang", function () {
      try { renderNav(); } catch (e) {}
      try { updateOnline(); } catch (e) {}
      try { applyModeChrome(); } catch (e) {}
      try { renderRoute(); } catch (e) {}
      const q = $("#globalSearch");
      if (q) renderSearchResults(q.value || "");
    });
    probeServer().then(function (serverReady) {
      STATIC_MODE = !serverReady;
      document.documentElement.setAttribute("data-mode", STATIC_MODE ? "static" : "server");
      try { applyModeChrome(); } catch (e) {}
      if (STATIC_MODE) bootStatic(); else bootOnServer();
    }).catch(function () {
      STATIC_MODE = true;
      document.documentElement.setAttribute("data-mode", "static");
      try { applyModeChrome(); } catch (e) {}
      bootStatic();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
