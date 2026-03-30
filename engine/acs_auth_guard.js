// ============================================================
// 🔐 ACS AUTH GUARD v3.0 (PRODUCTION READY)
// Global Session Protection Layer
// ============================================================

const ACS_API_BASE = "https://api.aviationcapitalsim.com";

// 🔹 Estado global
window.ACS_SESSION = null;
window.ACS_USER = null;

// 🔹 Función principal (bloqueante)
async function ACS_REQUIRE_AUTH() {

  let attempts = 0;
  const MAX_ATTEMPTS = 3;

  async function checkSession() {

    try {

      const res = await fetch(`${ACS_API_BASE}/v1/session`, {
        method: "GET",
        credentials: "include"
      });

      // 🔴 Caso 1: sesión inválida (401 / backend reject)
      if (res.status === 401) {
        throw new Error("UNAUTHORIZED");
      }

      // 🔴 Caso 2: backend caído o error server
      if (!res.ok) {
        throw new Error("SERVER_ERROR");
      }

      const data = await res.json();

      if (!data.ok) {
        throw new Error("INVALID_SESSION");
      }

      // ✅ SESSION OK
      console.log("🔐 SESSION OK:", data);

      window.ACS_SESSION = data;
      window.ACS_USER = data.user;

      return true;

    } catch (err) {

      attempts++;

      // 🔁 Retry SOLO para errores temporales
      if (err.message === "SERVER_ERROR" && attempts < MAX_ATTEMPTS) {
        console.warn(`🔁 Retry session check (${attempts})`);
        await new Promise(r => setTimeout(r, 400));
        return checkSession();
      }

      console.warn("🚫 AUTH FAILED:", err.message);

      ACS_HANDLE_UNAUTHORIZED();

      return false;
    }
  }

  return await checkSession();
}

// ============================================================
// 🔐 Manejo centralizado de logout / invalid session
// ============================================================

function ACS_HANDLE_UNAUTHORIZED() {

  // Limpieza en memoria (NO localStorage)
  window.ACS_SESSION = null;
  window.ACS_USER = null;

  // Evitar loop si ya estamos en login
  if (window.location.pathname.includes("login.html")) {
    return;
  }

  // Redirección limpia
  window.location.href = "/login.html";
}
