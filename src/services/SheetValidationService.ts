// En: /src/services/SheetValidationService.ts

class SheetValidationService {
  private static instance: SheetValidationService;
  private template: JornadaSheetTemplate;

  // El servicio se inicializa con la plantilla que va a validar.
  private constructor(template: JornadaSheetTemplate) {
    this.template = template;
  }

  public static getInstance(): SheetValidationService {
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
  public isCellEditable(a1Notation: string): boolean {
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


/**
 * Verifica si una celda específica es editable según la plantilla de la jornada.
 *
 * @param {string} a1Notation La notación A1 de la celda que fue editada (ej. "A1", "C5").
 * @param {JornadaSheetTemplate} template La plantilla de la hoja a verificar.
 * @returns {boolean} `true` si la celda es editable, `false` en caso contrario.
 */
isPrincipalCell(a1Notation: string, template: JornadaSheetTemplate): boolean {
  // Primero, obtenemos la celda real (sin importar si está en un rango combinado).
  // Esto es importante porque el usuario puede hacer clic en cualquier parte de un merge.
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const cell = sheet.getRange(a1Notation);
  const row = cell.getRow();
  const col = cell.getColumn();

  // Recorremos todos los campos definidos en la plantilla.
  for (const field of template.fields) {
    const fieldRange = sheet.getRange(field.range);

    // Verificamos si la celda editada está DENTRO del rango de este campo.
    if (row >= fieldRange.getRow() &&
      row <= fieldRange.getLastRow() &&
      col >= fieldRange.getColumn() &&
      col <= fieldRange.getLastColumn()) {

      return field.isPrincipal || false; // Retornamos 'false' si no está definido
    }
  }

  // Si después de revisar todos los campos no encontramos ninguna coincidencia,
  // asumimos por seguridad que la celda no es editable.
  return false;
}

  // --- FUTURAS VALIDACIONES DE PLANTILLA PODRÍAN IR AQUÍ ---
  // public isDataFormatValid(a1Notation: string, value: any): boolean { ... }
}

function getSheetValidationService(): SheetValidationService {
  return SheetValidationService.getInstance();
}