/* ============================================================
   🔐 ACS SECURITY CORE — CENTRAL SESSION GUARD
   ------------------------------------------------------------
   Version: 1.3 RAILWAY COMPAT MODE (TRANSITION SAFE)
   Date: 24 MAR 2026

   ✔ Compatible con Railway Sessions (token)
   ✔ Mantiene compatibilidad legacy (localStorage)
   ✔ NO bloquea sistema nuevo
   ✔ NO rompe flujo actual
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
     🔐 CORE CHECK (RAILWAY + LEGACY)
     ============================================================ */

  function sessionIsValid() {

    // 🟢 1. LOCAL SESSION (legacy support)
    const raw = localStorage.getItem(SESSION_KEY);

    if (raw) {
      try {
        const user = JSON.parse(raw);

        if (
          user &&
          typeof user === "object" &&
          user.userId &&
          user.email &&
          user.loginAt &&
          (Date.now() - user.loginAt) <= SESSION_MAX_AGE
        ) {
          return true;
        }
      } catch {}
    }

    // 🟡 2. TOKEN SESSION (Railway)
    if (window.ACS_TOKEN && typeof window.ACS_TOKEN === "string") {
      return true;
    }

    // 🔴 3. NO SESSION
    return false;
  }

  function invalidateSession() {

    // 🔴 limpiar solo cache local
    localStorage.removeItem(SESSION_KEY);

    // ⚠️ NO borrar token (backend manda)

    redirectToLogin();
  }

  function redirectToLogin() {
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
     ✅ INITIAL ENFORCE (SAFE)
     ============================================================ */

  // ⚠️ SOLO validar si NO hay token (Railway manda)
  if (!window.ACS_TOKEN) {
    enforceNow();
  }

  /* ============================================================
     🔄 LIVE ENFORCE (SINGLE INSTANCE SAFE)
     ============================================================ */

  if (!window.__ACS_SESSION_GUARD__) {

    window.__ACS_SESSION_GUARD__ = {
      intervalId: null,
      armed: true
    };

    // 🔁 Interval fallback
    window.__ACS_SESSION_GUARD__.intervalId = setInterval(() => {
      if (window.__ACS_SESSION_GUARD__ && window.__ACS_SESSION_GUARD__.armed) {
        enforceNow();
      }
    }, WATCH_INTERVAL);

    // ⚡ Eventos reales (mejor que polling)
    window.addEventListener("click", () => enforceNow(), true);
    window.addEventListener("focus", () => enforceNow(), true);
    window.addEventListener("pageshow", () => enforceNow(), true);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) enforceNow();
    }, true);

    // 🔄 Navegación SPA safe
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
      // fallback silencioso
    }
  }

})();
