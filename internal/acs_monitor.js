/* ============================================================
   🛡️ ACS OCC — SYSTEM GUARDIAN
   PRIVATE OPERATIONS CONTROL CENTER
   ------------------------------------------------------------
   Purpose:
   - Crear el administrador inicial de Guardian.
   - Gestionar el acceso administrativo privado.
   - Mostrar almacenamiento, PostgreSQL y WAL.
   - Mostrar tablas, políticas, alertas y auditoría.
   - Mantener el token únicamente en memoria.
   - No utilizar localStorage.
   - No ejecutar limpiezas automáticamente.
   ------------------------------------------------------------
   Version: v2.0 | Date: 16 AUG 2026
   ============================================================ */

(() => {
  "use strict";

  const API_ROOT =
    document.documentElement.dataset.apiRoot;

  const state = {
    accessToken: null,
    expiresAt: null,
    administrator: null,
    refreshTimer: null
  };

  const byId = (id) =>
    document.getElementById(id);

  const number = (value) =>
    Number(value || 0);

  const formatMB = (value) =>
    value === null ||
    value === undefined
      ? "—"
      : `${number(value).toFixed(1)} MB`;

  const formatNumber = (value) =>
    number(value).toLocaleString("es-ES");

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleString("es-ES")
      : "—";

  const safe = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character]
    );

  function text(id, value) {
    const node = byId(id);

    if (node) {
      node.textContent =
        value ?? "—";
    }
  }

  function showError(id, message) {
    const node = byId(id);

    node.textContent = message;
    node.style.display = "block";
  }

  function clearError(id) {
    const node = byId(id);

    node.textContent = "";
    node.style.display = "none";
  }

  const messages = {
    GUARDIAN_SETUP_KEY_NOT_CONFIGURED:
      "La clave temporal no está configurada en Railway.",

    GUARDIAN_SETUP_KEY_INVALID:
      "La clave temporal no es correcta.",

    GUARDIAN_SETUP_ALREADY_COMPLETED:
      "El administrador Guardian ya fue creado.",

    GUARDIAN_PASSWORD_REQUIRES_12_CHARACTERS:
      "La contraseña debe tener al menos 12 caracteres.",

    GUARDIAN_CREDENTIALS_INVALID:
      "Correo o contraseña incorrectos.",

    GUARDIAN_ACCOUNT_TEMPORARILY_LOCKED:
      "Acceso bloqueado temporalmente por intentos fallidos.",

    GUARDIAN_ACCESS_TOKEN_INVALID:
      "La sesión Guardian venció. Ingresa nuevamente."
  };

  async function api(
    path,
    {
      method = "GET",
      body,
      protectedRoute = false
    } = {}
  ) {
    const headers = {
      "Content-Type": "application/json"
    };

    if (
      protectedRoute &&
      state.accessToken
    ) {
      headers.Authorization =
        `Bearer ${state.accessToken}`;
    }

    const response = await fetch(
      `${API_ROOT}${path}`,
      {
        method,
        headers,

        body:
          body
            ? JSON.stringify(body)
            : undefined,

        cache: "no-store",
        credentials: "omit"
      }
    );

    const payload =
      await response
        .json()
        .catch(() => ({}));

    if (
      !response.ok ||
      payload.ok === false
    ) {
      const error = new Error(
        messages[payload.error] ||
        payload.error ||
        `HTTP ${response.status}`
      );

      error.code = payload.error;
      error.status = response.status;

      throw error;
    }

    return payload;
  }

  function openLogin() {
    if (byId("setupDialog").open) {
      byId("setupDialog").close();
    }

    clearError("loginError");

    byId("loginDialog").showModal();
  }

  async function initialize() {
    try {
      const status =
        await api(
          "/guardian/setup-status"
        );

      if (status.setupRequired) {
        byId(
          "setupDialog"
        ).showModal();
      } else {
        openLogin();
      }
    } catch (error) {
      text(
        "accessStatus",
        "Guardian no disponible"
      );

      window.alert(
        `No se pudo iniciar Guardian: ${error.message}`
      );
    }
  }

  async function createAdministrator(
    event
  ) {
    event.preventDefault();

    clearError("setupError");

    const password =
      byId("setupPassword").value;

    if (
      password !==
      byId("setupPasswordRepeat").value
    ) {
      showError(
        "setupError",
        "Las contraseñas no coinciden."
      );

      return;
    }

    byId(
      "setupButton"
    ).disabled = true;

    try {
      await api(
        "/guardian/setup",
        {
          method: "POST",

          body: {
            displayName:
              byId("setupName").value,

            email:
              byId("setupEmail").value,

            password,

            setupKey:
              byId("setupKey").value
          }
        }
      );

      byId(
        "setupPassword"
      ).value = "";

      byId(
        "setupPasswordRepeat"
      ).value = "";

      byId(
        "setupKey"
      ).value = "";

      openLogin();

      window.alert(
        "Administrador creado. Ya puedes entrar a ACS Guardian."
      );
    } catch (error) {
      showError(
        "setupError",
        error.message
      );
    } finally {
      byId(
        "setupButton"
      ).disabled = false;
    }
  }

  async function login(event) {
    event.preventDefault();

    clearError("loginError");

    byId(
      "loginButton"
    ).disabled = true;

    try {
      const payload =
        await api(
          "/guardian/access",
          {
            method: "POST",

            body: {
              email:
                byId("loginEmail").value,

              password:
                byId("loginPassword").value
            }
          }
        );

      state.accessToken =
        payload.accessToken;

      state.expiresAt =
        payload.expiresAt;

      state.administrator =
        payload.administrator;

      byId(
        "loginPassword"
      ).value = "";

      byId(
        "loginDialog"
      ).close();

      byId(
        "dashboard"
      ).classList.remove(
        "hidden"
      );

      byId(
        "logoutButton"
      ).classList.remove(
        "hidden"
      );

      byId(
        "refreshButton"
      ).disabled = false;

      text(
        "accessStatus",
        `Conectado · ${payload.administrator.displayName}`
      );

      byId(
        "accessStatus"
      ).className =
        "status STABLE";

      await refresh();

      state.refreshTimer =
        window.setInterval(
          () =>
            refresh().catch(
              handleSessionError
            ),
          60000
        );
    } catch (error) {
      showError(
        "loginError",
        error.message
      );
    } finally {
      byId(
        "loginButton"
      ).disabled = false;
    }
  }

  function renderSupervisor(
  supervisor
) {
  const panel =
    byId("supervisorPanel");

  panel.classList.remove(
    "hidden"
  );

  if (!supervisor) {
    text(
      "supervisorStatus",
      "NO DISPONIBLE"
    );

    byId(
      "supervisorStatus"
    ).className =
      "pill CRITICAL";

    text(
      "supervisorLastSuccess",
      "Sin revisión registrada"
    );

    text(
      "supervisorInterval",
      "—"
    );

    text(
      "supervisorAuthorization",
      "BLOQUEADA"
    );

    return;
  }

  const statusNames = {
    STARTING:
      "INICIANDO",

    RUNNING:
      "REVISANDO",

    SUCCESS:
      "OPERATIVO",

    FAILED:
      "FALLO",

    STANDBY:
      "EN ESPERA",

    DISABLED:
      "DESACTIVADO"
  };

  const statusClass =
    supervisor.status === "SUCCESS"
      ? "STABLE"
      : (
          supervisor.status === "FAILED" ||
          supervisor.status === "DISABLED"
        )
        ? "CRITICAL"
        : "WARNING";

  text(
    "supervisorStatus",

    statusNames[
      supervisor.status
    ] ||
    supervisor.status
  );

  byId(
    "supervisorStatus"
  ).className =
    `pill ${statusClass}`;

  text(
    "supervisorLastSuccess",

    formatDate(
      supervisor.last_success_at
    )
  );

  const intervalMinutes =
    Math.max(
      1,

      Math.round(
        number(
          supervisor
            .scan_interval_seconds
        ) / 60
      )
    );

  text(
    "supervisorInterval",
    `Cada ${intervalMinutes} minutos`
  );

  text(
    "supervisorAuthorization",

    supervisor.automatic_cleanup
      ? "ERROR: AUTOMÁTICA"
      : "SOLO CON TU AUTORIZACIÓN"
  );

  byId(
    "supervisorAuthorization"
  ).className =
    supervisor.automatic_cleanup
      ? "CRITICAL"
      : "STABLE";
}
   
  function renderStorage(storage) {
    const volume =
      storage.volume;

    const postgres =
      storage.postgresql;

    text(
      "volumePercent",

      volume.estimatedPercent === null
        ? "—"
        : `${volume.estimatedPercent}%`
    );

    text(
      "volumeSource",
      volume.source
    );

    text(
      "usedMB",
      formatMB(
        volume.estimatedUsedMB
      )
    );

    text(
      "freeMB",
      formatMB(
        volume.estimatedFreeMB
      )
    );

    text(
      "walMB",
      formatMB(
        postgres.walMB
      )
    );

    text(
      "storageSeverity",
      volume.severity
    );

    byId(
      "storageSeverity"
    ).className =
      volume.severity;

    const percent =
      Math.min(
        100,
        Math.max(
          0,
          number(
            volume.estimatedPercent
          )
        )
      );

    byId(
      "volumeBar"
    ).style.width =
      `${percent}%`;

    byId(
      "volumeBar"
    ).style.background =
      percent >= 90
        ? "var(--red)"
        : percent >= 75
          ? "var(--yellow)"
          : "var(--green)";

    byId(
      "tablesBody"
    ).innerHTML =
      storage.largestTables
        .map(
          (row) => `
            <tr>
              <td>
                ${safe(row.table)}
              </td>

              <td>
                ${formatMB(row.totalMB)}
              </td>

              <td>
                ${formatMB(row.tableMB)}
              </td>

              <td>
                ${formatMB(row.indexMB)}
              </td>

              <td>
                ${formatNumber(
                  row.estimatedRows
                )}
              </td>
            </tr>
          `
        )
        .join("");
  }

  function renderDiagnostics(
    diagnostics
  ) {
    const statusNames = {
      CLEAN:
        "LIMPIO",

      MONITORING:
        "VIGILANDO",

      ATTENTION:
        "REQUIERE ATENCIÓN"
    };

    const notes = {
      CLEAN:
        "No existen registros históricos eliminables.",

      MONITORING:
        "Hay registros eliminables, pero todavía no alcanzan el límite configurado.",

      ATTENTION:
        "El límite configurado fue alcanzado. Guardian recomendará preparar una limpieza supervisada."
    };

    if (!diagnostics.length) {
      byId(
        "diagnostics"
      ).innerHTML = `
        <div class="empty">
          No se recibieron diagnósticos.
        </div>
      `;

      return;
    }

    byId(
      "diagnostics"
    ).innerHTML =
      diagnostics
        .map((item) => {
          const metrics =
            item.metrics || {};

          const policy =
            item.policy || {};

          const extras = [];

          if (
            metrics.relatedPassengerRows !==
            undefined
          ) {
            extras.push(`
              <div>
                <span>
                  Resultados de pasajeros
                </span>

                <strong>
                  ${formatNumber(
                    metrics.relatedPassengerRows
                  )}
                </strong>
              </div>
            `);
          }

          if (
            metrics.closedFlightSets !==
            undefined
          ) {
            extras.push(`
              <div>
                <span>
                  Vuelos financieros
                </span>

                <strong>
                  ${formatNumber(
                    metrics.closedFlightSets
                  )}
                </strong>
              </div>
            `);
          }

          if (
  metrics.affectedAirlines !==
  undefined
) {
  extras.push(`
    <div>
      <span>
        Compañías involucradas
      </span>

      <strong>
        ${formatNumber(
          metrics.affectedAirlines
        )}
      </strong>
    </div>
  `);
}
   
          return `
            <article
              class="diagnostic ${safe(item.status)}"
            >
              <div class="diagnostic-title">
                <b>
                  ${safe(item.title)}
                </b>

                <span
                  class="pill ${safe(item.status)}"
                >
                  ${safe(
                    statusNames[item.status] ||
                    item.status
                  )}
                </span>
              </div>

              <strong class="diagnostic-value">
                ${formatNumber(
                  metrics.eligibleRows
                )}
              </strong>

              <span class="diagnostic-caption">
                filas eliminables detectadas
              </span>

              <div class="diagnostic-details">
                <div>
                  <span>
                    Tabla
                  </span>

                  <strong>
                    ${safe(item.table)}
                  </strong>
                </div>

                <div>
                  <span>
                    Tamaño total
                  </span>

                  <strong>
                    ${formatMB(
                      number(
                        metrics.totalBytes
                      ) / 1048576
                    )}
                  </strong>
                </div>

                ${extras.join("")}

                <div>
                  <span>
                    Primer registro
                  </span>

                  <strong>
                    ${safe(
                      formatDate(
                        metrics.firstEligibleAt
                      )
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Último registro
                  </span>

                  <strong>
                    ${safe(
                      formatDate(
                        metrics.lastEligibleAt
                      )
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Límite de filas
                  </span>

                  <strong>
                    ${formatNumber(
                      policy.eligibleRowThreshold
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Límite de tabla
                  </span>

                  <strong>
                    ${formatMB(
                      number(
                        policy.tableByteThreshold
                      ) / 1048576
                    )}
                  </strong>
                </div>
              </div>

              <div class="diagnostic-note">
                ${safe(
                  notes[item.status] ||
                  "Estado pendiente."
                )}

                Ejecución automática: NO.
              </div>
            </article>
          `;
        })
        .join("");
  }

  function renderPolicies(policies) {
    const names = {
      FLIGHT_HISTORY_COMPACTION:
        "Historial de vuelos cerrados",

      FINANCE_CLOSED_DETAIL_COMPACTION:
        "Detalle financiero cerrado",

      OCC_DELETED_ALERTS_COMPACTION:
        "Mensajes OCC borrados"
    };

    byId(
      "policies"
    ).innerHTML =
      policies
        .map(
          (policy) => `
            <div class="policy">
              <b>
                ${safe(
                  names[
                    policy.action_type
                  ] ||
                  policy.action_type
                )}
              </b>

              <span>
                Alerta:
                ${formatNumber(
                  policy.eligible_row_threshold
                )}
                filas o
                ${formatMB(
                  number(
                    policy.table_byte_threshold
                  ) / 1048576
                )}
              </span>

              <span>
                Estado:
                ${
                  policy.enabled
                    ? "ACTIVA"
                    : "DESACTIVADA"
                }
                · Ejecución automática: NO
              </span>
            </div>
          `
        )
        .join("");
  }

  function renderAlerts(alerts) {
    byId(
      "alerts"
    ).innerHTML =
      alerts.length
        ? alerts
            .map(
              (alert) => `
                <div
                  class="item ${safe(
                    alert.severity
                  )}"
                >
                  <b>
                    ${safe(alert.title)}
                  </b>

                  <span>
                    ${safe(alert.message)}
                  </span>
                </div>
              `
            )
            .join("")
        : `
            <div class="empty">
              Sin alertas activas.
            </div>
          `;
  }

  function renderAudit(entries) {
    byId(
      "auditBody"
    ).innerHTML =
      entries.length
        ? entries
            .map(
              (entry) => `
                <tr>
                  <td>
                    ${safe(
                      formatDate(
                        entry.created_at
                      )
                    )}
                  </td>

                  <td>
                    ${safe(
                      entry.display_name ||
                      entry.email ||
                      "Sistema"
                    )}
                  </td>

                  <td>
                    ${safe(
                      entry.event_type
                    )}
                  </td>

                  <td>
                    ${safe(
                      JSON.stringify(
                        entry.details || {}
                      )
                    )}
                  </td>
                </tr>
              `
            )
            .join("")
        : `
            <tr>
              <td colspan="4">
                Sin registros.
              </td>
            </tr>
          `;
  }

  async function refresh() {
    byId(
      "refreshButton"
    ).disabled = true;

    try {
      const [
        dashboard,
        audit
      ] = await Promise.all([
        api(
          "/guardian/dashboard",
          {
            protectedRoute: true
          }
        ),

        api(
          "/guardian/audit",
          {
            protectedRoute: true
          }
        )
      ]);

      renderStorage(
        dashboard.storage
      );

      renderSupervisor(
        dashboard.supervisor
      );       
      renderDiagnostics(
        dashboard.diagnostics || []
      );

      renderPolicies(
        dashboard.policies
      );

      renderAlerts(
        dashboard.alerts
      );

      renderAudit(
        audit.audit
      );

      text(
        "lastUpdate",
        `Actualizado ${
          new Date().toLocaleTimeString(
            "es-ES"
          )
        }`
      );
    } finally {
      byId(
        "refreshButton"
      ).disabled = false;
    }
  }

  function handleSessionError(error) {
    if (error.status === 401) {
      state.accessToken = null;

      window.clearInterval(
        state.refreshTimer
      );

      byId(
        "dashboard"
      ).classList.add(
        "hidden"
      );

      byId(
        "logoutButton"
      ).classList.add(
        "hidden"
      );

      text(
        "accessStatus",
        "Sesión vencida"
      );

      openLogin();
    } else {
      window.alert(
        `Guardian: ${error.message}`
      );
    }
  }

  async function logout() {
    try {
      await api(
        "/guardian/logout",
        {
          method: "POST",
          protectedRoute: true
        }
      );
    } catch {
      // The local session is closed even if
      // the server is temporarily unavailable.
    }

    state.accessToken = null;

    window.clearInterval(
      state.refreshTimer
    );

    byId(
      "dashboard"
    ).classList.add(
      "hidden"
    );

    byId(
      "logoutButton"
    ).classList.add(
      "hidden"
    );

    byId(
      "refreshButton"
    ).disabled = true;

    text(
      "accessStatus",
      "Acceso bloqueado"
    );

    openLogin();
  }

  byId(
    "setupForm"
  ).addEventListener(
    "submit",
    createAdministrator
  );

  byId(
    "loginForm"
  ).addEventListener(
    "submit",
    login
  );

  byId(
    "refreshButton"
  ).addEventListener(
    "click",
    () =>
      refresh().catch(
        handleSessionError
      )
  );

  byId(
    "logoutButton"
  ).addEventListener(
    "click",
    logout
  );

  initialize();
})();
