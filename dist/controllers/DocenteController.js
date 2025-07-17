"use strict";
/**
 * @fileoverview Controlador para las acciones de la UI relacionadas con Docentes.
 * Expone funciones globales que pueden ser llamadas desde el HTML del modal.
 */
/**
 * Muestra el diálogo modal para agregar o editar un docente.
 */
function showDocenteDialog() {
    const html = HtmlService.createHtmlOutputFromFile('ui/modals/agregarDocente')
        .setWidth(800)
        .setHeight(600);
    SpreadsheetApp.getUi().showModalDialog(html, 'Gestionar Docente');
}
/**
 * Función global expuesta a la UI para obtener los datos iniciales del formulario de docentes.
 * @returns Un objeto con los datos para poblar el formulario.
 */
function getInitialDataForDocenteForm() {
    try {
        return getDocenteService().getInitialDataForDocenteForm();
    }
    catch (e) {
        const error = e;
        Logger.log(`Error en DocenteController.getInitialDataForDocenteForm: ${error.message}`);
        // Re-lanzar el error para que el .withFailureHandler del cliente lo capture
        throw new Error(`No se pudieron cargar los datos iniciales. Por favor, contacte al administrador.`);
    }
}
/**
 * Función expuesta al cliente para buscar un docente por su identificación.
 * @param tipoId El tipo de identificación.
 * @param numeroId El número de identificación.
 * @returns El objeto DocenteCompletoDTO o null.
 */
function buscarDocentePorIdentificacion(tipoId, numeroId) {
    try {
        return getDocenteService().getDocenteCompletoByIdentificacion(tipoId, numeroId);
    }
    catch (e) {
        Logger.log(`Error en buscarDocentePorIdentificacion: ${e.message}`);
        throw e; // Re-lanzar para que el cliente lo maneje
    }
}
/**
 * Función expuesta al cliente para guardar o actualizar los datos de un docente.
 * @param data El DTO con los datos del formulario.
 * @returns Un objeto con el resultado de la operación.
 */
function guardarDocente(data) {
    try {
        const idIeoStr = PropertiesService.getScriptProperties().getProperty(appConfig.properties.ID_IEO_KEY);
        if (!idIeoStr) {
            throw new Error("No se ha podido determinar la IEO del contexto actual. Por favor, inicie una jornada primero.");
        }
        return getDocenteService().saveOrUpdateDocente(data, parseInt(idIeoStr, 10));
    }
    catch (e) {
        Logger.log(`Error en guardarDocente: ${e.message}`);
        throw e; // Re-lanzar para que el cliente lo maneje
    }
}
