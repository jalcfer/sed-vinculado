// Servicio para operaciones administrativas del complemento (AdminService)
// Extraído y refactorizado desde adminOps.ts

class AdminService {
  private static instance: AdminService;

  private constructor() {
    // El constructor privado asegura que no se pueda instanciar desde fuera.
  }

  public static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  public prepararDocumentoAdmin(): void {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      ss.toast('Iniciando preparación del documento...', 'Proceso Admin', -1);

      // 1. Limpiar el spreadsheet
      //SEDCentralLib.DriveUtils.limpiarSpreadsheet(ss.getId());
      getSheetService().limpiarSpreadsheet();

      // 2. Obtener las vistas de datos desde el Repositorio
      const dataViewRepo = getDataViewRepository();
      const docenteRepo = getDocenteRepository();

      const acompanamientosView = dataViewRepo.getAcompanamientosView();
      const paView = dataViewRepo.getProfesionalesAcompanamientoView();
      const docentesRawData = docenteRepo.getDocentesRawDataView();
      
      // 3. Procesar los datos de docentes
      const docentesView = docenteMapper.processDocentesView(docentesRawData);

      // 4. Convertir los resultados a formato de hoja de cálculo y crear las hojas
      getSheetService().crearHojaConDatos('Acompañamientos', dataMapper.to2DArray(acompanamientosView));
      getSheetService().crearHojaConDatos('PA', dataMapper.to2DArray(paView));
      getSheetService().crearHojaConDatos('Docentes', dataMapper.to2DArray(docentesView));

      SpreadsheetApp.getActiveSpreadsheet().toast('Documento preparado exitosamente.', 'Proceso Admin', 5);

    } catch (e) {
      const error = e as Error;
      Logger.log(`Error en prepararDocumentoAdmin: ${error.message}`);
      SpreadsheetApp.getUi().alert(`Ocurrió un error: ${error.message}`);
    }
  }

  public asignarPAIEO(paId: string, ieoId: string, carpetaPA: string): void {
    getAdminRepository().asignarPAIEO(paId, ieoId, carpetaPA);
  }

  /**
   * Obtiene los acompañamientos asignados al usuario actual.
   * @returns Un array de objetos con id y nombre de cada acompañamiento.
   */
  public getAcompanamientosParaUsuario(): { id: string; nombre: string }[] {
    try {
      const acompanamientos = getDataViewRepository().getAcompanamientosParaUsuarioView();

      if (!acompanamientos || acompanamientos.length === 0) {
        return [];
      }

      // Se mapea el resultado para construir el texto descriptivo
      return acompanamientos.map((acomp: any) => ({
        id: acomp.ID_Acompanamiento,
        nombre: `${acomp.Institucion_educativa} (PA: ${acomp.Nombre_profesional_acompanamiento})`
      }));

    } catch (e) {
      const error = e as Error;
      Logger.log(`Error en getAcompanamientosParaUsuario: ${error.message}`);
      throw new Error(`No se pudieron cargar los acompañamientos: ${error.message}`);
    }
  }
}

function getAdminService(): AdminService {
  return AdminService.getInstance();
}
