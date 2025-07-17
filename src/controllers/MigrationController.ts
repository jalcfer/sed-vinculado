/**
 * @fileoverview Controlador para las acciones de migración semimanual.
 * Expone la función que se llama desde el HTML del modal de migración.
 */

/**
 * Define la estructura de cada fila de datos que se recibe desde el HTML.
 */
interface MigrationRowData {
  sourceFolderId: string;
  destinationFolderId: string;
}

/**
 * Función global expuesta a la UI para iniciar el proceso de migración semimanual.
 * Recibe los datos del formulario, los valida y llama al servicio correspondiente.
 * @param migrationData Un array de objetos, donde cada objeto contiene 'sourceFolderId' y 'destinationFolderId'.
 * @returns Un string con el resultado de la operación.
 */
function migrationController(migrationData: MigrationRowData[]): string {
  try {
    if (!migrationData || !Array.isArray(migrationData) || migrationData.length === 0) {
      throw new Error("No se proporcionaron datos de migración válidos desde el formulario.");
    }
    
    // 1. Obtener la instancia del servicio de migración.
    const migrationService = getMigrationService();

    // 2. Llamar al método del servicio que contiene la lógica de negocio.
    // Le pasamos los datos recopilados del formulario.
    const resultSummary = migrationService.migrateSemiManual(migrationData);
    
    return resultSummary;
  } catch (e) {
    const error = e as Error;
    Logger.log(`Error en MigrationController: ${error.stack}`);
    throw new Error(`Error en el controlador: ${error.message}`);
  }
}

/**
 * Muestra el diálogo modal para la migración semimanual de evidencias.
 * Esta función es llamada desde el menú del complemento.
 */
function showMigrationDialog() {
  const html = HtmlService.createHtmlOutputFromFile('ui/modals/migrationTool')
    .setWidth(800)
    .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'Migración Semimanual de Evidencias');
}