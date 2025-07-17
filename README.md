# Complemento SED Gestión Acompañamiento

Este proyecto es un complemento de Google Sheets para la gestión de acompañamientos educativos, integrando la librería central `sed-central-lib`.

## Estructura
- `appsscript.json`: Configuración del proyecto Apps Script.
- `src/`: Código fuente del complemento.
  - `main.gs`: Punto de entrada, triggers y barra lateral.
  - `ui/`: HTML para barra lateral, barras de herramientas y modales.
  - `logic/`: Lógica de negocio y flujos por rol.
  - `utils.gs`: Utilidades generales.

## Primeros pasos
1. Implementa el trigger `onOpen` en `main.gs` para mostrar la barra lateral.
2. Desarrolla la lógica de habilitación en `logic/habilitacion.gs`.
3. Integra la consulta de rol y muestra la barra dinámica.
4. Implementa los flujos de admin y PA según la documentación.

## Requisitos
- Acceso a la librería central `sed-central-lib`.
- Permisos de edición sobre los archivos de Google Sheets a gestionar.

## Documentación
Consulta la documentación técnica y de integración en la carpeta `/documentacion` del repositorio principal.
