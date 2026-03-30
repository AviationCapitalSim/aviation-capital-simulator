// ============================================================
// 🔐 ACS AUTH GUARD — SIMPLE & STABLE (RESET)
// ============================================================

const ACS_API_BASE = "https://api.aviationcapitalsim.com";

window.ACS_SESSION = null;
window.ACS_USER = null;

async function ACS_REQUIRE_AUTH() {

  try {

    console.log("🔍 Checking session...");

    const res = await fetch(`${ACS_API_BASE}/v1/session`, {
      method: "GET",
      credentials: "include"
    });

    console.log("📡 Response status:", res.status);

    if (res.status === 401) {
      console.warn("🚫 Unauthorized");
      return redirectToLogin();
    }

    if (!res.ok) {
      console.warn("⚠️ Server error");
      return redirectToLogin();
    }

    const data = await res.json();

    console.log("📦 Session data:", data);

    if (!data.ok) {
      return redirectToLogin();
    }

    window.ACS_SESSION = data;
    window.ACS_USER = data.user;

    console.log("✅ SESSION OK");

    return true;

  } catch (err) {

    console.error("🔥 FETCH ERROR:", err);

    return redirectToLogin();
  }
}

function redirectToLogin() {

  if (!window.location.pathname.includes("login.html")) {
    window.location.href = "/login.html";
  }

  return false;
}
