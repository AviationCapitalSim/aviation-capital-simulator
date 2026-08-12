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
  const events = [];

  const stageLabels = ["Scheduled", "Developing", "Active", "Recovery", "Closed"];
  const state = { filter: "all", selectedId: null };
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

  function visibleEvents() {
    return state.filter === "all" ? events : events.filter(event => event.category === state.filter);
  }

  function cardTemplate(event) {
    const selected = event.id === state.selectedId;
    return `
      <button class="event-card${selected ? " is-selected" : ""}" type="button" data-event-id="${escapeHTML(event.id)}" aria-pressed="${selected}">
        <span class="event-image"><img src="${escapeHTML(event.image)}" alt="" loading="eager"></span>
        <span class="event-card-body">
          <span class="event-eyebrow">
            <span class="event-category">${escapeHTML(event.categoryLabel)}</span>
            <span class="event-state state-${escapeHTML(event.state)}">${escapeHTML(event.stateLabel)}</span>
          </span>
          <span class="event-title">${escapeHTML(event.title)}</span>
          <span class="event-summary">${escapeHTML(event.summary)}</span>
          <span class="event-meta">
            <span>Date <b>${escapeHTML(event.date)}</b></span>
            <span>Region <b>${escapeHTML(event.region)}</b></span>
            <span>Priority <b>${escapeHTML(event.priority)}</b></span>
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
    activeCount.textContent = String(events.filter(event => event.state === "active").length).padStart(2, "0");
    regionCount.textContent = String(new Set(events.map(event => event.region).filter(Boolean)).size).padStart(2, "0");
    operationsReadiness.textContent = events.some(event => event.state === "active") ? "ELEVATED" : "STANDBY";
    operationsReadiness.classList.toggle("tone-gold", events.some(event => event.state === "active"));
    operationsReadiness.classList.toggle("tone-green", !events.some(event => event.state === "active"));

    feed.querySelectorAll("[data-event-id]").forEach(card => {
      card.addEventListener("click", () => selectEvent(card.dataset.eventId));
    });
  }

  function timelineTemplate(event) {
    return stageLabels.map((label, index) => {
      const status = index < event.stage ? " is-complete" : index === event.stage ? " is-current" : "";
      return `<span class="timeline-step${status}">${escapeHTML(label)}</span>`;
    }).join("");
  }

  function renderDetail() {
    const event = events.find(item => item.id === state.selectedId) || visibleEvents()[0] || events[0];
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
        <span class="detail-severity">${escapeHTML(event.severity)}</span>
      </div>
      <div class="detail-body">
        <div class="detail-category">${escapeHTML(event.categoryLabel)}</div>
        <h2 class="detail-title">${escapeHTML(event.title)}</h2>
        <p class="detail-description">${escapeHTML(event.description)}</p>
        <dl class="detail-grid">
          <div><dt>Official date</dt><dd>${escapeHTML(event.date)}</dd></div>
          <div><dt>Current state</dt><dd>${escapeHTML(event.stateLabel)}</dd></div>
          <div><dt>Geographic scope</dt><dd>${escapeHTML(event.scope)}</dd></div>
          <div><dt>Historical source</dt><dd>${escapeHTML(event.source)}</dd></div>
        </dl>
        <section class="detail-section">
          <h3>Operational Impact</h3>
          <ul class="impact-list">${event.impacts.map(([label, value]) => `<li><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></li>`).join("")}</ul>
        </section>
        <section class="detail-section">
          <h3>Event Lifecycle</h3>
          <div class="timeline">${timelineTemplate(event)}</div>
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

  renderFeed();
  renderDetail();
})();
