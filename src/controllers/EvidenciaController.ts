/**
 * @fileoverview Controlador para las acciones de la UI relacionadas con las Evidencias.
 * Expone funciones globales que pueden ser llamadas desde el HTML del diálogo.
 */

/**
 * Función expuesta a la UI para obtener las evidencias ya cargadas para la visita actual.
 * @returns {EvidenciaDisplayDTO[]} Un array de DTOs con la información de las evidencias.
 */
function obtenerEvidenciasActuales(): EvidenciaDisplayDTO[] {
  try {
    const idVisita = PropertiesService.getScriptProperties().getProperty(appConfig.properties.ID_JORNADA_KEY);
    if (!idVisita) {
      throw new Error("No se ha iniciado una jornada. No se pueden obtener evidencias.");
    }
    return getEvidenciaService().getEvidenciasParaModal(parseInt(idVisita, 10));
  } catch (e) {
    const error = e as Error;
    Logger.log(`Error en EvidenciaController.obtenerEvidenciasActuales: ${error.message}`);
    throw error; // Re-lanzar para que el cliente lo maneje
  }
}

/**
 * Función expuesta a la UI para subir nuevos archivos de evidencia.
 * @param {any} evidenceData - Objeto que contiene los datos de los archivos a subir.
 * @returns {object} Un objeto con el resultado de la operación.
 */
function subirArchivosDeEvidencia(evidenceData: any): { success: boolean; message: string; filesUploaded: any[]; errors: string[] } {
  try {
    const idVisita = PropertiesService.getScriptProperties().getProperty(appConfig.properties.ID_JORNADA_KEY);
    if (!idVisita) {
      throw new Error("No hay una jornada activa para asociar las evidencias.");
    }
    return getEvidenciaService().subirYActualizarEvidencias(parseInt(idVisita, 10), evidenceData);
  } catch (e) {
    const error = e as Error;
    Logger.log(`Error en EvidenciaController.subirArchivosDeEvidencia: ${error.message}`);
    return { success: false, message: error.message, filesUploaded: [], errors: [error.message] };
  }
}

/**
 * Función expuesta a la UI para eliminar una evidencia.
 * @param {string} tipoEvidencia - El tipo de la evidencia a eliminar (ej. 'Lista_Asistencia').
 * @returns {EvidenciaDisplayDTO[]} El array actualizado de evidencias activas.
 */
function guardarEvidenciasActualizadasPorEliminacion(tipoEvidencia: string): EvidenciaDisplayDTO[] {
  try {
    const idVisita = PropertiesService.getScriptProperties().getProperty(appConfig.properties.ID_JORNADA_KEY);
    if (!idVisita) {
      throw new Error("No hay una jornada activa para modificar las evidencias.");
    }
    return getEvidenciaService().marcarEvidenciaComoEliminada(parseInt(idVisita, 10),tipoEvidencia);;
  } catch (e) {
    const error = e as Error;
    Logger.log(`Error en EvidenciaController.guardarEvidenciasActualizadasPorEliminacion: ${error.message}`);
    throw error;
  }
}

/**
 * [CONTROLADOR] Muestra el diálogo modal para agregar/editar Evidencias.
 * Esta es la función que debe ser llamada desde el menú de la hoja de cálculo.
 * El nombre debe coincidir con el que usas en la configuración del menú.
 */
function agregarEvidenciasPA() { 
  try {

    const idVisitaActiva = PropertiesService.getScriptProperties().getProperty(appConfig.properties.ID_JORNADA_KEY);
    if (!idVisitaActiva) {
      getNotificationService().showError("No hay una jornada activa. Por favor, inicie una jornada antes de registrar evidencias.");
      return;
    }

    // 2. Crear el HTML desde el archivo.
    const htmlOutput = HtmlService.createHtmlOutputFromFile('ui/modals/agregarEvidencias') // Usa el nombre de tu archivo HTML
      .setWidth(900)  // Ajusta el ancho según tus necesidades
      .setHeight(650); // Ajusta la altura según tus necesidades

    // 3. Mostrar el diálogo.
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Registrar Evidencias');

  } catch (e) {
    const error = e as Error;
    Logger.log(`Error al intentar abrir el diálogo de evicencias: ${error.message}`);
    // Usamos nuestro NotificationService para mostrar el error al usuario.
    getNotificationService().showError(`No se pudo abrir el diálogo. Error: ${error.message}`);
  }
}