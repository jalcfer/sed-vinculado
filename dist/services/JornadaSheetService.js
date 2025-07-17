"use strict";
/**
 * @fileoverview Servicio con lógica de negocio específica para manipular hojas de "Jornada".
 * Orquesta operaciones complejas en la hoja de cálculo de una jornada, utilizando otros servicios
 * más genéricos como TemplateService y SheetService.
 */
class JornadaSheetService {
    constructor() {
        // Constructor privado para el patrón Singleton.
    }
    static getInstance() {
        if (!JornadaSheetService.instance) {
            JornadaSheetService.instance = new JornadaSheetService();
        }
        return JornadaSheetService.instance;
    }
    /**
     * Prepara una hoja de cálculo específica para ser una hoja de Jornada.
     * Elimina todas las hojas excepto la primera y la renombra a "Jornada".
     * @param spreadsheetId El ID de la hoja de cálculo a preparar.
     */
    prepararHojaDeJornada(spreadsheetId) {
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
    updateAndProtectSheetFields(sheet, template, data) {
        const me = Session.getEffectiveUser();
        // 1. Actualizar los valores de los campos
        template.fields.forEach(field => {
            const dataKey = field.range;
            if (data.hasOwnProperty(dataKey) && field.editable) {
                try {
                    const range = sheet.getRange(field.range);
                    range.setValue(data[dataKey]);
                    Logger.log(`Valor establecido para ${field.range}: ${data[dataKey]}`);
                }
                catch (e) {
                    Logger.log(`No se pudo establecer el valor para el rango ${field.range}: ${e.message}`);
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
                }
                catch (e) {
                    Logger.log(`No se pudo proteger el rango ${field.range}: ${e.message}`);
                }
            }
        });
        Logger.log('Actualización y protección de campos completada.');
    }
    /**
     * Agrega un número específico de filas para participantes en la hoja de Jornada,
     * aplicando formato y validaciones de datos.
     * @param spreadsheetId El ID de la hoja de cálculo.
     * @param startRow La fila donde comenzará la inserción de participantes.
     * @param numParticipantes El número de filas de participantes a agregar.
     * @param roles La lista de roles institucionales para la validación de datos.
     */
    agregarFilasParticipantes(spreadsheetId, startRow, numParticipantes, roles) {
        const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(appConfig.sheets.jornada.name);
        if (!sheet) {
            throw new Error(`No se encontró la hoja "${appConfig.sheets.jornada.name}". Asegúrese de estar en el archivo correcto`);
        }
        if (numParticipantes <= 0)
            return;
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
}
/**
 * Retorna la instancia única de JornadaSheetService.
 */
function getJornadaSheetService() {
    return JornadaSheetService.getInstance();
}
