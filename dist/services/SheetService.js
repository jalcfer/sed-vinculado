"use strict";
/**
 * @fileoverview Servicio genérico para manejar operaciones básicas de Google Sheets.
 * Este servicio se enfoca en tareas reutilizables que no dependen de una lógica de negocio específica.
 */
class SheetService {
    constructor() {
        this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    }
    static getInstance() {
        if (!SheetService.instance) {
            SheetService.instance = new SheetService();
        }
        return SheetService.instance;
    }
    /**
     * Elimina todas las hojas del archivo actual, dejando una sola hoja limpia con el nombre especificado.
     * @param sheetName El nombre para la hoja principal que quedará. Por defecto es 'Datos'.
     */
    limpiarSpreadsheet(sheetName = 'Datos') {
        const sheets = this.spreadsheet.getSheets();
        // Si solo hay una hoja, simplemente la limpiamos y renombramos.
        if (sheets.length === 1) {
            const sheet = sheets[0];
            sheet.clear();
            sheet.setName(sheetName);
            sheet.setHiddenGridlines(true);
            return;
        }
        // Si hay varias hojas, eliminamos todas menos la primera. Iterar hacia atrás es más seguro.
        for (let i = sheets.length - 1; i > 0; i--) {
            this.spreadsheet.deleteSheet(sheets[i]);
        }
        // Finalmente, limpiamos y renombramos la única hoja que queda.
        const primeraHoja = this.spreadsheet.getSheets()[0]; // Obtenemos la referencia fresca
        primeraHoja.clear();
        primeraHoja.setName(sheetName);
        primeraHoja.setHiddenGridlines(true);
    }
    /**
     * Crea una nueva hoja con un nombre específico y escribe los datos.
     * @param nombreHoja El nombre de la nueva hoja.
     * @param datos Un array 2D de datos para escribir. La primera fila se asume que son los encabezados.
     */
    crearHojaConDatos(nombreHoja, datos) {
        if (!datos || datos.length === 0) {
            this.spreadsheet.insertSheet(nombreHoja);
            return; // Salir si no hay datos que escribir
        }
        const sheets = this.spreadsheet.getSheets();
        let sheet;
        // Si solo hay una hoja y está vacía, la reutilizamos.
        if (sheets.length === 1 && sheets[0].getLastRow() === 0 && sheets[0].getLastColumn() === 0) {
            sheet = sheets[0];
            sheet.setName(nombreHoja);
        }
        else {
            sheet = this.spreadsheet.getSheetByName(nombreHoja);
            if (sheet) {
                sheet.clear(); // Limpiar si ya existe
            }
            else {
                sheet = this.spreadsheet.insertSheet(nombreHoja);
            }
        }
        const headers = datos[0];
        const dataRange = sheet.getRange(1, 1, datos.length, headers.length);
        dataRange.setValues(datos);
        // Aplicar formato básico a los encabezados
        const headerRange = sheet.getRange(1, 1, 1, headers.length);
        headerRange.setFontWeight('bold');
        sheet.autoResizeColumns(1, headers.length);
    }
}
/**
 * Retorna la instancia única de SheetService.
 */
function getSheetService() {
    return SheetService.getInstance();
}
