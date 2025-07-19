"use strict";
// En: /src/services/SheetValidationService.ts
class SheetValidationService {
    // El servicio se inicializa con la plantilla que va a validar.
    constructor(template) {
        this.template = template;
    }
    static getInstance() {
        if (!SheetValidationService.instance) {
            // Cargamos la plantilla una sola vez.
            const template = getJornadaSheetTemplate();
            SheetValidationService.instance = new SheetValidationService(template);
        }
        return SheetValidationService.instance;
    }
    /**
     * Verifica si una celda específica es editable según la plantilla.
     * @param a1Notation La notación A1 de la celda.
     * @returns `true` si es editable, `false` si no.
     */
    isCellEditable(a1Notation) {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        const cell = sheet.getRange(a1Notation);
        const row = cell.getRow();
        const col = cell.getColumn();
        for (const field of this.template.fields) {
            const fieldRange = sheet.getRange(field.range);
            if (row >= fieldRange.getRow() && row <= fieldRange.getLastRow() &&
                col >= fieldRange.getColumn() && col <= fieldRange.getLastColumn()) {
                return field.editable;
            }
        }
        return false;
    }
}
function getSheetValidationService() {
    return SheetValidationService.getInstance();
}
