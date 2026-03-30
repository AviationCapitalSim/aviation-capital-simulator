// ============================================================
// 🔐 ACS AUTH GUARD v1.0
// Protege acceso a páginas (frontend)
// ============================================================

async function ACS_REQUIRE_AUTH() {

  try {

    const res = await fetch("https://api.aviationcapitalsim.com/v1/auth/session", {
      method: "GET",
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error("NO_SESSION");
    }

    console.log("🔐 SESSION OK:", data);

    // opcional: exponer sesión global
    window.ACS_SESSION = data;

  } catch (err) {

    console.warn("🚫 NO SESSION → redirect to login");

    window.location.href = "/login.html";
  }
}
