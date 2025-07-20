/**
 * @fileoverview Servicio con lógica de negocio específica para manipular hojas de "Jornada".
 * Orquesta operaciones complejas en la hoja de cálculo de una jornada, utilizando otros servicios
 * más genéricos como TemplateService y SheetService.
 */

class JornadaSheetService {
  private static instance: JornadaSheetService;

  private constructor() {
    // Constructor privado para el patrón Singleton.
  }

  public static getInstance(): JornadaSheetService {
    if (!JornadaSheetService.instance) {
      JornadaSheetService.instance = new JornadaSheetService();
    }
    return JornadaSheetService.instance;
  }

  /**
   * [HELPER PRIVADO] Obtiene la hoja de jornada activa.
   * Centraliza la lógica de obtención y validación de la hoja.
   * @returns El objeto Sheet de la jornada activa.
   * @throws Error si la hoja activa no es la hoja de Jornada.
   */
  private getActiveJornadaSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    // Añadimos una validación para asegurar que estamos en la hoja correcta.
    if (sheet.getName() !== appConfig.sheets.jornada.name) {
      throw new Error(`Operación inválida: debe estar en la hoja "${appConfig.sheets.jornada.name}".`);
    }
    return sheet;
  }

  /**
   * Prepara una hoja de cálculo específica para ser una hoja de Jornada.
   * Elimina todas las hojas excepto la primera y la renombra a "Jornada".
   * @param spreadsheetId El ID de la hoja de cálculo a preparar.
   */
  public prepararHojaDeJornada(spreadsheetId: string): void {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

    // Crear la nueva hoja primero para asegurarse de que siempre haya al menos una.
    const nuevaHoja = spreadsheet.insertSheet(appConfig.sheets.jornada.name);

    // Ahora, eliminar todas las demás hojas.
    const allSheets = spreadsheet.getSheets();
    allSheets.forEach(sheet => {
      if (sheet.getSheetId() !== nuevaHoja.getSheetId()) {
        spreadsheet.deleteSheet(sheet);
      }
    });
  }

  /**
   * Actualiza los valores de los campos en una hoja según la plantilla y los datos proporcionados,
   * y luego protege las celdas no editables.
   * @param sheet La hoja de cálculo a modificar.
   * @param template La plantilla que define los campos.
   * @param data Un objeto donde las claves corresponden a los rangos de la plantilla y los valores son los que se deben establecer.
   */
  public updateAndProtectSheetFields(sheet: GoogleAppsScript.Spreadsheet.Sheet, template: JornadaSheetTemplate, data: { [key: string]: any }): void {
    const me = Session.getEffectiveUser();

    // 1. Actualizar los valores de los campos
    template.fields.forEach(field => {
      const dataKey = field.range;
      if (data.hasOwnProperty(dataKey) && field.editable) {
        try {
          const range = sheet.getRange(field.range);
          range.setValue(data[dataKey]);
          Logger.log(`Valor establecido para ${field.range}: ${data[dataKey]}`);
        } catch (e) {
          Logger.log(`No se pudo establecer el valor para el rango ${field.range}: ${(e as Error).message}`);
        }
      }
    });

    // 2. Proteger las celdas según la plantilla
    template.fields.forEach(field => {
      if (field.protected || !field.editable) {
        try {
          const range = sheet.getRange(field.range);
          const protection = range.protect().setDescription(`Campo protegido: ${field.label || field.range}`);
          protection.addEditor(me);
          const editors = protection.getEditors();
          editors.forEach(editor => {
            if (editor.getEmail() !== me.getEmail()) {
              protection.removeEditor(editor);
            }
          });
          if (protection.canDomainEdit()) {
            protection.setDomainEdit(false);
          }
          Logger.log(`Rango ${field.range} protegido.`);
        } catch (e) {
          Logger.log(`No se pudo proteger el rango ${field.range}: ${(e as Error).message}`);
        }
      }
    });

    Logger.log('Actualización y protección de campos completada.');
  }

  /**
   * Agrega un número específico de filas para participantes en la hoja de Jornada,
   * aplicando formato y validaciones de datos.
   * @param startRow La fila donde comenzará la inserción de participantes.
   * @param numParticipantes El número de filas de participantes a agregar.
   * @param roles La lista de roles institucionales para la validación de datos.
   */
  public agregarFilasParticipantes(startRow: number, numParticipantes: number, roles: string[]): void {
    const sheet = this.getActiveJornadaSheet();
    if (!sheet) {
      throw new Error(`No se encontró la hoja "${appConfig.sheets.jornada.name}". Asegúrese de estar en el archivo correcto`);
    }

    if (numParticipantes <= 0) return;

    Logger.log(`Configurando filas para ${numParticipantes} participantes...`);
    const endRow = startRow + numParticipantes - 1;

    if (sheet.getMaxRows() < endRow) {
      sheet.insertRowsAfter(sheet.getMaxRows(), endRow - sheet.getMaxRows());
    }

    const rolInstitucionalRange = sheet.getRange(`A${startRow}:A${endRow}`);
    rolInstitucionalRange.clearDataValidations();
    const validationRule = SpreadsheetApp.newDataValidation().requireValueInList(roles, true).build();
    rolInstitucionalRange.setDataValidation(validationRule);

    const pFields = appConfig.sheets.jornada.fields.tituloParticipantes.fields;
    for (let i = 0; i < numParticipantes; i++) {
      const currentRow = startRow + i;
      sheet.getRange(`${pFields.nombreCompleto.startCol}${currentRow}:${pFields.nombreCompleto.endCol}${currentRow}`).merge().clearDataValidations();
      sheet.getRange(`${pFields.areaDocente.startCol}${currentRow}:${pFields.areaDocente.endCol}${currentRow}`).merge().clearDataValidations();
      sheet.getRange(`${pFields.gradoDocente.startCol}${currentRow}`).clearDataValidations();
      sheet.getRange(`${pFields.horasDocente.startCol}${currentRow}`).clearDataValidations();

      // Aplicar bordes a toda la fila del participante
      const participantRowRange = sheet.getRange(`A${currentRow}:P${currentRow}`);
      participantRowRange.setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);
    }

    const formulaCounter = `=COUNTA(${pFields.nombreCompleto.startCol}${startRow}:${pFields.nombreCompleto.startCol}${endRow})`;
    sheet.getRange(`${pFields.totalParticipantes.startCol}${startRow}:${pFields.totalParticipantes.startCol}${endRow}`).merge().setFormula(formulaCounter).setVerticalAlignment("middle");

    const colsToMergeVertically = [
      appConfig.sheets.jornada.fields.logros.column,
      appConfig.sheets.jornada.fields.dificultades.column,
      appConfig.sheets.jornada.fields.acuerdos.column,
      appConfig.sheets.jornada.fields.evidencias.column,
      appConfig.sheets.jornada.fields.observaciones.column
    ];
    const headerInfoStartRow = startRow - 2;
    const headerInfoEndRowForMerge = endRow;

    colsToMergeVertically.forEach(col => {
      const range = sheet.getRange(`${col}${headerInfoStartRow}:${col}${headerInfoEndRowForMerge}`);
      range.breakApart().mergeVertically()
        .setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);
    });

    Logger.log(`${numParticipantes} filas de participantes agregadas y formateadas correctamente.`);
  }

  /**
   * Actualiza la celda de evidencias en la hoja con una lista de enlaces.
   * @param evidenciasActivas Un array de DTOs de las evidencias activas.
   */
  public actualizarCeldaEvidencias(evidenciasActivas: EvidenciaDisplayDTO[]): void {
    //const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(appConfig.sheets.jornada.name);
    const sheet = this.getActiveJornadaSheet();
    if (!sheet) return;

    const rangeA1 = appConfig.sheets.jornada.fields.evidencias.initRange;
    const evidenceCell = sheet.getRange(rangeA1);

    if (!evidenciasActivas || evidenciasActivas.length === 0) {
      evidenceCell.setValue("No hay evidencias cargadas.");
      return;
    }

    const richTextBuilder = SpreadsheetApp.newRichTextValue();
    const fullText = evidenciasActivas
      .map(ev => `${ev.tipo} (${ev.nombreOriginal})`)
      .join('\n');
    
    richTextBuilder.setText(fullText);

    let currentIndex = 0;
    evidenciasActivas.forEach(ev => {
      const linkText = `${ev.tipo} (${ev.nombreOriginal})`;
      if (ev.url) {
        richTextBuilder.setLinkUrl(currentIndex, currentIndex + linkText.length, ev.url);
      }
      currentIndex += linkText.length + 1; // +1 por el salto de línea
    });

    evidenceCell.setRichTextValue(richTextBuilder.build());
    evidenceCell.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  }

  /**
   * Orquesta la actualización de las celdas de Logros, Dificultades y Acuerdos
   * basándose en los datos del DTO.
   * @param ldaData El objeto DTO con los datos a formatear.
   */
  public actualizarCeldasLDA(ldaData: LogrosDificultadesAcuerdosDTO): void {
    const sheet = this.getActiveJornadaSheet();
    if (!sheet) return;

    // Limpiar el contenido previo de las celdas
    sheet.getRange(appConfig.sheets.jornada.fields.logros.initRange).clearContent();
    sheet.getRange(appConfig.sheets.jornada.fields.dificultades.initRange).clearContent();
    sheet.getRange(appConfig.sheets.jornada.fields.acuerdos.initRange).clearContent();

    // Formatear y escribir cada sección
    const logrosRichText = this.buildRichTextForLDA(ldaData, 'logros');
    if (logrosRichText) {
      sheet.getRange(appConfig.sheets.jornada.fields.logros.initRange).setRichTextValue(logrosRichText);
    }

    const dificultadesRichText = this.buildRichTextForLDA(ldaData, 'dificultades');
    if (dificultadesRichText) {
      sheet.getRange(appConfig.sheets.jornada.fields.dificultades.initRange).setRichTextValue(dificultadesRichText);
    }

    const acuerdosRichText = this.buildRichTextForLDA(ldaData, 'acuerdos');
    if (acuerdosRichText) {
      sheet.getRange(appConfig.sheets.jornada.fields.acuerdos.initRange).setRichTextValue(acuerdosRichText);
    }
  }

  /**
   * [HELPER PRIVADO] Construye un valor de RichText formateado para una categoría específica (logros, etc.).
   * @param ldaData El objeto DTO completo.
   * @param category La clave de la categoría a procesar ('logros', 'dificultades', 'acuerdos').
   * @returns Un objeto RichTextValue construido, o null si no hay datos para esa categoría.
   */
  private buildRichTextForLDA(ldaData: LogrosDificultadesAcuerdosDTO, category: 'logros' | 'dificultades' | 'acuerdos'): GoogleAppsScript.Spreadsheet.RichTextValue | null {
    const boldStyle = SpreadsheetApp.newTextStyle().setBold(true).build();
    const titleGeneralStyle = SpreadsheetApp.newTextStyle().setBold(true).setFontSize(11).build();

    let fullText = "";
    const textStyleRuns: { start: number; end: number; style: GoogleAppsScript.Spreadsheet.TextStyle; }[] = [];
    
    // Verificar si hay datos en la categoría solicitada
    const hayDatos = Object.values(ldaData).some(linea => linea[category] && linea[category].length > 0);
    if (!hayDatos) {
      return null; // No hay nada que construir
    }
    
    // 1. Título General (si hay datos)
    const tituloGeneral = "Líneas de Trabajo\n\n";
    fullText += tituloGeneral;
    textStyleRuns.push({ start: 0, end: tituloGeneral.trim().length, style: titleGeneralStyle });

    let lineaIndex = 0;
    let primeraLineaConItems = true;
    for (const lineaNombre in ldaData) {
      const items = ldaData[lineaNombre][category];
      if (items && items.length > 0) {
        if (!primeraLineaConItems) {
          fullText += "\n\n"; // Separador
        }

        const titleStart = fullText.length;
        // 2. Título de la Línea de Trabajo con numeración
        const lineaTitulo = `${lineaIndex + 1}. ${lineaNombre}`;
        fullText += lineaTitulo;
        textStyleRuns.push({ start: titleStart, end: fullText.length, style: boldStyle });

        // 3. Viñetas para cada ítem
        items.forEach(item => {
          fullText += `\n• ${item}`;
        });
        
        primeraLineaConItems = false;
        lineaIndex++;
      }
    }
    
    // Construir el objeto RichText
    const richTextBuilder = SpreadsheetApp.newRichTextValue().setText(fullText);
    textStyleRuns.forEach(run => {
      richTextBuilder.setTextStyle(run.start, run.end, run.style);
    });

    return richTextBuilder.build();
  }
}

/**
 * Retorna la instancia única de JornadaSheetService.
 */
function getJornadaSheetService(): JornadaSheetService {
  return JornadaSheetService.getInstance();
}