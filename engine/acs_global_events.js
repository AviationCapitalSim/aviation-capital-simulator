"use strict";

/* ============================================================
   ACS OCC - GLOBAL EVENTS v1.0
   DATE: 12 AUGUST 2026
   ------------------------------------------------------------
   Global Events presentation and interaction layer.
   Event filtering, selection, details and lifecycle display.
   No database writes or simulation effects in this phase.
   ============================================================ */

(function GlobalEvents() {
  const events = [
    {
      id: "aviation-boeing-727-service-entry",
      aircraftModel: "Boeing 727-100",
      category: "aviation",
      categoryLabel: "Aviation",
      title: "Boeing 727 Enters Scheduled Airline Service",
      summary: "The Boeing 727 has entered scheduled passenger service in the United States.",
      description: "The three-engine jet is designed for short- and medium-range routes and can operate from airports that are unsuitable for larger first-generation jetliners.",
      aviationEffect: "The new aircraft expands jet operations into shorter routes and airports with more restrictive runway conditions.",
      image: "img_global/boeing_727_service_entry.jpg",
      publishedAt: "1964-02-01",
      date: "01 FEB 1964",
      region: "United States"
    }

{
  id: "disruptions-alaska-earthquake-1964",
  category: "operational",
  categoryLabel: "Disruptions",
  title: "Powerful Earthquake Disrupts Alaska Air Transport",
  summary: "A major earthquake has damaged airport facilities across south-central Alaska.",
  description: "Runways, taxiways, terminals and control facilities have sustained damage in Anchorage and other affected communities. Several airfields remain operational using temporary communications and traffic-control arrangements.",
  aviationEffect: "Air services face damaged infrastructure, disrupted communications and temporary operating restrictions across the affected region.",
  image: "img_global/alaska_earthquake_airport_1964.jpg",
  publishedAt: "1964-03-27",
  date: "27 MAR 1964",
  region: "Alaska, United States"
}

{
  id: "economy-new-york-worlds-fair-1964",
  category: "economic",
  categoryLabel: "Economy",
  title: "New York World's Fair Opens to International Visitors",
  summary: "The New York World's Fair has opened, drawing visitors from across the United States and overseas.",
  description: "The international exhibition is expected to generate substantial passenger movement into the New York metropolitan area during its operating season.",
  aviationEffect: "Airlines serving New York may experience increased passenger demand associated with international and domestic visitors.",
  image: "img_global/new_york_worlds_fair_1964.jpg",
  publishedAt: "1964-04-22",
  date: "22 APR 1964",
  region: "New York, United States"
}

{
  id: "world-tanganyika-zanzibar-union-1964",
  category: "geopolitical",
  categoryLabel: "World",
  title: "Tanganyika and Zanzibar Form a United Republic",
  summary: "Tanganyika and Zanzibar have united as a single sovereign state.",
  description: "The new United Republic of Tanganyika and Zanzibar now represents both territories under one government. Administrative and international arrangements are being adjusted to reflect the union.",
  aviationEffect: "Air services, territorial records and international route documentation must now recognize the newly united state.",
  image: "img_global/tanganyika_zanzibar_union_1964.jpg",
  publishedAt: "1964-04-26",
  date: "26 APR 1964",
  region: "East Africa"
}   
  ];

  const state = { filter: "all", selectedId: null };
  let availableEvents = [];
  const feed = document.getElementById("eventFeed");
  const detail = document.getElementById("eventDetail");
  const workspace = document.getElementById("eventsWorkspace");
  const count = document.getElementById("eventCount");
  const activeCount = document.getElementById("activeCount");
  const regionCount = document.getElementById("regionCount");
  const operationsReadiness = document.getElementById("operationsReadiness");

  function escapeHTML(value) {
    return String(value).replace(/[&<>"]/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"
    })[character]);
  }

  function readWorldDate() {
    const clockText = document.getElementById("acs-clock")?.textContent || "";
    const match = clockText.match(/\b(\d{2})\s+([A-Z]{3})\s+(\d{4})\b/i);
    if (!match) return null;

    const months = {
      JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
      JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
    };
    const month = months[match[2].toUpperCase()];
    if (month === undefined) return null;
    return new Date(Date.UTC(Number(match[3]), month, Number(match[1])));
  }

  function refreshAvailableEvents() {
    const worldDate = readWorldDate();
    availableEvents = worldDate
      ? events.filter(event => new Date(`${event.publishedAt}T00:00:00Z`) <= worldDate)
      : [];
    availableEvents.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    state.selectedId = availableEvents.some(event => event.id === state.selectedId)
      ? state.selectedId
      : availableEvents[0]?.id || null;
  }

  function visibleEvents() {
    return state.filter === "all"
      ? availableEvents
      : availableEvents.filter(event => event.category === state.filter);
  }

  function cardTemplate(event) {
    const selected = event.id === state.selectedId;
    return `
      <button class="event-card${selected ? " is-selected" : ""}" type="button" data-event-id="${escapeHTML(event.id)}" aria-pressed="${selected}">
        <span class="event-image"><img src="${escapeHTML(event.image)}" alt="" loading="eager"></span>
        <span class="event-card-body">
          <span class="event-eyebrow">
            <span class="event-category">${escapeHTML(event.categoryLabel)}</span>
          </span>
          <span class="event-title">${escapeHTML(event.title)}</span>
          <span class="event-summary">${escapeHTML(event.summary)}</span>
          <span class="event-meta">
            <span>Date <b>${escapeHTML(event.date)}</b></span>
            <span>Region <b>${escapeHTML(event.region)}</b></span>
          </span>
        </span>
      </button>`;
  }

  function renderFeed() {
    const visible = visibleEvents();
    feed.innerHTML = visible.length
      ? visible.map(cardTemplate).join("")
      : '<div class="empty-state">NO EVENTS IN THIS CATEGORY</div>';
    count.textContent = `${String(visible.length).padStart(2, "0")} EVENT${visible.length === 1 ? "" : "S"} DISPLAYED`;
    activeCount.textContent = String(availableEvents.length).padStart(2, "0");
    regionCount.textContent = String(new Set(availableEvents.map(event => event.region).filter(Boolean)).size).padStart(2, "0");
    operationsReadiness.textContent = availableEvents.length ? "MONITORING" : "STANDBY";

    feed.querySelectorAll("[data-event-id]").forEach(card => {
      card.addEventListener("click", () => selectEvent(card.dataset.eventId));
    });
  }

  function renderDetail() {
    const event = availableEvents.find(item => item.id === state.selectedId) || visibleEvents()[0] || availableEvents[0];
    if (!event) {
      detail.replaceChildren();
      detail.hidden = true;
      workspace.classList.add("is-empty");
      return;
    }

    detail.hidden = false;
    workspace.classList.remove("is-empty");

    detail.innerHTML = `
      <div class="detail-image">
        <img src="${escapeHTML(event.image)}" alt="" loading="eager">
      </div>
      <div class="detail-body">
        <div class="detail-category">${escapeHTML(event.categoryLabel)}</div>
        <h2 class="detail-title">${escapeHTML(event.title)}</h2>
        <p class="detail-description">${escapeHTML(event.description)}</p>
        <dl class="detail-grid">
          <div><dt>Published</dt><dd>${escapeHTML(event.date)}</dd></div>
          <div><dt>Location</dt><dd>${escapeHTML(event.region)}</dd></div>
        </dl>
        <section class="detail-section">
          <h3>Aviation Effect</h3>
          <p class="detail-description">${escapeHTML(event.aviationEffect)}</p>
        </section>
      </div>`;
  }

  function selectEvent(id) {
    state.selectedId = id;
    renderFeed();
    renderDetail();
  }

  document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach(item => item.classList.toggle("is-active", item === button));
      const visible = visibleEvents();
      if (!visible.some(event => event.id === state.selectedId) && visible.length) state.selectedId = visible[0].id;
      renderFeed();
      renderDetail();
    });
  });

  function refreshFromClock() {
    refreshAvailableEvents();
    renderFeed();
    renderDetail();
  }

  const clock = document.getElementById("acs-clock");
  if (clock && typeof MutationObserver === "function") {
    new MutationObserver(refreshFromClock).observe(clock, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  refreshFromClock();
})();
