/* ============================================================
   🔐 ACS SECURITY CORE — CENTRAL SESSION GUARD
   ------------------------------------------------------------
   Version: 1.2 DEV HARDENING (LIVE SAFE)
   Date: 12 FEB 2026

   Fix:
   - No depende solo de setInterval
   - Revalida sesión en eventos reales (click/focus/visibility/history)
   - Evita múltiples watchers
   ============================================================ */

(function () {

  /* ============================================================
     🔎 CONFIGURATION
     ============================================================ */

  const SESSION_KEY = "ACS_activeUser";
  const SESSION_MAX_AGE = 1000 * 60 * 60 * 6; // 6 HOURS
  const WATCH_INTERVAL = 5000;

  const PUBLIC_PAGES = [
    "index.html",
    "login.html",
    "register.html",
    "support.html",
    "terms.html"
  ];

  const currentPage =
    window.location.pathname.split("/").pop() || "index.html";

  /* ============================================================
     🌍 ALLOW PUBLIC PAGES
     ============================================================ */

  if (PUBLIC_PAGES.includes(currentPage)) {
    return;
  }

  /* ============================================================
     🔐 CORE CHECK (single source)
     ============================================================ */

  function sessionIsValid() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;

    let user;
    try {
      user = JSON.parse(raw);
    } catch {
      return false;
    }

    if (!user || typeof user !== "object") return false;
    if (!user.userId || !user.email) return false;
    if (!user.loginAt) return false;

    const age = Date.now() - user.loginAt;
    if (age > SESSION_MAX_AGE) return false;

    return true;
  }

  function invalidateSession() {
    localStorage.removeItem(SESSION_KEY);
    redirectToLogin();
  }

  function redirectToLogin() {
    // evita bucles raros
    if (!window.location.pathname.includes("login.html")) {
      window.location.href = "login.html";
    }
  }

  function enforceNow() {
    if (!sessionIsValid()) {
      invalidateSession();
      return false;
    }
    return true;
  }

  /* ============================================================
     ✅ INITIAL ENFORCE (on load)
     ============================================================ */

  enforceNow();

  /* ============================================================
     🔄 LIVE ENFORCE (SINGLE INSTANCE SAFE)
     ============================================================ */

  if (!window.__ACS_SESSION_GUARD__) {

    window.__ACS_SESSION_GUARD__ = {
      intervalId: null,
      armed: true
    };

    // 1) Interval watcher (backup)
    window.__ACS_SESSION_GUARD__.intervalId = setInterval(() => {
      if (window.__ACS_SESSION_GUARD__ && window.__ACS_SESSION_GUARD__.armed) {
        enforceNow();
      }
    }, WATCH_INTERVAL);

    // 2) Enforce on user actions (no molesta y es inmediato)
    window.addEventListener("click", () => enforceNow(), true);
    window.addEventListener("focus", () => enforceNow(), true);
    window.addEventListener("pageshow", () => enforceNow(), true);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) enforceNow();
    }, true);

    // 3) Enforce on history navigation (si hay SPA / pushState)
    try {
      const _push = history.pushState;
      history.pushState = function () {
        const r = _push.apply(this, arguments);
        enforceNow();
        return r;
      };

      const _replace = history.replaceState;
      history.replaceState = function () {
        const r = _replace.apply(this, arguments);
        enforceNow();
        return r;
      };

      window.addEventListener("popstate", () => enforceNow(), true);
    } catch {
      // si el browser bloquea override, no pasa nada: seguimos con interval + eventos
    }
  }

})();
