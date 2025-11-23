/* ============================================================
   === ACS TUTORIAL v2 — Qatar Luxury PRO ======================
   === 12 pasos — Dashboard completo ===========================
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  const steps = [
    { el: null, text: "Welcome to the ACS Dashboard. Let's take a quick tour." },

    { el: ".acs-nav a.active", text: "This is the Main panel — your control center." },

    { el: ".acs-nav", text: "This is the ACS navigation menu. From here you move across modules." },

    { el: ".acs-clock-header", text: "This is the ACS Time Engine — simulated real-time clock." },

    { el: ".panel:nth-child(1)", text: "Top Earning Aircraft — your most profitable aircraft appear here." },

    { el: ".panel:nth-child(2)", text: "Bank Overview — monthly and weekly growth analytics." },

    { el: ".panel:nth-child(3)", text: "Company Value — total market capitalization of your airline." },

    { el: ".row-operations .panel:nth-child(1)", text: "Operational Alerts — maintenance, loans and important status warnings." },

    { el: ".row-operations .panel:nth-child(2)", text: "Global News — external events that impact demand and revenue." },

    { el: ".row-operations .panel:nth-child(3)", text: "Settings — preferences, sync and system options." },

    { el: ".panel h3:contains('Credits'), .row-capital .panel:nth-child(1)", 
      text: "Credits — AC$ is the internal ACS currency used for purchases and expansions." 
    },

    { el: null, text: "Tutorial completed. You're ready to command your airline!" }
  ];

  let stepIndex = 0;

  const box = document.createElement("div");
  box.className = "tutorial-box";
  document.body.appendChild(box);

  function highlightElement(selector) {
    document.querySelectorAll(".tutorial-highlight").forEach(e => {
      e.classList.remove("tutorial-highlight");
    });

    if (!selector) return;

    const target = document.querySelector(selector);
    if (target) target.classList.add("tutorial-highlight");
  }

  function showStep() {
    const step = steps[stepIndex];
    box.innerHTML = `
      <div>${step.text}</div>
      <button class="tutorial-next-btn">Next</button>
    `;

    highlightElement(step.el);

    box.classList.add("show");

    box.querySelector(".tutorial-next-btn").onclick = () => {
      stepIndex++;
      if (stepIndex >= steps.length) {
        box.classList.remove("show");
        highlightElement(null);
      } else {
        showStep();
      }
    };
  }

  // Start tutorial automatically only first time
  if (!localStorage.getItem("ACS_tutorialDone")) {
    setTimeout(showStep, 1200);
    localStorage.setItem("ACS_tutorialDone", "yes");
  }
});
