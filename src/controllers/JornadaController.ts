/**
 * @fileoverview Controlador para gestionar las acciones de la interfaz de usuario relacionadas con las Jornadas.
 * Se encarga de recolectar datos de la hoja de cálculo y llamar a los servicios correspondientes.
 */

/**
 * Inicia una nueva jornada de acompañamiento.
 * 1. Pide al usuario el número de participantes.
 * 2. Llama al servicio para crear el registro inicial de la visita en la BD.
 * 3. Actualiza la hoja con los datos iniciales (fecha, número de jornada, IEO).
 * 4. Agrega y formatea las filas para los participantes.
 * Muestra notificaciones al usuario sobre el resultado de la operación.
 */
function iniciarJornada_() {
  const ui = SpreadsheetApp.getUi();
  try {
    // 0. Validar que la jornada no haya sido creada.
    const jornadaStatus = getJornadaService().getJornadaStatus();
    if (jornadaStatus !== 'No iniciada') {
      ui.alert('Jornada ya iniciada', 'No se puede iniciar una nueva jornada porque ya hay una jornada activa.', ui.ButtonSet.OK);
      return;
    }

    // 1. Pedir el número de participantes
    const result = ui.prompt(
      'Iniciar Jornada',
      'Ingrese el número de participantes:',
      ui.ButtonSet.OK_CANCEL
    );

    if (result.getSelectedButton() !== ui.Button.OK || !result.getResponseText()) {
      return; // El usuario canceló o no ingresó texto
    }

    const numParticipantes = parseInt(result.getResponseText(), 10);
    if (isNaN(numParticipantes) || numParticipantes < 0) {
      throw new Error('El número de participantes debe ser un número válido y positivo.');
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(appConfig.sheets.jornada.name);
    if (!sheet) {
      throw new Error(`No se encontró la hoja "${appConfig.sheets.jornada.name}" en el archivo activo. Asegúrese de estar en el archivo correcto.`);
    }

    const createProcess = (reportProgress: (message: string) => void) => {
      // 2. Llamar al servicio para iniciar la jornada en la BD
      const resultadoServicio = getJornadaService().iniciarJornada(numParticipantes, reportProgress);
      // 3. Actualizar la hoja con los datos devueltos
      sheet.getRange(appConfig.sheets.jornada.fields.fechaJornada.range).setValue(resultadoServicio.fecha);
      sheet.getRange(appConfig.sheets.jornada.fields.numeroJornada.range).setValue(resultadoServicio.numeroJornada);
      sheet.getRange(appConfig.sheets.jornada.fields.ieoJornada.range).setValue(resultadoServicio.nombreIEO);

      reportProgress(`Hoja actualizada: ${resultadoServicio.fecha} - N° ${resultadoServicio.numeroJornada} - IEO: ${resultadoServicio.nombreIEO}`);

      // 4. Agregar y formatear filas para participantes si es necesario
      if (numParticipantes > 0) {
        const startRow = appConfig.sheets.jornada.startRow; // Fila de inicio para la lista de participantes, después de los encabezados
        const roles = getDataViewRepository().getListData('Rol_Institucional', 'Nombre_rol_institucional', 'Activo_rol_institucional');

        getJornadaSheetService().agregarFilasParticipantes(startRow, numParticipantes, roles);
      }

      reportProgress(`Participantes agregados: ${numParticipantes}`);

      return `¡Éxito! 'Jornada iniciada correctamente. Por favor, registre los participantes.`;
    };


    //ui.alert('Éxito', 'Jornada iniciada correctamente. Por favor, registre los participantes.', ui.ButtonSet.OK);

    getNotificationService().runProcessWithFeedback(
      "Crear Jornada de Acompañamiento",
      "se ha iniciado una nueva jornada de acompañamiento.",
      createProcess
    );

  } catch (e) {
    const error = e as Error;
    Logger.log(`Error en iniciarJornada_: ${error.message}\n${error.stack}`);
    ui.alert('Error', `No se pudo iniciar la jornada: ${error.message}`, ui.ButtonSet.OK);
  } finally {
    // --- ¡EL PASO MÁS IMPORTANTE PARA ACTUALIZAR EL MENÚ! ---
    // Se ejecuta siempre, asegurando que el menú refleje el nuevo estado.
    buildDynamicMenu({} as GoogleAppsScript.Events.DocsOnOpen);
  }
}


/**
 * [CONTROLADOR] Inicia el flujo para finalizar y guardar una jornada.
 * Es llamado desde el menú de la hoja de cálculo.
 */
function finalizarJornada_() {
  const ui = SpreadsheetApp.getUi();
  const notificationService = getNotificationService();
  
  try {
    // 1. Confirmación del Usuario: Es una buena práctica para acciones irreversibles.
    const response = ui.alert(
      'Confirmar Finalización',
      '¿Está seguro de que desea finalizar y guardar esta jornada? Una vez finalizada, la hoja se bloqueará y no podrá realizar más cambios.',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      notificationService.showToast('Operación cancelada por el usuario.');
      return; // El usuario presionó "No" o cerró el diálogo.
    }

    // 2. Ejecutar el proceso principal con feedback visual.
    // Usamos 'runProcessWithFeedback' de tu NotificationService, que es perfecto para esto.
    notificationService.runProcessWithFeedback(
      'Finalizando Jornada',
      'Validando y guardando datos. Este proceso puede tardar un momento...',
      (reportProgress) => {
        // Esta función anónima se ejecuta en segundo plano.

        // 3. Llamar al método del SERVICIO que hace todo el trabajo.
        // El servicio se encargará de reportar el progreso si es necesario.
        return getJornadaService().finalizarYGuardarJornada(reportProgress);
      }
    );

  } catch (e) {
    const error = e as Error;
    // Capturamos cualquier error que pueda ocurrir ANTES de llamar al servicio.
    notificationService.showError(`Error crítico al intentar finalizar la jornada: ${error.message}`, error);
  } finally {
    // 4. Refrescar el menú AL FINAL, pase lo que pase.
    // Esto asegurará que el título del menú muestre "Finalizada" si todo fue bien,
    // o que se mantenga "En Curso" si hubo un error en el proceso.
    buildDynamicMenu({} as GoogleAppsScript.Events.DocsOnOpen);
  }

}

function getLineasDeTrabajoSeleccionadas_Modal(): string[] {
  try {
    return getJornadaService().getLineasDeTrabajoFromSheet();
  } catch (e: any) {
    Logger.log(`Error en getLineasDeTrabajoSeleccionadas_Modal: ${e.message}`);
    throw e; // Re-lanzar para que el .withFailureHandler del cliente lo capture.
  }
}

function getExistingLDAData_Modal(): LogrosDificultadesAcuerdosDTO | null {
  try {
    return getJornadaService().getLDAFromProperties();
  } catch (e: any) {
    Logger.log(`Error en getExistingLDAData_Modal: ${e.message}`);
    throw e;
  }
}

function guardarLogrosDificultadesAcuerdos(datosParaGuardar: LogrosDificultadesAcuerdosDTO): { success: boolean; message: string } {
  try {
    getJornadaService().saveLDAToProperties(datosParaGuardar);
    // 2. Pedirle al servicio de la hoja que formatee y escriba los datos.
    getJornadaSheetService().actualizarCeldasLDA(datosParaGuardar);

    return { success: true, message: "Datos guardados temporalmente." };
  } catch (e: any) {
    Logger.log(`Error en guardarLogrosDificultadesAcuerdos: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * [CONTROLADOR] Muestra el diálogo modal para agregar/editar Logros, Dificultades y Acuerdos.
 * Esta es la función que debe ser llamada desde el menú de la hoja de cálculo.
 * El nombre debe coincidir con el que usas en la configuración del menú.
 */
function agregarLogrosPA() { // ¡El nombre exacto que te da el error!
  try {
    // 1. Validar que una jornada esté activa.
    // Si no hay ID de visita, no se puede continuar.
    const idVisitaActiva = PropertiesService.getScriptProperties().getProperty(appConfig.properties.ID_JORNADA_KEY);
    if (!idVisitaActiva) {
      getNotificationService().showError("No hay una jornada activa. Por favor, inicie una jornada antes de registrar logros.");
      return;
    }

    // 2. Crear el HTML desde el archivo.
    const htmlOutput = HtmlService.createHtmlOutputFromFile('ui/modals/agregarLogros') // Usa el nombre de tu archivo HTML
      .setWidth(900)  // Ajusta el ancho según tus necesidades
      .setHeight(650); // Ajusta la altura según tus necesidades

    // 3. Mostrar el diálogo.
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Registrar Logros, Dificultades y Acuerdos');

  } catch (e) {
    const error = e as Error;
    Logger.log(`Error al intentar abrir el diálogo de logros: ${error.message}`);
    // Usamos nuestro NotificationService para mostrar el error al usuario.
    getNotificationService().showError(`No se pudo abrir el diálogo. Error: ${error.message}`);
  }
}
