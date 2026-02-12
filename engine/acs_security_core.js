/* ============================================================
   🔐 ACS SECURITY CORE — CENTRAL SESSION GUARD
   ------------------------------------------------------------
   Version: 1.0 DEV HARDENING
   Date: 11 FEB 2026
   Author: ACS System Core

   PURPOSE:
   - Centralized session validation
   - Expiration control
   - Corruption detection
   - Public page whitelist
   - Base for future runtime lock

   ============================================================ */

(function () {

  /* ============================================================
     🔎 CONFIGURATION
     ============================================================ */

  const SESSION_KEY = "ACS_activeUser";
  const SESSION_MAX_AGE = 1000 * 60 * 60 * 6; // 6 HOURS

  const PUBLIC_PAGES = [
    "index.html",
    "login.html",
    "register.html",
    "support.html",
    "terms.html"
  ];

  const currentPage = window.location.pathname.split("/").pop() || "index.html";


  /* ============================================================
     🌍 ALLOW PUBLIC PAGES
     ============================================================ */

  if (PUBLIC_PAGES.includes(currentPage)) {
    return;
  }


  /* ============================================================
     🔐 SESSION VALIDATION
     ============================================================ */

  const raw = localStorage.getItem(SESSION_KEY);

  if (!raw) {
    redirectToLogin();
    return;
  }

  let user;

  try {
    user = JSON.parse(raw);
  } catch (e) {
    invalidateSession();
    return;
  }

  /* ============================================================
     🧪 STRUCTURAL VALIDATION
     ============================================================ */

  if (
    !user ||
    typeof user !== "object" ||
    !user.userId ||
    !user.email
  ) {
    invalidateSession();
    return;
  }

  /* ============================================================
     ⏳ EXPIRATION CONTROL
     ============================================================ */

  if (!user.loginAt) {
    invalidateSession();
    return;
  }

  const sessionAge = Date.now() - user.loginAt;

  if (sessionAge > SESSION_MAX_AGE) {
    invalidateSession();
    return;
  }

  /* ============================================================
   🔄 LIVE SESSION WATCHER (DEV SAFE)
   - Verifica sesión cada 5 segundos
   - Solo redirige si sesión desaparece o expira
   ============================================================ */

setInterval(() => {

  const rawCheck = localStorage.getItem(SESSION_KEY);

  if (!rawCheck) {
    invalidateSession();
    return;
  }

  try {
    const userCheck = JSON.parse(rawCheck);

    if (!userCheck.loginAt) {
      invalidateSession();
      return;
    }

    const age = Date.now() - userCheck.loginAt;

    if (age > SESSION_MAX_AGE) {
     invalidateSession();
    }

  } catch {
    invalidateSession();
  }

}, 5000);
   
  /* ============================================================
     ✅ SESSION OK
     ============================================================ */

  // Future hook for runtime master lock
  // initializeRuntimeLock();

  return;


  /* ============================================================
     🧹 HELPERS
     ============================================================ */

  function invalidateSession() {
    localStorage.removeItem(SESSION_KEY);
    redirectToLogin();
  }

  function redirectToLogin() {
    window.location.href = "login.html";
  }

})();
