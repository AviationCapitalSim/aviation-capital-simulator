# ACS TECHNICAL SESSION LOG  
ID: TSL-2026-02-28-NAV-AUTO-ACTIVE  
Módulo: Global Navigation / Header Active Indicator  
Estado: RESUELTO

---

## 1. Contexto

Se detectó inconsistencia visual en el indicador activo del menú superior (ramita dorada tipo Airbus OCC).

En algunas páginas:
- El menú mostraba correctamente la línea inferior.
- En otras, la línea se extendía por todo el header.
- En otras no aparecía.

El sistema dependía de `class="active"` manual por archivo HTML, generando:
- Inconsistencias
- Riesgo de error humano
- Duplicación de lógica visual

---

## 2. Diagnóstico Técnico

### ❌ 2.1 Falta de `position: relative`

El pseudo-elemento:

```css
.acs-nav a.active::after
