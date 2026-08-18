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
   Version: v2.1 | Date: 18 AUG 2026
   ============================================================ */

(() => {
  "use strict";

  const API_ROOT =
    document.documentElement.dataset.apiRoot;

  const state = {
    accessToken: null,
    expiresAt: null,
    administrator: null,
    refreshTimer: null,
    preview: null,
    previewTimer: null,
    actionBusy: false
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

  const formatBytesAsMB = (value) =>
    formatMB(
      number(value) /
      1048576
    );

  const formatNumber = (value) =>
    number(value).toLocaleString(
      "es-ES"
    );

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleString(
          "es-ES"
        )
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
      "La sesión Guardian venció. Ingresa nuevamente.",

    GUARDIAN_ACTION_THRESHOLD_NOT_REACHED:
      "La limpieza todavía no alcanzó el límite configurado.",

    GUARDIAN_ACTION_HAS_NO_ELIGIBLE_ROWS:
      "No existen registros elegibles para esta limpieza.",

    GUARDIAN_ACTION_PREVIEW_EXPIRED:
      "La propuesta venció. Prepara una nueva vista previa.",

    GUARDIAN_ACTION_NOT_PREVIEWED:
      "La propuesta ya no está disponible.",

    GUARDIAN_ACTION_TOKEN_INVALID:
      "El token temporal de la propuesta no es válido.",

    GUARDIAN_CONFIRMATION_PHRASE_INVALID:
      "La frase de autorización no coincide exactamente.",

    GUARDIAN_PREVIEW_DATA_CHANGED:
      "Los registros cambiaron desde la vista previa. Guardian canceló la ejecución; prepara una propuesta nueva.",

    GUARDIAN_ANOTHER_ACTION_IS_RUNNING:
      "Ya existe otra limpieza Guardian en ejecución.",

    GUARDIAN_OPERATIONAL_TABLE_BUSY:
      "La tabla está ocupada por ACS. No se modificó nada; inténtalo nuevamente más tarde.",

    GUARDIAN_UNEXPECTED_FOREIGN_KEY:
      "Guardian encontró una relación no prevista y canceló toda la operación.",

    GUARDIAN_TARGET_HAS_USER_TRIGGER:
      "Guardian encontró un trigger no previsto y canceló toda la operación.",

    GUARDIAN_FINANCE_PROTECTED_REFERENCE_FOUND:
      "Guardian encontró un asiento fiscal vinculado a los registros eliminables y canceló toda la operación.",

    GUARDIAN_FINANCE_DELETE_COUNT_MISMATCH:
      "El número de detalles financieros eliminados no coincidió con la propuesta. Guardian revirtió toda la operación.",

    GUARDIAN_EXECUTION_RATE_LIMIT:
      "Se alcanzó el límite de intentos. Espera 15 minutos."
  };

  function text(
    id,
    value
  ) {
    const node = byId(id);

    if (node) {
      node.textContent =
        value ?? "—";
    }
  }

  function showError(
    id,
    message
  ) {
    const node = byId(id);

    node.textContent = message;
    node.style.display = "block";
  }

  function clearError(id) {
    const node = byId(id);

    node.textContent = "";
    node.style.display = "none";
  }

  async function api(
    path,
    {
      method = "GET",
      body,
      protectedRoute = false
    } = {}
  ) {
    const headers = {
      "Content-Type":
        "application/json"
    };

    if (
      protectedRoute &&
      state.accessToken
    ) {
      headers.Authorization =
        `Bearer ${state.accessToken}`;
    }

    const response =
      await fetch(
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
      const errorCode =
        payload.error;

      const error =
        new Error(
          messages[errorCode] ||
          errorCode ||
          `HTTP ${response.status}`
        );

      error.code = errorCode;
      error.status =
        response.status;

      throw error;
    }

    return payload;
  }

  function openLogin() {
    if (
      byId("setupDialog").open
    ) {
      byId("setupDialog").close();
    }

    clearError("loginError");

    if (
      !byId("loginDialog").open
    ) {
      byId("loginDialog")
        .showModal();
    }
  }

  async function initialize() {
    try {
      const status =
        await api(
          "/guardian/setup-status"
        );

      if (status.setupRequired) {
        byId("setupDialog")
          .showModal();
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
      byId(
        "setupPasswordRepeat"
      ).value
    ) {
      showError(
        "setupError",
        "Las contraseñas no coinciden."
      );

      return;
    }

    byId("setupButton").disabled =
      true;

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

    byId("loginButton").disabled =
      true;

    try {
      const payload =
        await api(
          "/guardian/access",
          {
            method: "POST",

            body: {
              email:
                byId(
                  "loginEmail"
                ).value,

              password:
                byId(
                  "loginPassword"
                ).value
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
    
    const supervisorPanel =
      byId("supervisorPanel");

    if (supervisorPanel) {
      supervisorPanel.classList.remove("hidden");
    }
    
    if (!supervisor) {
      text(
        "supervisorStatus",
        "SIN ESTADO"
      );

      byId(
        "supervisorStatus"
      ).className =
        "pill WARNING";

      text(
        "supervisorLastSuccess",
        "—"
      );

      text(
        "supervisorInterval",
        "—"
      );

      return;
    }

    const operational =
      supervisor.enabled === true &&
      supervisor.status !==
        "FAILED";

    text(
      "supervisorStatus",
      operational
        ? "OPERATIVO"
        : "REVISAR"
    );

    byId(
      "supervisorStatus"
    ).className =
      `pill ${
        operational
          ? "STABLE"
          : "CRITICAL"
      }`;

    text(
      "supervisorLastSuccess",
      formatDate(
        supervisor.last_success_at
      )
    );

    const seconds =
      number(
        supervisor
          .scan_interval_seconds
      );

    text(
      "supervisorInterval",

      seconds > 0
        ? `Cada ${Math.round(
            seconds / 60
          )} minutos`
        : "—"
    );
  }

  function renderStorage(
    storage
  ) {
    const volume =
      storage.volume;

    const postgres =
      storage.postgresql;

    text(
      "volumePercent",

      volume.estimatedPercent ===
        null
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
        .map((row) => `
          <tr>
            <td>
              ${safe(row.table)}
            </td>

            <td>
              ${formatMB(
                row.totalMB
              )}
            </td>

            <td>
              ${formatMB(
                row.tableMB
              )}
            </td>

            <td>
              ${formatMB(
                row.indexMB
              )}
            </td>

            <td>
              ${formatNumber(
                row.estimatedRows
              )}
            </td>
          </tr>
        `)
        .join("");
  }

  function renderPolicies(
    policies
  ) {
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
        .map((policy) => `
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
                policy
                  .eligible_row_threshold
              )}
              filas o
              ${formatBytesAsMB(
                policy
                  .table_byte_threshold
              )}
            </span>

            <span>
              Estado:
              ${
                policy.enabled
                  ? "ACTIVA"
                  : "DESACTIVADA"
              }
              · Ejecución automática:
              NO
            </span>
          </div>
        `)
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
        "El límite configurado fue alcanzado. Puedes preparar una limpieza supervisada."
    };

    byId(
      "diagnostics"
    ).innerHTML =
      diagnostics.length
        ? diagnostics
            .map((item) => {
              const metrics =
                item.metrics || {};

              const policy =
                item.policy || {};

              const extras = [];

              if (
                metrics
                  .relatedPassengerRows !==
                undefined
              ) {
                extras.push(`
                  <div>
                    <span>
                      Resultados de pasajeros
                    </span>

                    <strong>
                      ${formatNumber(
                        metrics
                          .relatedPassengerRows
                      )}
                    </strong>
                  </div>
                `);
              }

              if (
                metrics
                  .closedFlightSets !==
                undefined
              ) {
                extras.push(`
                  <div>
                    <span>
                      Vuelos financieros
                    </span>

                    <strong>
                      ${formatNumber(
                        metrics
                          .closedFlightSets
                      )}
                    </strong>
                  </div>
                `);
              }

              if (
                metrics
                  .affectedAirlines !==
                undefined
              ) {
                extras.push(`
                  <div>
                    <span>
                      Compañías involucradas
                    </span>

                    <strong>
                      ${formatNumber(
                        metrics
                          .affectedAirlines
                      )}
                    </strong>
                  </div>
                `);
              }

              const available =
                item.thresholdReached ===
                  true &&
                number(
                  metrics.eligibleRows
                ) > 0;

              return `
                <article
                  class="
                    diagnostic
                    ${safe(
                      item.status
                    )}
                  "
                >
                  <div
                    class="
                      diagnostic-title
                    "
                  >
                    <b>
                      ${safe(
                        item.title
                      )}
                    </b>

                    <span
                      class="
                        pill
                        ${safe(
                          item.status
                        )}
                      "
                    >
                      ${safe(
                        statusNames[
                          item.status
                        ] ||
                        item.status
                      )}
                    </span>
                  </div>

                  <strong
                    class="
                      diagnostic-value
                    "
                  >
                    ${formatNumber(
                      metrics
                        .eligibleRows
                    )}
                  </strong>

                  <span
                    class="
                      diagnostic-caption
                    "
                  >
                    filas eliminables
                    detectadas
                  </span>

                  <div
                    class="
                      diagnostic-details
                    "
                  >
                    <div>
                      <span>
                        Tabla
                      </span>

                      <strong>
                        ${safe(
                          item.table
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Tamaño total
                      </span>

                      <strong>
                        ${formatBytesAsMB(
                          metrics.totalBytes
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
                            metrics
                              .firstEligibleAt
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
                            metrics
                              .lastEligibleAt
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
                          policy
                            .eligibleRowThreshold
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Límite de tabla
                      </span>

                      <strong>
                        ${formatBytesAsMB(
                          policy
                            .tableByteThreshold
                        )}
                      </strong>
                    </div>
                  </div>

                  <div
                    class="
                      diagnostic-note
                    "
                  >
                    ${safe(
                      notes[
                        item.status
                      ] ||
                      "Estado pendiente."
                    )}

                    Ejecución automática:
                    NO.
                  </div>

                  <button
                    class="
                      diagnostic-action
                      ${
                        available
                          ? "danger"
                          : ""
                      }
                    "

                    data-preview-action="
                      ${safe(
                        item.actionType
                      )}
                    "

                    ${
                      available
                        ? ""
                        : "disabled"
                    }
                  >
                    ${
                      available
                        ? "Preparar limpieza supervisada"
                        : "Disponible al alcanzar el límite"
                    }
                  </button>
                </article>
              `;
            })
            .join("")
        : `
          <div class="empty">
            No se recibieron
            diagnósticos.
          </div>
        `;
  }

  function renderAlerts(
    alerts
  ) {
    byId(
      "alerts"
    ).innerHTML =
      alerts.length
        ? alerts
            .map((alert) => `
              <div
                class="
                  item
                  ${safe(
                    alert.severity
                  )}
                "
              >
                <b>
                  ${safe(
                    alert.title
                  )}
                </b>

                <span>
                  ${safe(
                    alert.message
                  )}
                </span>
              </div>
            `)
            .join("")
        : `
          <div class="empty">
            Sin alertas activas.
          </div>
        `;
  }

  function renderAudit(
    entries
  ) {
    byId(
      "auditBody"
    ).innerHTML =
      entries.length
        ? entries
            .map((entry) => `
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
            `)
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
            protectedRoute:
              true
          }
        ),

        api(
          "/guardian/audit",
          {
            protectedRoute:
              true
          }
        )
      ]);

      renderSupervisor(
        dashboard.supervisor
      );

      renderStorage(
        dashboard.storage
      );

      renderDiagnostics(
        dashboard.diagnostics ||
        []
      );

      renderPolicies(
        dashboard.policies ||
        []
      );

      renderAlerts(
        dashboard.alerts ||
        []
      );

      renderAudit(
        audit.audit ||
        []
      );

      text(
        "lastUpdate",
        `Actualizado ${
          new Date()
            .toLocaleTimeString(
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

  function clearPreviewState() {
    window.clearInterval(
      state.previewTimer
    );

    state.previewTimer = null;
    state.preview = null;
    state.actionBusy = false;

    byId(
      "confirmationPhraseInput"
    ).value = "";

    byId(
      "executeActionButton"
    ).disabled = true;

    byId(
      "executeActionButton"
    ).textContent =
      "Autorizar y limpiar";

    byId(
      "cancelActionButton"
    ).disabled = false;
  }

  function updatePreviewExpiry() {
    if (!state.preview) {
      return;
    }

    const remainingMilliseconds =
      new Date(
        state.preview.expiresAt
      ).getTime() -
      Date.now();

    if (
      remainingMilliseconds <= 0
    ) {
      text(
        "actionExpiry",
        "Propuesta vencida"
      );

      byId(
        "executeActionButton"
      ).disabled = true;

      return;
    }

    const remainingSeconds =
      Math.ceil(
        remainingMilliseconds /
        1000
      );

    const minutes =
      Math.floor(
        remainingSeconds / 60
      );

    const seconds =
      remainingSeconds % 60;

    text(
      "actionExpiry",

      `Tiempo restante: ${
        minutes
      }:${
        String(seconds)
          .padStart(2, "0")
      }`
    );
  }

  function renderActionPreview(
    action
  ) {
    const preview =
      action.preview || {};

    text(
      "actionTitle",

      preview.title ||
      "Limpieza supervisada"
    );

    text(
      "requiredConfirmationPhrase",
      action.confirmationPhrase
    );

    byId(
      "actionSummary"
    ).innerHTML = `
      <div>
        <span>
          Tabla autorizada
        </span>

        <strong>
          ${safe(
            preview.table
          )}
        </strong>
      </div>

      <div>
        <span>
          Filas elegibles
        </span>

        <strong>
          ${formatNumber(
            preview.eligibleRows
          )}
        </strong>
      </div>

      ${
        preview
          .relatedPassengerRows !==
            null &&
        preview
          .relatedPassengerRows !==
            undefined
          ? `
            <div>
              <span>
                Resultados de pasajeros
                vinculados
              </span>

              <strong>
                ${formatNumber(
                  preview
                    .relatedPassengerRows
                )}
              </strong>
            </div>
          `
          : ""
      }

      <div>
        <span>
          Ejecución automática
        </span>

        <strong>
          NO
        </strong>
      </div>
    `;

    clearError(
      "actionError"
    );

    updatePreviewExpiry();

    state.previewTimer =
      window.setInterval(
        updatePreviewExpiry,
        1000
      );

    byId(
      "actionDialog"
    ).showModal();

    byId(
      "confirmationPhraseInput"
    ).focus();
  }

  async function preparePreview(
    actionType,
    button
  ) {
    if (
      state.actionBusy ||
      state.preview
    ) {
      return;
    }

    state.actionBusy = true;
    button.disabled = true;

    const originalLabel =
      button.textContent;

    button.textContent =
      "Preparando…";

    try {
      const payload =
        await api(
          "/guardian/actions/preview",
          {
            method: "POST",
            protectedRoute: true,

            body: {
              actionType
            }
          }
        );

      state.preview =
        payload.action;

      state.actionBusy = false;

      renderActionPreview(
        payload.action
      );
    } catch (error) {
      state.actionBusy = false;

      handleSessionError(
        error
      );
    } finally {
      button.disabled = false;
      button.textContent =
        originalLabel;
    }
  }

  async function cancelPreview() {
    if (
      !state.preview ||
      state.actionBusy
    ) {
      return;
    }

    state.actionBusy = true;

    clearError(
      "actionError"
    );

    byId(
      "cancelActionButton"
    ).disabled = true;

    byId(
      "executeActionButton"
    ).disabled = true;

    try {
      await api(
        `/guardian/actions/${
          encodeURIComponent(
            state.preview.id
          )
        }/cancel`,

        {
          method: "POST",
          protectedRoute: true
        }
      );

      byId(
        "actionDialog"
      ).close();

      clearPreviewState();

      await refresh();
    } catch (error) {
      if (
        error.code ===
          "GUARDIAN_ACTION_PREVIEW_EXPIRED" ||
        error.code ===
          "GUARDIAN_ACTION_NOT_PREVIEWED"
      ) {
        byId(
          "actionDialog"
        ).close();

        clearPreviewState();

        await refresh().catch(
          handleSessionError
        );

        return;
      }

      state.actionBusy = false;

      byId(
        "cancelActionButton"
      ).disabled = false;

      showError(
        "actionError",
        error.message
      );
    }
  }

  function renderActionResult(
    action
  ) {
    const result =
      action.result || {};

    byId(
      "resultSummary"
    ).innerHTML = `
      <div>
        <span>
          Acción
        </span>

        <strong>
          ${safe(
            action.actionType
          )}
        </strong>
      </div>

      <div>
        <span>
          Filas eliminadas
        </span>

        <strong>
          ${formatNumber(
            result.removedRows
          )}
        </strong>
      </div>

      <div>
        <span>
          Filas conservadas
        </span>

        <strong>
          ${formatNumber(
            result.preservedRows
          )}
        </strong>
      </div>

      ${
        number(
          result
            .relatedPassengerRowsRemoved
        ) > 0
          ? `
            <div>
              <span>
                Resultados de pasajeros
                eliminados
              </span>

              <strong>
                ${formatNumber(
                  result
                    .relatedPassengerRowsRemoved
                )}
              </strong>
            </div>
          `
          : ""
      }

      <div>
        <span>
          Espacio recuperado
          estimado
        </span>

        <strong>
          ${formatBytesAsMB(
            result
              .releasedBytesEstimate
          )}
        </strong>
      </div>

      <div>
        <span>
          Estado PostgreSQL
        </span>

        <strong>
          COMPLETED
        </strong>
      </div>
    `;

    byId(
      "resultDialog"
    ).showModal();
  }

  async function executePreview(
    event
  ) {
    event.preventDefault();

    if (
      !state.preview ||
      state.actionBusy
    ) {
      return;
    }

    const enteredPhrase =
      byId(
        "confirmationPhraseInput"
      ).value;

    if (
      enteredPhrase !==
      state.preview
        .confirmationPhrase
    ) {
      showError(
        "actionError",

        messages
          .GUARDIAN_CONFIRMATION_PHRASE_INVALID
      );

      return;
    }

    state.actionBusy = true;

    clearError(
      "actionError"
    );

    byId(
      "cancelActionButton"
    ).disabled = true;

    byId(
      "executeActionButton"
    ).disabled = true;

    byId(
      "executeActionButton"
    ).textContent =
      "Verificando y ejecutando…";

    try {
      const payload =
        await api(
          `/guardian/actions/${
            encodeURIComponent(
              state.preview.id
            )
          }/execute`,

          {
            method: "POST",
            protectedRoute: true,

            body: {
              actionToken:
                state.preview
                  .actionToken,

              confirmationPhrase:
                enteredPhrase
            }
          }
        );

      byId(
        "actionDialog"
      ).close();

      clearPreviewState();

      renderActionResult(
        payload.action
      );

      refresh().catch(
        handleSessionError
      );
    } catch (error) {
      state.actionBusy = false;

      byId(
        "cancelActionButton"
      ).disabled = false;

      byId(
        "executeActionButton"
      ).textContent =
        "Autorizar y limpiar";

      validateConfirmationInput();

      showError(
        "actionError",
        error.message
      );
    }
  }

  function validateConfirmationInput() {
    const valid =
      state.preview &&
      !state.actionBusy &&
      Date.now() <
        new Date(
          state.preview.expiresAt
        ).getTime() &&
      byId(
        "confirmationPhraseInput"
      ).value ===
        state.preview
          .confirmationPhrase;

    byId(
      "executeActionButton"
    ).disabled = !valid;
  }

  function handleSessionError(
    error
  ) {
    if (error.status === 401) {
      state.accessToken = null;

      window.clearInterval(
        state.refreshTimer
      );

      if (
        byId(
          "actionDialog"
        ).open
      ) {
        byId(
          "actionDialog"
        ).close();
      }

      clearPreviewState();

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
    } catch (_) {
      // El cierre local continúa aunque la sesión ya haya vencido.
    }

    state.accessToken = null;

    window.clearInterval(
      state.refreshTimer
    );

    clearPreviewState();

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

  byId(
    "diagnostics"
  ).addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "[data-preview-action]"
        );

      if (
        !button ||
        button.disabled
      ) {
        return;
      }

      preparePreview(
        button.dataset
          .previewAction,

        button
      );
    }
  );

  byId(
    "confirmationPhraseInput"
  ).addEventListener(
    "input",
    validateConfirmationInput
  );

  byId(
    "actionForm"
  ).addEventListener(
    "submit",
    executePreview
  );

  byId(
    "cancelActionButton"
  ).addEventListener(
    "click",
    cancelPreview
  );

  byId(
    "actionDialog"
  ).addEventListener(
    "cancel",
    (event) => {
      event.preventDefault();
      cancelPreview();
    }
  );

  byId(
    "closeResultButton"
  ).addEventListener(
    "click",
    () => {
      byId(
        "resultDialog"
      ).close();
    }
  );

  initialize();
})();
