/* ============================================================
   🧨 ACS MASTER RESET ENGINE — v2.0 (FULL WIPE)
   ------------------------------------------------------------
   Goal:
   - BORRAR ABSOLUTAMENTE TODO ACS del navegador y dejarlo en cero.
   - Incluye: localStorage, sessionStorage, CacheStorage, SW, IndexedDB.
   - Diseñado para ejecutarse desde ACS Internal Monitor.
   ------------------------------------------------------------
   Notes:
   - Esto también borrará usuarios (ACS_users) y sesión (ACS_activeUser).
   - Tras ejecutar, redirige a ../index.html
   ============================================================ */

console.log("🧨 ACS MASTER RESET ENGINE — v2.0 Loaded");

window.ACS_MasterReset = async function ACS_MasterReset() {

  const report = {
    ok: true,
    steps: [],
    errors: [],
    ts: new Date().toISOString()
  };

  function step(msg){ report.steps.push(msg); console.log(msg); }
  function fail(msg, err){
    report.ok = false;
    report.errors.push(`${msg}${err ? " — " + (err.message || String(err)) : ""}`);
    console.warn(msg, err);
  }

  /* ============================================================
     1) localStorage + sessionStorage
     ============================================================ */
  try{
    const lsCount = localStorage.length;
    localStorage.clear();
    step(`✔ localStorage cleared (${lsCount} keys)`);
  }catch(e){ fail("✖ localStorage clear failed", e); }

  try{
    const ssCount = sessionStorage.length;
    sessionStorage.clear();
    step(`✔ sessionStorage cleared (${ssCount} keys)`);
  }catch(e){ fail("✖ sessionStorage clear failed", e); }

  /* ============================================================
     2) CacheStorage (PWA caches)
     ============================================================ */
  try{
    if (window.caches && caches.keys) {
      const keys = await caches.keys();
      for (const k of keys) {
        await caches.delete(k);
      }
      step(`✔ caches cleared (${keys.length} caches)`);
    } else {
      step("ℹ caches API not available");
    }
  }catch(e){ fail("✖ caches clear failed", e); }

  /* ============================================================
     3) Service Worker unregister
     ============================================================ */
  try{
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        await r.unregister();
      }
      step(`✔ service workers unregistered (${regs.length})`);
    } else {
      step("ℹ serviceWorker API not available");
    }
  }catch(e){ fail("✖ service worker unregister failed", e); }

  /* ============================================================
     4) IndexedDB wipe (si el navegador permite enumeración)
     ============================================================ */
  try{
    if (window.indexedDB) {

      // browsers modernos: indexedDB.databases()
      if (indexedDB.databases) {
        const dbs = await indexedDB.databases();
        const names = (dbs || []).map(d => d && d.name).filter(Boolean);

        for (const name of names) {
          await new Promise((resolve) => {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
            req.onblocked = () => resolve(false);
          });
        }

        step(`✔ indexedDB cleared (${names.length} dbs)`);
      } else {
        step("ℹ indexedDB.databases() not available (skipped enumeration)");
      }

    } else {
      step("ℹ indexedDB not available");
    }
  }catch(e){ fail("✖ indexedDB wipe failed", e); }

  /* ============================================================
     5) Signal + redirect
     ============================================================ */
  try{
    // Señal útil para otras pestañas (si quedara alguna viva)
    try{ localStorage.setItem("acs_reset", String(Date.now())); }catch(_){}

    step("✔ reset signal emitted");

    // Redirigir a inicio (nuevo juego / login)
    setTimeout(() => {
      window.location.href = "../index.html";
    }, 350);

  }catch(e){ fail("✖ redirect failed", e); }

  return report;
};
