"use strict";
/**
 * @fileoverview Controlador para las operaciones del Profesional de Acompañamiento (PA).
 * Este archivo contiene funciones que serán expuestas a la UI del complemento
 * y que orquestan la lógica de negocio llamando a los servicios correspondientes.
 */
/**
 * Función que se puede llamar desde el menú del complemento o un botón en la UI
 * para iniciar el proceso de creación de N nuevas jornadas de acompañamiento.
 *
 * @param acompId El ID del acompañamiento seleccionado.
 * @param numeroDeJornadas El número de archivos/jornadas a crear.
 */
function crearMultiplesJornadas(acompId, numeroDeJornadas) {
    // Validaciones básicas de entrada
    if (!acompId || typeof acompId !== 'string' || acompId.trim() === '') {
        getNotificationService().showError('El ID de acompañamiento es inválido.');
        return;
    }
    if (!numeroDeJornadas || typeof numeroDeJornadas !== 'number' || numeroDeJornadas <= 0) {
        getNotificationService().showError('El número de jornadas debe ser un entero positivo.');
        return;
    }
    const processTitle = 'Creación de Jornadas';
    const startMessage = `Iniciando la creación de ${numeroDeJornadas} jornada(s)...`;
    const createProcess = (reportProgress) => {
        const archivosCreados = getJornadaService().crearEstructurasDeJornada(acompId, numeroDeJornadas, reportProgress);
        if (archivosCreados.length !== numeroDeJornadas) {
            // Si algunas jornadas ya existían, se informa en el mensaje final.
            return `Proceso finalizado. Se crearon ${archivosCreados.length} de ${numeroDeJornadas} jornadas. Algunas ya existían.`;
        }
        return `¡Éxito! Se han creado y registrado ${archivosCreados.length} nuevas jornadas.`;
    };
    getNotificationService().runProcessWithFeedback(processTitle, startMessage, createProcess);
}
function showInformeDialog() {
    try {
        const userEmail = PropertiesService.getScriptProperties().getProperty(appConfig.properties.USER_EMAIL_KEY);
        Logger.log(`Email del usuario activo: ${userEmail}`);
        if (!userEmail || userEmail.trim() === '') {
            throw new Error("No se pudo obtener el email del usuario activo.");
        }
        const data = getPaService().getInformeData(userEmail);
        Logger.log(`Data para el informe: ${JSON.stringify(data)}`);
        const template = HtmlService.createTemplateFromFile('ui/modals/reportarInforme');
        template.initialData = data;
        const html = template.evaluate().setWidth(900).setHeight(600);
        SpreadsheetApp.getUi().showModalDialog(html, 'Reportar Informe de Acompañamiento');
    }
    catch (e) {
        const error = e;
        Logger.log(`Error al abrir el diálogo de informe: ${error.message}`);
        SpreadsheetApp.getUi().alert(`Error: ${error.message}`);
    }
}
/**
 * Recibe un archivo de informe bimensual desde la UI, lo guarda en Drive y devuelve el resultado.
 * @param fileData Un objeto que contiene los datos del archivo (nombre, tipo MIME, datos en base64).
 * @returns Un objeto con el resultado de la operación.
 */
function subirInformeBimensual(fileData) {
    try {
        const userEmail = PropertiesService.getScriptProperties().getProperty(appConfig.properties.USER_EMAIL_KEY);
        if (!userEmail || userEmail.trim() === '') {
            throw new Error("No se pudo obtener el email del usuario para la operación.");
        }
        return getPaService().subirInformeBimensual(userEmail, fileData);
    }
    catch (e) {
        const error = e;
        Logger.log(`Error en subirInformeBimensual: ${error.message}`);
        return { success: false, message: error.message };
    }
}
/**
 * Inicia el proceso de generación del informe preliminar.
 * Utiliza el NotificationService para mostrar el progreso al usuario.
 */
function generarInformePreliminar_() {
    const processTitle = 'Generación de Informe Preliminar';
    const startMessage = 'Iniciando la recopilación de datos de las jornadas...';
    const createProcess = (reportProgress) => {
        const userEmail = PropertiesService.getScriptProperties().getProperty(appConfig.properties.USER_EMAIL_KEY);
        if (!userEmail)
            throw new Error("No se pudo obtener el email del usuario.");
        const fileId = getPaService().generarInformePreliminar(userEmail, reportProgress);
        const fileUrl = DriveApp.getFileById(fileId).getUrl();
        return `¡Informe generado con éxito! Puede acceder a él en la siguiente URL: ${fileUrl}`;
    };
    getNotificationService().runProcessWithFeedback(processTitle, startMessage, createProcess);
}
