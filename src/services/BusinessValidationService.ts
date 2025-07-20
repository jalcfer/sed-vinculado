// En: /src/services/BusinessValidationService.ts

class BusinessValidationService {
  private static instance: BusinessValidationService;

  private constructor() {}

  public static getInstance(): BusinessValidationService {
    if (!BusinessValidationService.instance) {
      BusinessValidationService.instance = new BusinessValidationService();
    }
    return BusinessValidationService.instance;
  }

  /**
   * Valida que un conjunto de campos requeridos, definidos en la plantilla, no estén vacíos.
   * @param sheet La hoja de cálculo activa donde se encuentran los campos.
   * @param template La plantilla de la jornada que define qué campos son requeridos.
   * @returns Un objeto con el resultado de la validación.
   */
  public validateRequiredFields(sheet: GoogleAppsScript.Spreadsheet.Sheet, template: JornadaSheetTemplate): { isValid: boolean, message: string } {
    // Filtramos para obtener solo los campos que son editables y requeridos.
    // Asumiremos que un campo editable sin valor es un campo requerido que falta.
    // Podrías añadir una propiedad `required: true` a tu template para ser más explícito.
    const requiredFields = template.fields.filter(field => field.required);

    for (const field of requiredFields) {
      const value = sheet.getRange(field.range).getValue();
      // Verificamos si el valor es nulo, indefinido o un string vacío (después de quitar espacios).
      if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
        // Usamos el 'label' del campo anterior no editable para dar un mensaje claro.
        const labelField = this.findLabelForField(field, template);
        const fieldName = labelField ? labelField.label.replace(':', '') : `el campo en ${field.range}`;
        
        return { isValid: false, message: `El campo "${fieldName}" es obligatorio y no puede estar vacío.` };
      }
    }

    return { isValid: true, message: 'Todos los campos requeridos están completos.' };
  }

  /**
   * Valida la consistencia del número de participantes.
   * @param expectedParticipantCount El número de participantes que se dijo que se registrarían.
   * @param actualParticipantCount El número de participantes realmente registrados en la BD o en la hoja.
   * @returns Un objeto con el resultado de la validación.
   */
  public validateParticipantCount(expectedParticipantCount: number, actualParticipantCount: number): { isValid: boolean, message: string } {
    if (actualParticipantCount < expectedParticipantCount) {
      const missing = expectedParticipantCount - actualParticipantCount;
      return { 
        isValid: false, 
        message: `Se esperaba el registro de ${expectedParticipantCount} participantes, pero solo se han registrado ${actualParticipantCount}. Faltan ${missing} por registrar.` 
      };
    }
    
    if (actualParticipantCount > expectedParticipantCount) {
      return { 
        isValid: false, 
        message: `Se han registrado ${actualParticipantCount} participantes, pero se esperaba un máximo de ${expectedParticipantCount}. Por favor, corrija la lista.` 
      };
    }

    if (expectedParticipantCount === 0 && actualParticipantCount === 0) {
        return { isValid: false, message: 'Debe registrar al menos un participante para poder finalizar la jornada.' };
    }

    return { isValid: true, message: 'El número de participantes es correcto.' };
  }
  
  /**
   * Helper privado para encontrar el 'label' asociado a un campo editable.
   * Busca el campo no editable que está a la izquierda en la misma fila.
   */
  private findLabelForField(targetField: any, template: JornadaSheetTemplate): any | null {
      const targetRange = SpreadsheetApp.getActive().getRange(targetField.range);
      const targetRow = targetRange.getRow();

      return template.fields.find(field => {
          if (field.editable || !field.label) return false;
          const labelRange = SpreadsheetApp.getActive().getRange(field.range);
          return labelRange.getRow() === targetRow && labelRange.getColumn() < targetRange.getColumn();
      }) || null;
  }
}

function getBusinessValidationService(): BusinessValidationService {
  return BusinessValidationService.getInstance();
}