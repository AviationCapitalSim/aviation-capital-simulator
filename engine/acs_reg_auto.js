/* ============================================================
   === ACS AUTO REGISTRATION GENERATOR — v1.0 ==================
   ------------------------------------------------------------
   Usa getRegistrationPrefix() del Registration Manager
   Asigna formato realista según país
   Se usa en NEW y USED aircraft
   ============================================================ */

function ACS_generateRegistration() {
  const prefix = getRegistrationPrefix();  // EC-, N-, EX-, PR-, etc.

  // 🇺🇸 USA – sistema especial
  if (prefix === "N-") {
    const num = Math.floor(100 + Math.random() * 900);
    const letters = randomLetters(2);
    return `N${num}${letters}`;
  }

  // 🌍 resto del mundo
  return prefix + randomLetters(3);
}

function randomLetters(n) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < n; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}
