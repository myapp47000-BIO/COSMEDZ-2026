/* ============================================================
   COSMADEDZ — Boot guard
   Loaded before the app scripts. If the application never
   boots (stale cache, blocked asset, old service worker), it
   shows an actionable recovery panel instead of a frozen
   splash screen.
   ============================================================ */
(function () {
  "use strict";

  var TIMEOUT = 15000;
  var POLL = 400;
  var timer = null;
  var poll = null;
  var shown = false;

  function booted() {
    return !!(window.cosd && window.cosd.PAGES && window.cosd.PAGES.login && window.COSD_I18N);
  }

  function clearTimers() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (poll) { clearInterval(poll); poll = null; }
  }

  function removePanel() {
    var el = document.getElementById("bootGuardPanel");
    if (el && el.parentNode) el.parentNode.removeChild(el);
    shown = false;
  }

  function clearSiteData() {
    var jobs = [];
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        jobs.push(navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (reg) { return reg.unregister().catch(function () {}); }));
        }).catch(function () {}));
      }
    } catch (e) {}
    try {
      if (window.caches && caches.keys) {
        jobs.push(caches.keys().then(function (keys) {
          return Promise.all(keys.map(function (key) { return caches.delete(key).catch(function () {}); }));
        }).catch(function () {}));
      }
    } catch (e) {}
    return Promise.all(jobs);
  }

  function reloadFresh() {
    var url = location.pathname + "?refresh=" + Date.now() + (location.hash || "");
    clearSiteData().then(function () {
      location.replace(url);
    }, function () {
      location.replace(url);
    });
  }

  function buildPanel() {
    var panel = document.createElement("div");
    panel.id = "bootGuardPanel";
    panel.setAttribute("role", "alert");
    panel.dir = "rtl";
    panel.style.cssText = [
      "margin:22px auto 0", "max-width:360px", "padding:16px 18px",
      "border-radius:16px", "background:#fffaf7", "color:#4a2f39",
      "border:1px solid rgba(183,110,121,.35)",
      "box-shadow:0 14px 40px rgba(58,32,42,.18)",
      "font-family:inherit", "font-size:.86rem", "line-height:1.75",
      "text-align:center"
    ].join(";");

    var title = document.createElement("strong");
    title.style.cssText = "display:block;margin-bottom:6px;font-size:.95rem";
    title.textContent = "تعذر تحميل التطبيق بالكامل";
    panel.appendChild(title);

    var hint = document.createElement("p");
    hint.style.cssText = "margin:0 0 12px;color:#6b4b56";
    hint.textContent = "قد تكون نسخة قديمة محفوظة في المتصفح. اضغط الزر لإعادة التحميل وتحديث الملفات.";
    panel.appendChild(hint);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "إعادة التحميل وتحديث النسخة";
    btn.style.cssText = [
      "display:inline-block", "padding:10px 18px", "border:0", "border-radius:100px",
      "background:#b76e79", "color:#fff", "font:inherit", "font-weight:700",
      "cursor:pointer"
    ].join(";");
    btn.addEventListener("click", function () {
      btn.disabled = true;
      btn.textContent = "جارٍ التحديث…";
      reloadFresh();
    });
    panel.appendChild(btn);

    var en = document.createElement("p");
    en.style.cssText = "margin:10px 0 0;font-size:.72rem;color:#8a6b76;direction:ltr";
    en.textContent = "Stuck? Reload to fetch the latest version.";
    panel.appendChild(en);

    panel.__retry = function () {
      btn.disabled = false;
      btn.textContent = "إعادة التحميل وتحديث النسخة";
    };
    return panel;
  }

  function showPanel() {
    if (booted()) return;
    var existing = document.getElementById("bootGuardPanel");
    if (existing) return;
    var host = document.getElementById("splash");
    if (!host) {
      host = document.createElement("div");
      host.style.cssText = "position:fixed;inset:auto 0 0 0;z-index:99999;display:flex;justify-content:center;padding:12px";
      document.body.appendChild(host);
    }
    host.appendChild(buildPanel());
    shown = true;
  }

  function check() {
    if (booted()) {
      clearTimers();
      removePanel();
      return true;
    }
    return false;
  }

  function start() {
    if (check()) return;
    poll = setInterval(check, POLL);
    timer = setTimeout(function () {
      clearTimers();
      if (!check()) showPanel();
    }, TIMEOUT);
  }

  window.cosdRecover = reloadFresh;

  window.addEventListener("error", function () {
    // A failed script load (404/HTML served as JS) leaves the app unbooted;
    // surface the recovery panel early instead of waiting the full timeout.
    setTimeout(function () { if (!check() && shown === false && document.readyState === "complete") showPanel(); }, 1200);
  }, true);

  window.addEventListener("online", function () {
    if (shown && !booted()) {
      var panel = document.getElementById("bootGuardPanel");
      if (panel && panel.__retry) panel.__retry();
    }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
