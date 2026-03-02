# ACS TECHNICAL SESSION LOG
ID: TSL-2026-03-02-A
Módulo: Schedule Table / B-Check Monthly Cycle (CAMO Integration)
Estado: ABIERTO

---

## 1. Contexto

Durante la integración estructural del B-Check mensual con el Schedule Table, se detectó un comportamiento inconsistente en la barra de ciclo mensual:

- Todos los aviones mostraban 100% (30 días restantes).
- No existía diferencia entre aeronaves.
- El sistema no reflejaba correctamente el tiempo transcurrido.

El objetivo era implementar un modelo estilo CAMO real (KLM / Airbus / Boeing):

- Intervalo técnico fijo: 30 días.
- Ventana operativa definida en Schedule.
- Barra basada exclusivamente en dueDate técnico.
- Activación automática al vencer el intervalo.

---

## 2. Diagnóstico Técnico Real

Se realizaron pruebas directas en consola:

```js
getRealFleet().map(ac => typeof ac.lastBCheckAt)
getRealFleet().map(ac => Number.isFinite(ac.lastBCheckAt))
