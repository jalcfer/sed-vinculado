"use strict";
/**
 * Este archivo contiene los disparadores (triggers) que se ejecutan en respuesta a eventos
 * en las hojas de cálculo de Google, como la edición de una celda.
 */
/**
 * Maneja el evento onEdit para la hoja de Jornada de Acompañamiento.
 * Muestra u oculta la fila 'ÁREA' (fila 12) basado en la selección
 * en la celda 'LÍNEA DE TRABAJO' (I11).
 *
 * @param e El objeto de evento de edición de Google Apps Script.
 */
function onEditJornadaSheet(e) {
    //TODO: agregar otros comportamientos de otras celdas: rol, duracion horas
    try {
        const range = e.range;
        Logger.log(`onEditJornadaSheet triggered. Edited range: ${range.getA1Notation()}. New value: ${e.value}. Old value: ${e.oldValue}.`);
        const editedRow = range.getRow();
        const editedCol = range.getColumn();
        // Buscar el primer trigger que coincida
        const foundTrigger = appConfig.triggers.tirggerRange.find((trigger) => {
            if (trigger.col === editedCol) {
                if ((trigger === null || trigger === void 0 ? void 0 : trigger.row) === editedRow || editedRow >= appConfig.sheets.jornada.startRow) {
                    Logger.log(`Trigger condition met for column ${editedCol} at row ${editedRow}.`);
                    return true;
                }
            }
            return false;
        });
        // Obtener el objeto completo del trigger según el valor
        const triggerObj = foundTrigger ? appConfig.triggers[foundTrigger.value] : undefined;
        // Log the trigger object for debugging
        Logger.log(`Trigger object for value '${foundTrigger ? foundTrigger.value : 'N/A'}': ${JSON.stringify(triggerObj)}`);
        // Ejecutar la función definida en el trigger, si existe
        if (triggerObj && typeof globalThis[triggerObj.function] === 'function') {
            Logger.log(`Ejecutando función '${triggerObj.function}' para el trigger.`);
            globalThis[triggerObj.function](triggerObj);
        }
    }
    catch (err) {
        const error = err;
        Logger.log(`An error occurred in onEditJornadaSheet: ${error.message} Stack: ${error.stack}`);
    }
}
function listAllTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    if (triggers.length === 0) {
        Logger.log("No hay triggers en este proyecto.");
        return;
    }
    Logger.log("Triggers actuales:");
    triggers.forEach((trigger, index) => {
        Logger.log(`${index + 1}. Función: ${trigger.getHandlerFunction()}\n` +
            `   Tipo: ${trigger.getEventType()}\n` +
            `   Fuente: ${trigger.getTriggerSource()}\n` +
            `   ID único: ${trigger.getUniqueId()}`);
    });
    return triggers;
}
/**
 * Se ejecuta automáticamente cada vez que un usuario edita una celda.
 * Versión robusta que revierte correctamente los cambios en celdas no editables.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e El objeto de evento de edición.
 */
function onEdit(e) {
    // El objeto 'e' del evento contiene todo lo que necesitamos.
    const range = e.range;
    const sheet = range.getSheet();
    // Salir si la edición no es en la hoja que nos interesa.
    if (sheet.getName() !== 'Jornada') { // O el nombre que uses
        return;
    }
    // --- LÓGICA DE VALIDACIÓN MEJORADA ---
    // Obtener la plantilla y los servicios necesarios.
    const template = getJornadaSheetTemplate();
    const validationService = getSheetValidationService();
    if (!validationService.isCellEditable(range.getA1Notation())) {
        // La celda NO es editable.
        const notificationService = getNotificationService();
        // Mostramos el mensaje de inmediato para que el usuario sepa qué pasó.
        notificationService.showToast('Esta celda no se puede modificar.', 'Acción no permitida', 3);
        // --- LÓGICA DE REVERSIÓN ROBUSTA ---
        // Si e.oldValue existe (la celda tenía contenido), lo restauramos.
        if (e.oldValue !== undefined) {
            range.setValue(e.oldValue);
        }
        else {
            // Si e.oldValue es undefined, significa que la celda estaba vacía antes.
            // En este caso, la acción correcta es borrar el nuevo contenido que el usuario introdujo.
            range.clearContent();
        }
    }
}
