// ============================================================
// 🔐 ACS AUTH GUARD v2.0 (STABLE SESSION)
// Evita rebotes post-login
// ============================================================

async function ACS_REQUIRE_AUTH() {

  let attempts = 0;
  const MAX_ATTEMPTS = 3;

  async function checkSession() {

    try {

      const res = await fetch("https://api.aviationcapitalsim.com/v1/session", {
        method: "GET",
        credentials: "include"
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error("NO_SESSION");
      }

      console.log("🔐 SESSION OK:", data);

      window.ACS_SESSION = data;
      window.ACS_USER = data.user;

      return true;

    } catch (err) {

      attempts++;

      if (attempts < MAX_ATTEMPTS) {
        console.warn(`🔁 Retry session check (${attempts})`);
        await new Promise(r => setTimeout(r, 300));
        return checkSession();
      }

      console.warn("🚫 NO SESSION");

const isLoginPage = window.location.pathname.includes("login");

if (!isLoginPage) {
  console.warn("➡️ Redirecting to login");
  window.location.href = "/login.html";
}

return false;
    }
  }

  return checkSession();
}
