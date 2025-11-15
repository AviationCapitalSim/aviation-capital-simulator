<!-- ===========================================================
     === BUY AIRCRAFT (Dynamic Marketplace Style) — ACS v2.0 ===
     =========================================================== -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Buy Aircraft - Aviation Capital Simulator</title>
  <link rel="stylesheet" href="styles.css?v=3.1" />

  <style>
    body {
      margin: 0;
      background: #081530;
      color: white;
      font-family: "Segoe UI", sans-serif;
    }

    h2 {
      color: #FFB300;
      margin-top: 5rem;
      text-align: center;
      font-size: 1.6rem;
    }

    .sub { 
      text-align: center; 
      color: #ccc; 
      margin-bottom: 1.5rem; 
    }

    /* === FILTER CHIPS (Used Market Style) === */
    .filter-bar {
      display: flex;
      gap: .6rem;
      padding: .8rem;
      overflow-x: auto;
      scrollbar-width: thin;
      margin: 0 auto 1.2rem;
      max-width: 1300px;
    }

    .chip {
      padding: .45rem 1rem;
      background: #0f203c;
      color: #ccc;
      border: 1px solid #FFB30066;
      border-radius: 20px;
      white-space: nowrap;
      cursor: pointer;
      font-size: .85rem;
      transition: 0.2s;
    }

    .chip.active {
      background: #FFB300;
      color: #081530;
      font-weight: bold;
    }

    /* === CARDS GRID === */
    .aircraft-grid {
      max-width: 1300px;
      margin: auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
      padding: 0 1rem 2rem;
    }

    .aircraft-card {
      background: #102040;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 3px 8px rgba(0,0,0,.35);
      transition: transform .25s;
      cursor: pointer;
    }
    .aircraft-card:hover {
      transform: scale(1.02);
    }

    .aircraft-card img {
      width: 100%;
      height: 160px;
      object-fit: cover;
      background: #000;
    }

    .ac-info {
      padding: .7rem 1rem .9rem;
    }

    .ac-info h3 {
      margin: 0;
      color: #FFB300;
      font-size: 1rem;
    }

    .ac-info p {
      margin: 2px 0;
      color: #cfd8dc;
      font-size: .8rem;
    }

    .price {
      color: #42a5f5;
      font-weight: bold;
      margin-top: .4rem;
    }

    .btn-row {
      display: flex;
      gap: .4rem;
      margin-top: .8rem;
    }
    .btn-row button {
      flex: 1;
      border: none;
      padding: .5rem 0;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: .8rem;
    }
    .buy-btn { background:#1565c0; color:white; }
    .buy-btn:hover { background:#0d47a1; }
    .info-btn { background:#FFB300; color:#102040; }
    .info-btn:hover { background:#ffcc33; }

    /* === INFO MODAL === */
    .modal {
      display:none;
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.6);
      z-index:1000;
      justify-content:center;
      align-items:center;
    }
    .modal-content, .modal-specs {
      background:#102040;
      padding:1.5rem;
      border-radius:12px;
      max-width:500px;
      color:white;
    }
    .modal-specs h2 { color:#FFB300; text-align:center; margin:0 0 1rem; }
    .modal-specs ul { list-style:none; padding:0; }
    .modal-specs li { margin-bottom:.5rem; }
    .close-btn {
      margin-top:1rem;
      padding:.5rem 1rem;
      background:#00a86b;
      border:none;
      color:white;
      border-radius:8px;
      cursor:pointer;
    }
  </style>
</head>

<body>
  <!-- === HEADER === -->
  <header class="acs-header">
    <div class="acs-logo">
      <img src="acs_logo.png" alt="ACS Logo">
      <h1>Aviation Capital Simulator</h1>
    </div>

    <nav class="acs-nav">
      <a href="dashboard.html">Main</a>
      <a href="finance.html">Finance</a>
      <a href="aircraft.html" class="active">Aircraft</a>
      <a href="routes.html">Routes</a>
      <a href="hr.html">HR</a>
      <a href="forum.html">Forum</a>
      <a href="support.html">Support</a>
    </nav>

    <div class="acs-auth">
      <a href="#" onclick="handleLogout()">Logout</a>
    </div>

    <div class="acs-clock-header" id="acs-clock">00:00 — 01 JAN 1940</div>
  </header>

  <main>
    <h2>Buy New Aircraft</h2>
    <p class="sub">Select your manufacturer and choose your next aircraft.</p>

    <!-- FILTER BAR -->
    <div id="filterBar" class="filter-bar"></div>

    <!-- GRID -->
    <div id="aircraftGrid" class="aircraft-grid"></div>
  </main>

  <!-- INFO MODAL -->
  <div id="infoModal" class="modal">
    <div class="modal-specs">
      <h2 id="infoTitle"></h2>
      <ul id="infoList"></ul>
      <button class="close-btn" onclick="closeInfoModal()">Close</button>
    </div>
  </div>

  <!-- ====================== SCRIPTS ====================== -->
  <script src="engine/time_engine.js"></script>
  <script src="engine/acs_aircraft_db.js"></script>
  <script src="engine/acs_buy_aircraft.js"></script>

  <script>
    document.addEventListener("DOMContentLoaded", () => {
      if (typeof registerTimeListener === "function") {
        registerTimeListener(updateClockDisplay);
        updateClockDisplay();
      }
    });
  </script>

</body>
</html>
