/* ============================================================
   🔐 ACS SECURITY CORE — CENTRAL SESSION GUARD
   ------------------------------------------------------------
   Version: 1.1 DEV HARDENING STABLE
   Date: 12 FEB 2026
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
     🔐 INITIAL SESSION VALIDATION
     ============================================================ */

  const raw = localStorage.getItem(SESSION_KEY);

  if (!raw) {
    return redirectToLogin();
  }

  let user;

  try {
    user = JSON.parse(raw);
  } catch {
    return invalidateSession();
  }

  if (
    !user ||
    typeof user !== "object" ||
    !user.userId ||
    !user.email ||
    !user.loginAt
  ) {
    return invalidateSession();
  }

  const sessionAge = Date.now() - user.loginAt;

  if (sessionAge > SESSION_MAX_AGE) {
    return invalidateSession();
  }

  /* ============================================================
     🔄 LIVE SESSION WATCHER (SINGLE INSTANCE SAFE)
     ============================================================ */

  if (!window.__ACS_SESSION_WATCHER__) {

    window.__ACS_SESSION_WATCHER__ = setInterval(() => {

      const rawCheck = localStorage.getItem(SESSION_KEY);

      if (!rawCheck) {
        return invalidateSession();
      }

      try {

        const userCheck = JSON.parse(rawCheck);

        if (!userCheck.loginAt) {
          return invalidateSession();
        }

        const age = Date.now() - userCheck.loginAt;

        if (age > SESSION_MAX_AGE) {
          return invalidateSession();
        }

      } catch {
        return invalidateSession();
      }

    }, WATCH_INTERVAL);

  }

  /* ============================================================
     🧹 HELPERS
     ============================================================ */

  function invalidateSession() {
    localStorage.removeItem(SESSION_KEY);
    redirectToLogin();
  }

  function redirectToLogin() {
    if (!window.location.pathname.includes("login.html")) {
      window.location.href = "login.html";
    }
  }

})();
