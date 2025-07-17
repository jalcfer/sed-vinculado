"use strict";
/**
 * @fileoverview Servicio para gestionar todas las notificaciones y la interacción con la UI.
 * Centraliza el uso de Alertas, Toasts y otros diálogos para mantener una experiencia de usuario consistente.
 */
class NotificationService {
    constructor() {
        this.ui = SpreadsheetApp.getUi();
    }
    static getInstance() {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }
    /**
     * Muestra un mensaje de progreso temporal (toast).
     * @param message El mensaje a mostrar.
     * @param title El título del toast (opcional).
     * @param timeoutSeconds Duración en segundos (opcional, por defecto 5).
     */
    showToast(message, title = 'Información', timeoutSeconds = 5) {
        SpreadsheetApp.getActiveSpreadsheet().toast(message, title, timeoutSeconds);
    }
    /**
     * Muestra una alerta modal que requiere la interacción del usuario.
     * @param title El título de la alerta.
     * @param message El mensaje principal de la alerta.
     */
    showAlert(title, message) {
        this.ui.alert(title, message, this.ui.ButtonSet.OK);
    }
    /**
     * Muestra una alerta de error estandarizada.
     * @param message El mensaje de error a mostrar.
     * @param error El objeto Error original (opcional, para logging).
     */
    showError(message, error) {
        Logger.log(`Error mostrado al usuario: ${message}. Detalles: ${error === null || error === void 0 ? void 0 : error.message}`);
        this.ui.alert('Error', message, this.ui.ButtonSet.OK);
    }
    /**
     * Ejecuta un proceso mostrando notificaciones de inicio, progreso y final.
     * @param processTitle Título general del proceso (usado en alertas).
     * @param startMessage Mensaje para el toast inicial.
     * @param processFunction La función a ejecutar. Debe aceptar un callback para reportar progreso y devolver el mensaje de éxito.
     */
    runProcessWithFeedback(processTitle, startMessage, processFunction) {
        try {
            this.showToast(startMessage, processTitle, 4);
            const reportProgress = (progressMessage) => {
                this.showToast(progressMessage, `Progreso: ${processTitle}`);
            };
            const successMessage = processFunction(reportProgress);
            this.showAlert(processTitle, successMessage);
        }
        catch (e) {
            const error = e;
            this.showError(`Ocurrió un error durante el proceso '${processTitle}': ${error.message}`, error);
        }
    }
}
/**
 * Retorna la instancia única de NotificationService.
 */
function getNotificationService() {
    return NotificationService.getInstance();
}
