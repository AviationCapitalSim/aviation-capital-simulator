/* ============================================================
   🧨 ACS MASTER RESET ENGINE — v3.0 GLOBAL
   ------------------------------------------------------------
   GLOBAL HARD RESET
   Compatible:
   Safari / Chrome / iOS / Android / Mac / PC
   ------------------------------------------------------------
   Purpose
   - Bloquear engines
   - Notificar otras pestañas
   - Limpiar absolutamente todo
   - Reiniciar ACS
   ============================================================ */

console.log("🧨 ACS MASTER RESET ENGINE — v3 GLOBAL LOADED");

window.ACS_MasterReset = async function ACS_MasterReset() {

  const report = {
    ok: true,
    steps: [],
    errors: [],
    ts: new Date().toISOString()
  };

  function step(msg){
    report.steps.push(msg);
    console.log(msg);
  }

  function fail(msg, err){
    report.ok = false;
    report.errors.push(msg);
    console.warn(msg, err);
  }


/* ============================================================
   0) GLOBAL RESET SIGNAL
   ============================================================ */

try {

  const resetSignal = String(Date.now());

  localStorage.setItem("ACS_SYSTEM_RESET", resetSignal);
  sessionStorage.setItem("ACS_SYSTEM_RESET", resetSignal);

  step("✔ GLOBAL RESET SIGNAL EMITTED");

} catch(e) {
  fail("✖ reset signal failed", e);
}


/* ============================================================
   1) CROSS TAB RESET NOTIFICATION
   ============================================================ */

try {

  if (window.BroadcastChannel) {

    const bc = new BroadcastChannel("ACS_SYSTEM");

    bc.postMessage({
      type: "ACS_SYSTEM_RESET",
      ts: Date.now()
    });

    bc.close();

    step("✔ broadcast reset sent");

  } else {

    step("ℹ BroadcastChannel not supported");

  }

} catch(e) {
  fail("✖ broadcast failed", e);
}


/* ============================================================
   2) CLEAR LOCAL STORAGE
   ============================================================ */

try {

  const lsCount = localStorage.length;

  localStorage.clear();

  step(`✔ localStorage cleared (${lsCount} keys)`);

} catch(e) {
  fail("✖ localStorage clear failed", e);
}


/* ============================================================
   3) CLEAR SESSION STORAGE
   ============================================================ */

try {

  const ssCount = sessionStorage.length;

  sessionStorage.clear();

  step(`✔ sessionStorage cleared (${ssCount} keys)`);

} catch(e) {
  fail("✖ sessionStorage clear failed", e);
}


/* ============================================================
   4) CACHE STORAGE
   ============================================================ */

try {

  if (window.caches && caches.keys) {

    const keys = await caches.keys();

    for (const k of keys) {
      await caches.delete(k);
    }

    step(`✔ caches cleared (${keys.length})`);

  } else {

    step("ℹ caches API not available");

  }

} catch(e) {
  fail("✖ caches clear failed", e);
}


/* ============================================================
   5) SERVICE WORKERS
   ============================================================ */

try {

  if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {

    const regs = await navigator.serviceWorker.getRegistrations();

    for (const r of regs) {
      await r.unregister();
    }

    step(`✔ service workers removed (${regs.length})`);

  } else {

    step("ℹ serviceWorker API not available");

  }

} catch(e) {
  fail("✖ service worker unregister failed", e);
}


/* ============================================================
   6) INDEXED DB
   ============================================================ */

try {

  if (window.indexedDB && indexedDB.databases) {

    const dbs = await indexedDB.databases();

    const names = (dbs || []).map(d => d && d.name).filter(Boolean);

    for (const name of names) {

      await new Promise(resolve => {

        const req = indexedDB.deleteDatabase(name);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
        req.onblocked = () => resolve(false);

      });

    }

    step(`✔ indexedDB cleared (${names.length})`);

  } else {

    step("ℹ indexedDB enumeration unavailable");

  }

} catch(e) {
  fail("✖ indexedDB wipe failed", e);
}


/* ============================================================
   7) FINAL REDIRECT
   ============================================================ */

step("✔ redirecting to index");

setTimeout(() => {

  window.location.href = "../index.html";

}, 500);


return report;

};
