/* ============================================================
   🟦 ACS MY AIRCRAFT — BACKEND AUTHORITY v1.1
   ------------------------------------------------------------
   File: engine/my_aircraft.js
   Date: 02 JUN 2026

   Purpose:
   - Airbus OCC / ACS Fleet Control Center
   - Read airline fleet from PostgreSQL backend authority
   - Render real aircraft_fleet records
   - Read C/D maintenance authority from backend payload
   - No localStorage authority
   - No frontend fleet creation
   - No frontend finance mutation
   - No Buy New mutation
   - No Used Market mutation

   Backend source:
   GET /v1/aircraft/fleet

   ACS Rules:
   - My Aircraft reads what backend already decided.
   - ACTIVE means aircraft is part of active fleet.
   - MAINTENANCE_REQUIRED does NOT automatically move aircraft
     into maintenance event.
   - C/D overdue means NOT DISPATCHABLE until player starts
     Service C & D Control or future Settings Auto C/D is enabled.
   - NEXT C / NEXT D must never show past dates as "next".
   ============================================================ */

(() => {
  "use strict";

  /* ============================================================
   🟦 MODULE STATE
   ============================================================ */

  const ACS_MY_AIRCRAFT_API_BASE =
    window.ACS_API_BASE ||
    "https://api.aviationcapitalsim.com";

  const ACS_MY_AIRCRAFT = {
    version: "ACS_MY_AIRCRAFT_BACKEND_AUTHORITY_V1_1",
    endpoint: `${ACS_MY_AIRCRAFT_API_BASE}/v1/aircraft/fleet`,
    fleet: [],
    filteredFleet: [],
    selectedAircraft: null
  };

  /* ============================================================
     🟦 SAFE DOM HELPERS
     ============================================================ */

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const el = $(id);
    if (!el) return;
    el.textContent = value ?? "—";
  }

  function safeText(value, fallback = "—") {
    if (value === null || value === undefined || value === "") return fallback;
    return String(value);
  }

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function formatNumber(value) {
    const n = safeNumber(value, 0);
    return n.toLocaleString("en-US");
  }

  function formatMoney(value, currency = "USD") {
    const n = safeNumber(value, 0);
    return `${currency} ${n.toLocaleString("en-US", {
      maximumFractionDigits: 0
    })}`;
  }

  function formatDate(value) {
    if (!value) return "—";

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";

    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).toUpperCase();
  }

  function normalizeStatus(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");
  }

  function normalizeDisplay(value) {
    return String(value || "—")
      .trim()
      .replace(/_/g, " ")
      .toUpperCase();
  }

  function isDatePastAgainstCurrentSimTime(dateValue, currentSimTimeValue) {
    if (!dateValue || !currentSimTimeValue) return false;

    const due = new Date(dateValue);
    const current = new Date(currentSimTimeValue);

    if (Number.isNaN(due.getTime()) || Number.isNaN(current.getTime())) {
      return false;
    }

    return due.getTime() < current.getTime();
  }

  /* ============================================================
     🟦 AIRCRAFT STATUS RESOLUTION
     ------------------------------------------------------------
     My Aircraft does NOT decide backend status.
     It only translates backend values into OCC display states.

     ACS / Airbus OCC Rule:
     - C/D overdue does not automatically place aircraft into a
       maintenance event.
     - It creates MAINTENANCE REQUIRED / NOT DISPATCHABLE state.
     - Player decides when to start Service C/D, unless future
       Settings Auto C/D is enabled.
     ============================================================ */

  function resolveFleetStatus(aircraft) {
    const status = normalizeStatus(aircraft.status);
    const operational = normalizeStatus(aircraft.operational_status);
    const maintenance = normalizeStatus(aircraft.maintenance_status);
    const maintenanceControl = normalizeStatus(aircraft.maintenance_control_status);
    const maintenanceReason = normalizeStatus(aircraft.maintenance_control_reason);

    if (maintenanceControl === "MAINTENANCE_REQUIRED") {
      return {
        key: "MAINTENANCE_REQUIRED",
        label: "MAINTENANCE REQUIRED",
        className: "status-maintenance",
        sub: normalizeDisplay(maintenanceReason || "TECHNICAL HOLD")
      };
    }

    if (status === "SCRAPPED") {
      return {
        key: "SCRAPPED",
        label: "SCRAPPED",
        className: "status-maintenance-hold",
        sub: "FINAL DISPOSITION"
      };
    }

    if (status === "RETURNED_TO_LESSOR") {
      return {
        key: "RETURNED_TO_LESSOR",
        label: "RETURNED",
        className: "status-maintenance-hold",
        sub: "LESSOR RETURN"
      };
    }

    if (status === "FOR_SALE") {
      return {
        key: "FOR_SALE",
        label: "FOR SALE",
        className: "status-pending",
        sub: "MARKET LISTING"
      };
    }

    if (status === "FOR_LEASE") {
      return {
        key: "FOR_LEASE",
        label: "FOR LEASE",
        className: "status-pending",
        sub: "LEASE OFFER"
      };
    }

    if (status === "FOR_SALE_OR_LEASE") {
      return {
        key: "FOR_SALE_OR_LEASE",
        label: "SALE / LEASE",
        className: "status-pending",
        sub: "MARKET OFFER"
      };
    }

    if (status === "STORED") {
      return {
        key: "STORED",
        label: "STORED",
        className: "status-pending",
        sub: "NOT IN SERVICE"
      };
    }

    if (status === "PENDING_DELIVERY") {
      return {
        key: "PENDING_DELIVERY",
        label: "PENDING DELIVERY",
        className: "status-pending",
        sub: "AWAITING ARRIVAL"
      };
    }

    if (
      status === "MAINTENANCE" ||
      status === "IN_MAINTENANCE" ||
      operational === "IN_MAINTENANCE"
    ) {
      return {
        key: "MAINTENANCE",
        label: "MAINTENANCE",
        className: "status-maintenance",
        sub: "IN SERVICE EVENT"
      };
    }

    if (status === "ON_ORDER") {
      return {
        key: "ON_ORDER",
        label: "ON ORDER",
        className: "status-pending",
        sub: "ORDER BOOK"
      };
    }

    if (status === "ACTIVE" || operational === "AVAILABLE") {
      return {
        key: "ACTIVE",
        label: "ACTIVE",
        className: "status-active",
        sub: "AVAILABLE"
      };
    }

    return {
      key: status || "UNKNOWN",
      label: normalizeDisplay(status || operational || "UNKNOWN"),
      className: "status-pending",
      sub: normalizeDisplay(operational || maintenance || "REVIEW")
    };
  }

  function isSchedulable(aircraft) {
     
    const statusInfo = resolveFleetStatus(aircraft);
    const operational = normalizeStatus(aircraft.operational_status);
    const maintenanceControl = normalizeStatus(aircraft.maintenance_control_status);
    const cStatus = normalizeStatus(aircraft.c_check_status);
    const dStatus = normalizeStatus(aircraft.d_check_status);

    /*
      ACS OCC Rule:
      Aircraft may remain ACTIVE in the fleet, but if maintenance
      authority says MAINTENANCE_REQUIRED or C/D is OVERDUE,
      it is not dispatchable.
    */

    if (maintenanceControl === "MAINTENANCE_REQUIRED") return false;
    if (cStatus === "OVERDUE") return false;
    if (dStatus === "OVERDUE") return false;

    return (
      statusInfo.key === "ACTIVE" &&
      operational === "AVAILABLE" &&
      Boolean(aircraft.registration)
    );
  }

  function getRegistrationDisplay(aircraft) {
     
    const registration = String(aircraft.registration || "").trim();

    if (!registration || registration.toUpperCase() === "PENDING") {
      return "—";
    }

    return registration;
  }

  function getSourceDisplay(aircraft) {
    const source = normalizeStatus(aircraft.source);

    if (source === "FACTORY") return "FACTORY";
    if (source === "USED_MARKET") return "USED MARKET";
    if (source === "LEASE_NEW") return "LEASE NEW";
    if (source === "LEASE_USED") return "LEASE USED";

    return normalizeDisplay(source || "UNKNOWN");
  }

  function getOwnershipDisplay(aircraft) {
    const ownership = normalizeStatus(aircraft.ownership_type);

    if (ownership === "OWNED") return "OWNED";
    if (ownership === "LEASED") return "LEASED";
    if (ownership === "FINANCED") return "FINANCED";

    return normalizeDisplay(ownership || "UNKNOWN");
  }

  function getMaintenanceDisplay(aircraft) {
    const maintenanceControl = normalizeStatus(aircraft.maintenance_control_status);
    const maintenanceReason = normalizeStatus(aircraft.maintenance_control_reason);
    const maintenance = normalizeStatus(aircraft.maintenance_status);

    if (maintenanceControl === "MAINTENANCE_REQUIRED") {
      return normalizeDisplay(maintenanceReason || "MAINTENANCE REQUIRED");
    }

    if (!maintenance) return "—";
    if (maintenance === "SERVICEABLE") return "SERVICEABLE";
    if (maintenance === "CHECK_REQUIRED") return "CHECK REQUIRED";
    if (maintenance.includes("D")) return "D-CHECK";
    if (maintenance.includes("C")) return "C-CHECK";

    return normalizeDisplay(maintenance);
  }

  /* ============================================================
   GLOBAL AIRCRAFT IMAGE RESOLVER — SYNC WITH USED / BUY NEW
   ============================================================ */

function getAircraftImage(ac) {

  if (!ac || !ac.model || !ac.manufacturer) {
    return "img/placeholder_aircraft.png";
  }

  let manuFolder = ac.manufacturer.trim().replace(/\s+/g, " ");

  if (ac.manufacturer.toLowerCase() === "de havilland") {
    manuFolder = "de_havilland";
  }

  const rawModel = ac.model.toLowerCase().trim();
  const base = rawModel.replace(/[^a-z0-9]+/g, "_");

  const variants = new Set();
  variants.add(base);
  variants.add(base.replace(/^l_([0-9]+)/, "l$1"));
  variants.add(base.replace(/_/g, ""));
  variants.add(rawModel.replace(/[^a-z0-9]+/g, ""));

  const candidates = [];

  for (const v of variants) {
    candidates.push(`img/${manuFolder}/${v}.png`);
    candidates.push(`img/${manuFolder}/${v}.jpg`);
  }

  const manuSlug = ac.manufacturer.toLowerCase().replace(/[^a-z0-9]+/g, "_");

  candidates.push(`img/${base}.png`);
  candidates.push(`img/${base}.jpg`);
  candidates.push(`img/${manuSlug}_${base}.png`);
  candidates.push(`img/${manuSlug}_${base}.jpg`);

  return candidates[0] || "img/placeholder_aircraft.png";
}

/* ============================================================
   🖼️ ACS IMAGE FALLBACK SYSTEM — SYNC WITH USED / BUY NEW
   ============================================================ */

function ACS_handleImageFallback(img) {

  if (img.dataset.fallback === "1") {
    img.onerror = null;
    img.src = "img/placeholder_aircraft.png";
    return;
  }

  img.dataset.fallback = "1";

  if (img.src.endsWith(".png")) {
    img.src = img.src.replace(".png", ".jpg");
  } else if (img.src.endsWith(".jpg")) {
    img.src = img.src.replace(".jpg", ".png");
  } else {
    img.src = "img/placeholder_aircraft.png";
  }
}

/* ============================================================
   MY AIRCRAFT → IMAGE MODEL NORMALIZER
   ------------------------------------------------------------
   My Aircraft receives aircraft_name but not always model.
   This prepares the same object shape used by Used Market.
   ============================================================ */

function normalizeMyAircraftImageObject(aircraft) {
  const manufacturer = String(aircraft.manufacturer || "").trim();

  const model =
    aircraft.model ||
    String(aircraft.aircraft_name || "")
      .replace(new RegExp("^" + manufacturer + "\\s+", "i"), "")
      .trim() ||
    aircraft.model_key ||
    "Unknown Model";

  return {
    ...aircraft,
    manufacturer,
    model
  };
}
   
  /* ============================================================
     🟦 DATA LOADING
     ============================================================ */

  async function loadFleetFromBackend() {
    const response = await fetch(ACS_MY_AIRCRAFT.endpoint, {
      method: "GET",
      credentials: "include",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      let details = "";

      try {
        const payload = await response.json();
        details = payload?.error || payload?.details || "";
      } catch (_) {
        details = response.statusText;
      }

      throw new Error(`Fleet load failed: ${response.status} ${details}`);
    }

    const payload = await response.json();

    if (!payload || payload.ok !== true || !Array.isArray(payload.fleet)) {
      throw new Error("Invalid fleet payload from backend.");
    }

    ACS_MY_AIRCRAFT.fleet = payload.fleet;
    ACS_MY_AIRCRAFT.filteredFleet = [...payload.fleet];

    console.log("🟦 ACS MY AIRCRAFT — Fleet loaded:", {
      version: ACS_MY_AIRCRAFT.version,
      count: ACS_MY_AIRCRAFT.fleet.length,
      backend_authority: true,
      localStorage: false,
      maintenance_authority: payload?.authority?.maintenance || "aircraft_maintenance_status"
    });
  }

  /* ============================================================
   🟦 ACS-RA-UI3 — AUTO REGISTRATION SYNC
   ------------------------------------------------------------
   Purpose:
   - My Aircraft must not show aircraft without registration.
   - Registration is resolved automatically by backend authority.
   - My Aircraft does not generate registrations.
   - Backend/PostgreSQL remains source of truth.
   ============================================================ */

  function ACS_RA_needsAutoRegistration(aircraft) {
    const registration = String(aircraft?.registration || "").trim().toUpperCase();

    return (
      !registration ||
      registration === "PENDING" ||
      registration === "NULL" ||
      registration === "N/A"
    );
  }

  async function ACS_RA_autoAssignRegistration(aircraft) {
    const aircraftId = Number(aircraft?.id);

    if (!aircraftId || !Number.isInteger(aircraftId)) {
      return {
        ok: false,
        skipped: true,
        reason: "INVALID_AIRCRAFT_ID"
      };
    }

    const response = await fetch(
      `${ACS_MY_AIRCRAFT_API_BASE}/v1/aircraft/fleet/${aircraftId}/registration/auto-assign`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({})
      }
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.ok) {
      console.warn("🟨 ACS RA AUTO REGISTRATION FAILED:", {
        aircraft_id: aircraftId,
        status: response.status,
        payload
      });

      return {
        ok: false,
        aircraft_id: aircraftId,
        status: response.status,
        payload
      };
    }

    console.log("🟦 ACS RA AUTO REGISTRATION SYNC:", {
      aircraft_id: aircraftId,
      action: payload.action,
      registration: payload.registration
    });

    return {
      ok: true,
      aircraft_id: aircraftId,
      payload
    };
  }

  async function ACS_RA_syncMissingRegistrations() {
    const fleet = Array.isArray(ACS_MY_AIRCRAFT.fleet)
      ? ACS_MY_AIRCRAFT.fleet
      : [];

    const aircraftNeedingRegistration = fleet.filter(ACS_RA_needsAutoRegistration);

    if (!aircraftNeedingRegistration.length) {
      return {
        changed: false,
        count: 0
      };
    }

    console.log("🟦 ACS RA — Auto registration required:", {
      count: aircraftNeedingRegistration.length
    });

    for (const aircraft of aircraftNeedingRegistration) {
      await ACS_RA_autoAssignRegistration(aircraft);
    }

    return {
      changed: true,
      count: aircraftNeedingRegistration.length
    };
  }

  /* ============================================================
   🟦 FLEET OVERVIEW — ACS OCC BACKEND AUTHORITY v2.1
   ------------------------------------------------------------
   Purpose:
   - Render real operational indicators from aircraft_fleet.
   - Render technical hold from aircraft_maintenance_status.
   - No localStorage.
   - No frontend authority.
   - Reads only backend payload already loaded into ACS_MY_AIRCRAFT.fleet.

   Indicators:
   - Total Fleet
   - Active
   - Pending Delivery
   - Maintenance / Maintenance Required
   - Leased
   ============================================================ */

  function renderFleetOverview() {
    const fleet = Array.isArray(ACS_MY_AIRCRAFT.fleet)
      ? ACS_MY_AIRCRAFT.fleet
      : [];

    const counts = {
      totalFleet: fleet.length,
      active: 0,
      pendingDelivery: 0,
      maintenance: 0,
      leased: 0
    };

    for (const aircraft of fleet) {
      const status = normalizeStatus(aircraft.status);
      const operational = normalizeStatus(aircraft.operational_status);
      const ownership = normalizeStatus(aircraft.ownership_type);
      const maintenanceControl = normalizeStatus(aircraft.maintenance_control_status);

      const statusInfo = resolveFleetStatus(aircraft);

      if (
        statusInfo.key === "ACTIVE" &&
        status === "ACTIVE" &&
        operational === "AVAILABLE" &&
        maintenanceControl !== "MAINTENANCE_REQUIRED"
      ) {
        counts.active += 1;
      }

      if (
        status === "PENDING_DELIVERY" ||
        statusInfo.key === "PENDING_DELIVERY"
      ) {
        counts.pendingDelivery += 1;
      }

      if (
        status === "MAINTENANCE" ||
        status === "IN_MAINTENANCE" ||
        operational === "IN_MAINTENANCE" ||
        maintenanceControl === "MAINTENANCE_REQUIRED" ||
        statusInfo.key === "MAINTENANCE" ||
        statusInfo.key === "MAINTENANCE_REQUIRED"
      ) {
        counts.maintenance += 1;
      }

      if (ownership === "LEASED") {
        counts.leased += 1;
      }
    }

    setText("foTotalFleetValue", counts.totalFleet);
    setText("foActiveValue", counts.active);
    setText("foPendingDeliveryValue", counts.pendingDelivery);
    setText("foMaintenanceValue", counts.maintenance);
    setText("foLeasedValue", counts.leased);

    console.log("🟦 ACS OCC FLEET OVERVIEW UPDATED:", {
      backend_authority: true,
      localStorage: false,
      counts
    });
  }

  /* ============================================================
     🟦 FILTERS
     ============================================================ */

  function populateFilters() {
    const modelSelect = $("filterModel");
    const familySelect = $("filterFamily");
    const baseSelect = $("filterBase");

    const models = new Set();
    const families = new Set();
    const bases = new Set();

    for (const aircraft of ACS_MY_AIRCRAFT.fleet) {
      if (aircraft.aircraft_name) models.add(aircraft.aircraft_name);
      if (aircraft.manufacturer) families.add(aircraft.manufacturer);
      if (aircraft.base_icao) bases.add(aircraft.base_icao);
    }

    fillSelect(modelSelect, "Model", models);
    fillSelect(familySelect, "Family", families);
    fillSelect(baseSelect, "Base", bases);
  }

  function fillSelect(select, placeholder, values) {
    if (!select) return;

    const current = select.value;

    select.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = placeholder;
    select.appendChild(defaultOption);

    [...values].sort().forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });

    select.value = current;
  }

  function applyFilters() {
    const modelValue = $("filterModel")?.value || "";
    const familyValue = $("filterFamily")?.value || "";
    const statusValue = $("filterStatus")?.value || "";
    const conditionValue = $("filterCondition")?.value || "";
    const ageValue = $("filterAge")?.value || "";
    const baseValue = $("filterBase")?.value || "";
    const searchValue = ($("searchInput")?.value || "").trim().toLowerCase();

    ACS_MY_AIRCRAFT.filteredFleet = ACS_MY_AIRCRAFT.fleet.filter((aircraft) => {
      const statusInfo = resolveFleetStatus(aircraft);
      const condition = safeNumber(aircraft.condition_pct, 0);
      const age = resolveAircraftAge(aircraft);

      if (modelValue && aircraft.aircraft_name !== modelValue) return false;
      if (familyValue && aircraft.manufacturer !== familyValue) return false;
      if (baseValue && aircraft.base_icao !== baseValue) return false;

      if (statusValue) {
        const requested = normalizeStatus(statusValue);
        const actual = normalizeStatus(statusInfo.label);

        if (requested === "ACTIVE" && statusInfo.key !== "ACTIVE") return false;
        if (requested === "PENDING_DELIVERY" && statusInfo.key !== "PENDING_DELIVERY") return false;

        if (
          ["IN_C_CHECK", "IN_D_CHECK", "A_CHECK", "B_CHECK"].includes(requested) &&
          !["MAINTENANCE", "MAINTENANCE_REQUIRED"].includes(statusInfo.key)
        ) {
          return false;
        }

        if (
          ![
            "ACTIVE",
            "PENDING_DELIVERY",
            "IN_C_CHECK",
            "IN_D_CHECK",
            "A_CHECK",
            "B_CHECK"
          ].includes(requested) &&
          actual !== requested
        ) {
          return false;
        }
      }

      if (conditionValue && condition <= Number(conditionValue)) return false;

      if (ageValue && !matchAgeFilter(age, ageValue)) return false;

      if (searchValue) {
        const haystack = [
          aircraft.registration,
          aircraft.aircraft_name,
          aircraft.model_key,
          aircraft.manufacturer,
          aircraft.serial_number,
          aircraft.base_icao,
          aircraft.current_airport,
          aircraft.source,
          aircraft.ownership_type
        ]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");

        if (!haystack.includes(searchValue)) return false;
      }

      return true;
    });

    renderFleetTable();
  }

  function matchAgeFilter(age, filterValue) {
    if (!Number.isFinite(age)) return false;

    if (filterValue === "0-5") return age >= 0 && age <= 5;
    if (filterValue === "5-10") return age > 5 && age <= 10;
    if (filterValue === "10-20") return age > 10 && age <= 20;
    if (filterValue === "20+") return age > 20;

    return true;
  }

  function bindFilters() {
    [
      "filterModel",
      "filterFamily",
      "filterStatus",
      "filterCondition",
      "filterAge",
      "filterBase",
      "searchInput"
    ].forEach((id) => {
      const el = $(id);
      if (!el) return;

      const eventName = el.tagName === "INPUT" ? "input" : "change";
      el.addEventListener(eventName, applyFilters);
    });
  }

  /* ============================================================
     🟦 TABLE RENDER
     ============================================================ */

  function renderFleetTable() {
    const tbody = $("fleetTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!ACS_MY_AIRCRAFT.filteredFleet.length) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td colspan="10" style="text-align:center; padding:1.4rem; color:#9fb3c8;">
          No aircraft found in fleet backend authority.
        </td>
      `;
      tbody.appendChild(row);
      return;
    }

    for (const aircraft of ACS_MY_AIRCRAFT.filteredFleet) {
      const row = document.createElement("tr");
      const statusInfo = resolveFleetStatus(aircraft);

      if (statusInfo.key === "PENDING_DELIVERY") {
        row.classList.add("pending-row");
      }

      if (statusInfo.key === "MAINTENANCE_REQUIRED") {
        row.classList.add("pending-row");
      }

      const condition = Math.round(safeNumber(aircraft.condition_pct, 0));

      row.innerHTML = `
        <td>
          <strong>${escapeHtml(getRegistrationDisplay(aircraft))}</strong>
          <div class="status-sub">${escapeHtml(getOwnershipDisplay(aircraft))}</div>
        </td>

        <td>
          <strong>${escapeHtml(safeText(aircraft.aircraft_name))}</strong>
          <div class="status-sub">${escapeHtml(getSourceDisplay(aircraft))}</div>
        </td>

        <td>
          <span class="status-badge ${statusInfo.className}">
            ${escapeHtml(resolvePrimaryTableStatus(aircraft))}
          </span>
        </td>

        <td>${formatNumber(aircraft.total_hours)}</td>

        <td>${formatNumber(aircraft.total_cycles)}</td>

        <td>
          <strong>${condition}%</strong>
        </td>

        <td class="${!isAircraftInMaintenanceEvent(aircraft) && normalizeStatus(aircraft.c_check_status) === "OVERDUE" ? "maint-warning" : ""}">
          ${escapeHtml(resolveNextCDisplay(aircraft))}
        </td>

        <td class="${!isAircraftInMaintenanceEvent(aircraft) && normalizeStatus(aircraft.d_check_status) === "OVERDUE" ? "maint-critical" : ""}">
          ${escapeHtml(resolveNextDDisplay(aircraft))}
        </td>

        <td>
          ${escapeHtml(safeText(aircraft.base_icao))}
          <div class="status-sub">${escapeHtml(safeText(aircraft.current_airport))}</div>
        </td>

        <td>
          <button class="btn-action" data-aircraft-id="${aircraft.id}">
            Manage
          </button>
        </td>
      `;

      const button = row.querySelector("button[data-aircraft-id]");
      if (button) {
        button.addEventListener("click", () => openAircraftModal(aircraft.id));
      }

      tbody.appendChild(row);
    }
  }

  function isAircraftInMaintenanceEvent(aircraft) {
  const status = normalizeStatus(aircraft.status);
  const operational = normalizeStatus(aircraft.operational_status);

  return (
    status === "MAINTENANCE" ||
    status === "IN_MAINTENANCE" ||
    operational === "IN_MAINTENANCE"
  );
}
   
  /* ============================================================
   🟦 TABLE PRIMARY STATUS — CLEAN OCC DISPLAY
   ------------------------------------------------------------
   Purpose:
   - Status column shows only the aircraft main operational state.
   - Maintenance required becomes the primary status when backend
     maintenance authority says MAINTENANCE_REQUIRED.
   - Aircraft is not automatically moved into maintenance event.
   ============================================================ */

  function resolvePrimaryTableStatus(aircraft) {
  const status = normalizeStatus(aircraft.status);
  const operational = normalizeStatus(aircraft.operational_status);
  const maintenanceControl = normalizeStatus(aircraft.maintenance_control_status);

  /*
    ACS OCC Rule:
    Real maintenance event has priority over technical warning.
    If aircraft is physically IN_MAINTENANCE, table must show MAINTENANCE,
    not MAINTENANCE REQUIRED.
  */
  if (isAircraftInMaintenanceEvent(aircraft)) {
    return "MAINTENANCE";
  }

  if (maintenanceControl === "MAINTENANCE_REQUIRED") {
    return "MAINTENANCE REQUIRED";
  }

  if (status === "ACTIVE") {
    return "ACTIVE";
  }

  if (status === "PENDING_DELIVERY") {
    return "PENDING DELIVERY";
  }

  if (status === "STORED") {
    return "STORED";
  }

  if (status === "SCRAPPED") {
    return "SCRAPPED";
  }

  if (status === "RETURNED_TO_LESSOR") {
    return "RETURNED";
  }

  return normalizeDisplay(status || operational || "REVIEW");
}
   
  function resolveNextCDisplay(aircraft) {
  /*
    ACS OCC Rule:
    During a real maintenance event, Next C is suspended visually.
    New date appears only after maintenance resolver completes the event.
  */
  if (isAircraftInMaintenanceEvent(aircraft)) {
    return "—";
  }

  const status = normalizeStatus(aircraft.c_check_status);

  if (status === "OVERDUE") {
    return "OVERDUE";
  }

  const value =
    aircraft.next_c_check_due_date ||
    aircraft.next_c_due_date ||
    aircraft.c_check_due_date ||
    null;

  if (!value) return "—";

  if (
    aircraft.current_sim_time &&
    isDatePastAgainstCurrentSimTime(value, aircraft.current_sim_time)
  ) {
    return "OVERDUE";
  }

  return formatDate(value);
}

  function resolveNextDDisplay(aircraft) {
  /*
    ACS OCC Rule:
    During a real maintenance event, Next D is suspended visually.
    New date appears only after maintenance resolver completes the event.
  */
  if (isAircraftInMaintenanceEvent(aircraft)) {
    return "—";
  }

  const status = normalizeStatus(aircraft.d_check_status);

  if (status === "OVERDUE") {
    return "OVERDUE";
  }

  const value =
    aircraft.next_d_check_due_date ||
    aircraft.next_d_due_date ||
    aircraft.d_check_due_date ||
    null;

  if (!value) return "—";

  if (
    aircraft.current_sim_time &&
    isDatePastAgainstCurrentSimTime(value, aircraft.current_sim_time)
  ) {
    return "OVERDUE";
  }

  return formatDate(value);
}
   
  function resolveAircraftAge(aircraft) {
    const yearBuilt = Number(aircraft.year_built);
    if (!Number.isInteger(yearBuilt) || yearBuilt <= 0) return NaN;

    const now = new Date();
    return Math.max(0, now.getUTCFullYear() - yearBuilt);
  }

  /* ============================================================
   🟦 AIRCRAFT AUTHORITY PANEL
   ------------------------------------------------------------
   Player-facing modal:
   - Aircraft Authority Panel
   - Technical & Operational Control
   - Read-only backend authority payload
   - Action buttons prepared for sub-modals
   ============================================================ */

  function openAircraftModal(aircraftId) {
    const aircraft = ACS_MY_AIRCRAFT.fleet.find(
      (item) => Number(item.id) === Number(aircraftId)
    );

    if (!aircraft) return;

    ACS_MY_AIRCRAFT.selectedAircraft = aircraft;

    const statusInfo = resolveFleetStatus(aircraft);
    const condition = Math.round(safeNumber(aircraft.condition_pct, 0));
    const schedulable = isSchedulable(aircraft);
    const ownership = getOwnershipDisplay(aircraft);
    const source = getSourceDisplay(aircraft);

    const aircraftName = safeText(
      aircraft.catalog_aircraft_name ||
      aircraft.aircraft_name
    );

    setText("acpTitle", "Aircraft Authority Panel");

    const img = $("acpImage");
    if (img) {
    const imageAircraft = normalizeMyAircraftImageObject(aircraft);

    img.dataset.fallback = "0";
    img.onerror = function() {
    ACS_handleImageFallback(this);
   };

   img.src = getAircraftImage(imageAircraft);
   img.alt = aircraftName;
   }

    setText("acpRegistration", getRegistrationDisplay(aircraft));
    setText("acpAircraftName", aircraftName);
    setText("acpManufacturer", safeText(aircraft.catalog_manufacturer || aircraft.manufacturer));
    setText("acpBase", safeText(aircraft.base_icao));

    /*
      A/B line maintenance is controlled by Schedule Table.
      This panel only mirrors windows when backend/schedule data is available.
      No "not scheduled" warning is shown here.
    */
    setText("acpACheckWindow", safeText(aircraft.a_check_window, "—"));
    setText("acpBCheckWindow", safeText(aircraft.b_check_window, "—"));

    /*
      Capital display will be connected when finance snapshot is available
      through backend or approved finance module. No localStorage authority.
    */

    bindAircraftAuthorityActions(aircraft);

    const modal = $("aircraftModal");
    if (modal) {
      modal.style.display = "flex";
    }

    console.log("🟦 ACS AIRCRAFT AUTHORITY PANEL OPENED:", {
      aircraft_id: aircraft.id,
      registration: aircraft.registration,
      status: statusInfo.key,
      schedulable,
      ownership,
      source,
      maintenance_control_status: aircraft.maintenance_control_status,
      maintenance_control_reason: aircraft.maintenance_control_reason
    });
  }

  function bindAircraftAuthorityActions(aircraft) {
     
    const btnServiceCD = $("acpServiceCD");
    const btnInsurance = $("acpInsurance");
    const btnStorage = $("acpStorage");
    const btnScrap = $("acpScrap");

    if (btnServiceCD) {
  btnServiceCD.onclick = () => {
    openServiceCDControlModal(aircraft);
  };
}
     
    if (btnInsurance) {
      btnInsurance.onclick = () => {
        console.log("🟦 Insurance Control pending:", aircraft);
        alert("Insurance Control will be connected in a later block.");
      };
    }

    if (btnStorage) {
      btnStorage.onclick = () => {
        console.log("🟦 Storage Control pending:", aircraft);
        alert("Storage Control will be connected in a later block.");
      };
    }

    if (btnScrap) {
      btnScrap.onclick = () => {
        console.log("🟦 Scrap Aircraft Evaluation pending:", aircraft);
        alert("Scrap Aircraft Evaluation will be connected in a later block.");
      };
    }
  }

  /* ============================================================
   ✈️ SERVICE C & D CONTROL — BACKEND QUOTE AUTHORITY v1.0
   ------------------------------------------------------------
   Purpose:
   - Opens Service C & D Control modal
   - Loads quote from backend authority
   - No frontend cost/duration calculation
   - No localStorage
   - No temporary values
   ============================================================ */

async function fetchMaintenanceQuote(aircraftId) {
  const response = await fetch(
    `${ACS_MY_AIRCRAFT_API_BASE}/v1/aircraft/fleet/${aircraftId}/maintenance/quote`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "Accept": "application/json"
      }
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.ok) {
    throw new Error(
      payload?.details ||
      payload?.error ||
      `MAINTENANCE_QUOTE_FAILED_${response.status}`
    );
  }

  return payload;
}

function formatMaintenanceCost(value, currency = "USD") {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "QUOTE UNAVAILABLE";
  }

  return `${currency} ${n.toLocaleString("en-US", {
    maximumFractionDigits: 0
  })}`;
}

function resolveServiceStatusLabel(statusValue) {
  const status = normalizeStatus(statusValue);

  if (status === "OVERDUE") return "OVERDUE";
  if (status === "OPEN") return "OPEN";
  if (status === "NOT_ESTABLISHED") return "NOT REQUIRED";
  if (status === "IN_PROGRESS") return "IN PROGRESS";
  if (status === "COMPLETED") return "COMPLETED";

  return normalizeDisplay(status || "REVIEW");
}

function setServiceStatusElement(id, statusValue) {
  const el = $(id);
  if (!el) return;

  const status = normalizeStatus(statusValue);

  el.textContent = resolveServiceStatusLabel(status);

  el.classList.remove(
    "scd-status-open",
    "scd-status-overdue",
    "scd-status-required"
  );

  if (status === "OPEN") {
    el.classList.add("scd-status-open");
  } else if (status === "OVERDUE") {
    el.classList.add("scd-status-overdue");
  } else {
    el.classList.add("scd-status-required");
  }
}

function setServiceButtonState(buttonId, servicePayload, checkType) {
  const btn = $(buttonId);
  if (!btn) return;

  const status = normalizeStatus(servicePayload?.status);

  btn.disabled = (
    status === "NOT_ESTABLISHED" ||
    status === "IN_PROGRESS" ||
    status === "COMPLETED"
  );

  btn.onclick = () => {
    startMaintenanceCheck(checkType);
  };
}

async function openServiceCDControlModal(aircraft) {
  if (!aircraft?.id) return;

  ACS_MY_AIRCRAFT.selectedAircraft = aircraft;

  const modal = $("serviceCDModal");
  if (modal) {
    modal.style.display = "flex";
  }

  setText(
  "scdAircraftLabel",
  `Aircraft ${getRegistrationDisplay(aircraft)} — ${safeText(aircraft.aircraft_name)}`
  );

  setServiceStatusElement("scdCStatus", "LOADING");
  setServiceStatusElement("scdDStatus", "LOADING");

  setText("scdCDuration", "Loading...");
  setText("scdDDuration", "Loading...");
  setText("scdCCost", "Loading...");
  setText("scdDCost", "Loading...");

  try {
    const quote = await fetchMaintenanceQuote(aircraft.id);

    setText(
  "scdAircraftLabel",
  `Aircraft ${quote.aircraft?.registration || getRegistrationDisplay(aircraft)} — ${safeText(quote.aircraft?.aircraft_name || aircraft.aircraft_name)}`
   );

    setServiceStatusElement("scdCStatus", quote.c_check?.status);
    setServiceStatusElement("scdDStatus", quote.d_check?.status);

    setText(
      "scdCDuration",
      `${Number(quote.c_check?.duration_days || 0)} days`
    );

    setText(
      "scdDDuration",
      `${Number(quote.d_check?.duration_days || 0)} days`
    );

    setText(
      "scdCCost",
      formatMaintenanceCost(
        quote.c_check?.estimated_cost,
        quote.c_check?.currency || quote.aircraft?.currency || "USD"
      )
    );

    setText(
      "scdDCost",
      formatMaintenanceCost(
        quote.d_check?.estimated_cost,
        quote.d_check?.currency || quote.aircraft?.currency || "USD"
      )
    );

    setServiceButtonState("scdStartC", quote.c_check, "C_CHECK");
    setServiceButtonState("scdStartD", quote.d_check, "D_CHECK");

    console.log("🟦 ACS SERVICE C & D QUOTE LOADED:", quote);

  } catch (err) {
    console.error("🟥 ACS SERVICE C & D QUOTE ERROR:", err);

    setServiceStatusElement("scdCStatus", "REVIEW");
    setServiceStatusElement("scdDStatus", "REVIEW");

    setText("scdCDuration", "QUOTE ERROR");
    setText("scdDDuration", "QUOTE ERROR");
    setText("scdCCost", "QUOTE ERROR");
    setText("scdDCost", "QUOTE ERROR");

    const btnC = $("scdStartC");
    const btnD = $("scdStartD");

    if (btnC) btnC.disabled = true;
    if (btnD) btnD.disabled = true;
  }
}

function closeServiceCDControlModal() {
  const modal = $("serviceCDModal");
  if (modal) {
    modal.style.display = "none";
  }
}

async function startMaintenanceCheck(checkType) {
  const aircraft = ACS_MY_AIRCRAFT.selectedAircraft;

  if (!aircraft?.id) {
    alert("No aircraft selected.");
    return;
  }

  const normalizedCheckType = normalizeStatus(checkType);

  if (!["C_CHECK", "D_CHECK"].includes(normalizedCheckType)) {
    alert("Invalid maintenance check type.");
    return;
  }

  const confirmMessage =
    `Start ${normalizedCheckType.replace("_", " ")} for ${getRegistrationDisplay(aircraft)}?\n\n` +
    "ACS will charge the maintenance cost from Company Finance and move the aircraft to IN MAINTENANCE.";

  if (!confirm(confirmMessage)) {
    return;
  }

  const btnC = $("scdStartC");
  const btnD = $("scdStartD");

  if (btnC) btnC.disabled = true;
  if (btnD) btnD.disabled = true;

  try {
    const response = await fetch(
      `${ACS_MY_AIRCRAFT_API_BASE}/v1/aircraft/fleet/${aircraft.id}/maintenance/start`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          check_type: normalizedCheckType
        })
      }
    );

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.ok) {
      const errorCode =
        result?.error ||
        result?.details ||
        `MAINTENANCE_START_FAILED_${response.status}`;

      if (errorCode === "INSUFFICIENT_CAPITAL_FOR_MAINTENANCE") {
        alert(
          "❌ Insufficient capital for maintenance.\n\n" +
          `Available capital: ${formatMoney(Number(result.capital || 0), "USD")}\n` +
          `Required: ${formatMoney(Number(result.required || 0), "USD")}`
        );
        return;
      }

      alert(`❌ Maintenance start failed.\n\n${errorCode}`);
      return;
    }

    console.log("🟩 ACS MAINTENANCE EVENT STARTED:", result);

    await loadFleetFromBackend();

    ACS_MY_AIRCRAFT.filteredFleet = [...ACS_MY_AIRCRAFT.fleet];

    populateFilters();
    renderFleetOverview();
    renderFleetTable();

    closeServiceCDControlModal();
    closeModal();

    alert(
      `✅ ${normalizedCheckType.replace("_", " ")} started successfully.\n\n` +
      `Aircraft: ${result.aircraft?.registration || getRegistrationDisplay(aircraft)}\n` +
      `Status: IN MAINTENANCE\n` +
      `Duration: ${result.event?.duration_days || "—"} days\n` +
      `Charged: ${formatMoney(Number(result.finance?.charged_amount || 0), "USD")}`
    );

  } catch (error) {
    console.error("🟥 ACS MAINTENANCE START ERROR:", error);

    alert(
      "❌ Maintenance start failed.\n\n" +
      "Please check backend connection and try again."
    );

  } finally {
    if (btnC) btnC.disabled = false;
    if (btnD) btnD.disabled = false;
  }
}
   
  function formatAge(aircraft) {
    const age = resolveAircraftAge(aircraft);
    return Number.isFinite(age) ? String(age) : "—";
  }

  function setMaintenanceButtonsReadOnly(aircraft) {
    const btnC = $("btnCcheck");
    const btnD = $("btnDcheck");
    const btnLog = $("btnLog");

    /*
      v1.1 is reader-only.
      Maintenance actions require backend endpoints.
      We do not allow frontend-only mutations.
    */

    if (btnC) {
      btnC.disabled = true;
      btnC.title = "Backend maintenance endpoint required.";
    }

    if (btnD) {
      btnD.disabled = true;
      btnD.title = "Backend maintenance endpoint required.";
    }

    if (btnLog) {
      btnLog.disabled = false;
      btnLog.onclick = () => openMaintenanceLogReadOnly(aircraft);
    }
  }

  function closeModal() {
    const modal = $("aircraftModal");
    if (modal) modal.style.display = "none";

    ACS_MY_AIRCRAFT.selectedAircraft = null;
  }

  function openMaintenanceLogReadOnly(aircraft) {
    setText(
      "logAircraftTitle",
      `${safeText(aircraft.aircraft_name)} — ${getRegistrationDisplay(aircraft)}`
    );

    const body = $("maintenanceLogBody");
    if (body) {
      body.innerHTML = `
        <tr>
          <td colspan="5" class="ql-log-empty">
            Maintenance log endpoint not connected yet. Backend authority required.
          </td>
        </tr>
      `;
    }

    const modal = $("maintenanceLogModal");
    if (modal) modal.style.display = "flex";
  }

  function closeMaintenanceLog() {
    const modal = $("maintenanceLogModal");
    if (modal) modal.style.display = "none";
  }

  function closeAssetPanel() {
    const panel = $("aircraftAssetPanel");
    if (panel) panel.style.display = "none";
  }

  /* ============================================================
     🟦 LEGACY MODAL SAFETY STUBS
     ------------------------------------------------------------
     These prevent old inline onclick handlers from breaking page.
     They do not mutate data.
     ============================================================ */

  function closeRegModal() {
    const modal = $("regModal");
    if (modal) modal.style.display = "none";
  }

  function saveRegistration() {
    alert(
      "Registration assignment requires backend authority endpoint. No local save was performed."
    );
  }

  /* ============================================================
     🟦 SECURITY / ESCAPE
     ============================================================ */

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ============================================================
     🟦 INIT
     ============================================================ */

  async function initMyAircraft() {
    try {
      renderLoadingState();

      await loadFleetFromBackend();

      /* ============================================================
         ACS-RA-UI3 — AUTO REGISTRATION BEFORE RENDER
         ------------------------------------------------------------
         Registration is not a visual status.
         If an aircraft has no registration, backend assigns it first.
         Then My Aircraft reloads and renders the final fleet state.
         ============================================================ */

      const registrationSync = await ACS_RA_syncMissingRegistrations();

      if (registrationSync.changed) {
        await loadFleetFromBackend();
      }

      populateFilters();
      bindFilters();
      renderFleetOverview();
      renderFleetTable();

    } catch (err) {
      console.error("🟥 ACS MY AIRCRAFT INIT ERROR:", err);
      renderErrorState(err);
    }
  }

  function renderLoadingState() {
    const tbody = $("fleetTableBody");
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center; padding:1.4rem; color:#9fb3c8;">
          Loading fleet from backend authority...
        </td>
      </tr>
    `;
  }

  function renderErrorState(err) {
    const tbody = $("fleetTableBody");
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center; padding:1.4rem; color:#ff4d4d;">
          My Aircraft failed to load backend fleet authority.<br>
          ${escapeHtml(err?.message || "Unknown error")}
        </td>
      </tr>
    `;
  }

  document.addEventListener("DOMContentLoaded", initMyAircraft);

  /* ============================================================
     🟦 GLOBAL EXPORTS FOR EXISTING INLINE HTML HANDLERS
     ============================================================ */

window.closeModal = closeModal;
window.closeMaintenanceLog = closeMaintenanceLog;
window.closeAssetPanel = closeAssetPanel;
window.closeRegModal = closeRegModal;
window.closeServiceCDControlModal = closeServiceCDControlModal;
window.saveRegistration = saveRegistration;
window.ACS_MY_AIRCRAFT = ACS_MY_AIRCRAFT;

})();
