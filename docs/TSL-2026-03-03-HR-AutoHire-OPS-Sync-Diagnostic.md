# ACS TECHNICAL SESSION LOG
ID: TSL-2026-03-03-HR
Módulo: HR / Department Control / OPS Integration
Estado: ABIERTO — DIAGNÓSTICO EN PROGRESO

---

## 1. Contexto

Durante pruebas operacionales posteriores a la estabilización del sistema C-Check / B-Check (Dominancia CAMO), se detectaron inconsistencias en el módulo HR (Department Control Center):

- Pilots = 0 pese a existir 7 aeronaves activas.
- Cabin Crew inconsistente respecto al número de rutas.
- Required no refleja correctamente la demanda operacional.
- Aparición de filas con nombre `undefined` en la tabla HR.
- AutoHire aparentemente no ejecuta contratación automática.

El sistema debe calcular personal requerido dinámicamente en base a:

- Flota activa
- Rutas programadas
- Demanda operacional (OPS)
- Configuración AutoHire en Settings

---

## 2. Síntomas Observados

### 2.1 Undefined Departments

En la tabla HR aparecen filas con:
