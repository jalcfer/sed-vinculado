/**
 * @fileoverview Servicio para gestionar la lógica de negocio de las Evidencias.
 */

class EvidenciaService_ {
  private static instance: EvidenciaService_;
  private repository: EvidenciaRepository_;
  private driveUtils: any;

  public static getInstance(): EvidenciaService_ {
    if (!EvidenciaService_.instance) {
      EvidenciaService_.instance = new EvidenciaService_();
    }
    return EvidenciaService_.instance;
  }

  private constructor() {
    this.repository = getEvidenciaRepository();
    this.driveUtils = SEDCentralLib.getDriveUtils();
  }

  /**
   * Obtiene la lista de evidencias para la visita actual siguiendo la lógica de cascada:
   * 1. Busca en PropertiesService.
   * 2. Si no encuentra, busca en la Base de Datos.
   * 3. Si encuentra en la BD, lo guarda en PropertiesService para futuras llamadas.
   * @param idVisita El ID de la visita actual.
   * @returns Un array de DTOs de evidencia, o un array vacío si no hay nada.
   */
  public getEvidenciasParaModal(idVisita: number): EvidenciaDisplayDTO[] {
    // --- Prioridad #1: Buscar en PropertiesService ---
    const ldaFromProps = this.getEvidenciasFromProperties();
    if (ldaFromProps) {
      Logger.log("Evidencias encontradas en PropertiesService. Usando caché de sesión.");
      return ldaFromProps.filter(ev => ev.estado !== 'eliminada');
    }

    // --- Prioridad #2: Si no hay nada en Properties, buscar en la BD ---
    Logger.log("No se encontraron evidencias en caché. Buscando en la Base de Datos.");
    const evidenciasFromDB = this.repository.findByVisitaId(idVisita);

    if (evidenciasFromDB && evidenciasFromDB.length > 0) {
      Logger.log(`Se encontraron ${evidenciasFromDB.length} evidencias en la BD. Creando caché en PropertiesService.`);
      // Mapear los datos de la BD a la estructura que queremos en el JSON
      const evidenciasParaCache = evidenciasFromDB.map(ev => ({
        tipo: ev.Tipo_evidencia,
        nombreOriginal: ev.Nombre_archivo_original,
        url: ev.Url,
        mimeType: ev.MIMEtype,
        estado: ev.Estado_evidencia,
      } as EvidenciaDisplayDTO));

      // Guardar esta estructura en PropertiesService para la sesión actual
      this.saveEvidenciasToProperties(evidenciasParaCache);

      return evidenciasParaCache.filter(ev => ev.estado !== 'eliminada');
    }

    // --- Prioridad #3: No hay nada en ningún lado ---
    Logger.log("No se encontraron evidencias ni en caché ni en la BD.");
    return []; // Devolver un array vacío
  }

  /**
   * Guarda un array de DTOs de evidencia en PropertiesService.
   * Este método será llamado al subir o eliminar archivos.
   * @param evidencias El array de DTOs de evidencia a guardar.
   */
  public saveEvidenciasToProperties(evidencias: EvidenciaDisplayDTO[]): void {
    const jsonString = JSON.stringify(evidencias);
    PropertiesService.getScriptProperties().setProperty(
      appConfig.properties.EVIDENCIAS_JSON_KEY, // ¡Asegúrate de tener esta clave en appConfig!
      jsonString
    );
  }

  /**
   * Obtiene y parsea las evidencias desde PropertiesService.
   * @returns Un array de DTOs o null si no existe o está corrupto.
   */
  private getEvidenciasFromProperties(): EvidenciaDisplayDTO[] | null {
    const jsonString = PropertiesService.getScriptProperties().getProperty(appConfig.properties.EVIDENCIAS_JSON_KEY);
    if (jsonString) {
      try {
        return JSON.parse(jsonString) as EvidenciaDisplayDTO[];
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Orquesta la subida de archivos y la actualización de la hoja.
   * @param idVisita El ID de la visita.
   * @param evidenceData Los datos de los archivos desde la UI.
   * @returns Un objeto con el resultado de la operación.
   */
  public subirYActualizarEvidencias(idVisita: number, evidenceData: any): { success: boolean; message: string; filesUploaded: any[]; errors: string[] } {
    const folderId = getJornadaRepository().getFolderEvidenciasId(idVisita);
    if (!folderId) {
      throw new Error("No se encontró la carpeta de evidencias para esta jornada.");
    }

    // 1. Obtener el estado actual de las evidencias desde el caché
    let evidenciasActuales = this.getEvidenciasFromProperties() || [];
    const filesUploadedResponse: any[] = [];
    const errorMessages: string[] = [];

    const archivosASubir = [
      evidenceData.asistencia,
      evidenceData.transporte,
      ...(evidenceData.fotos || [])
    ].filter(Boolean);

    archivosASubir.forEach(fileObject => {
      try {
        const nombreOriginal = fileObject.name;
        const tipoEvidencia = fileObject.tipoEvidencia;
        const nuevoNombreEnDrive = `${tipoEvidencia}_${nombreOriginal}`;

        // 1. Subir archivo a Drive
        const decodedData = Utilities.base64Decode(fileObject.data);
        const blob = Utilities.newBlob(decodedData, fileObject.mimeType, nombreOriginal);
        const uploadedFile = this.driveUtils.uploadFile(folderId, nuevoNombreEnDrive, blob);

        // 2. Crear DTO para añadir al caché
        const nuevaEvidenciaDTO: EvidenciaDisplayDTO = {
          tipo: fileObject.tipoEvidencia,
          nombreOriginal: fileObject.name,
          url: uploadedFile.getUrl(),
          mimeType: fileObject.mimeType,
          estado: 'activa',
          driveFileId: uploadedFile.getId()
        };

        evidenciasActuales.push(nuevaEvidenciaDTO);

      } catch (e) {
        const error = e as Error;
        Logger.log(`Error procesando archivo ${fileObject.name}: ${error.message}`);
        errorMessages.push(`Error con ${fileObject.name}: ${error.message}`);
      }
    });

    // 2. Después de procesar todos los archivos, guardar el nuevo array completo en Properties.
    this.saveEvidenciasToProperties(evidenciasActuales);

    // 3. Actualizar la celda de la hoja con los nuevos enlaces
    this.actualizarCeldaDeEvidencias(evidenciasActuales.filter(ev => ev.estado !== 'eliminada'));

    if (errorMessages.length > 0) {
      return { success: false, message: "Algunos archivos no se procesaron.", filesUploaded: filesUploadedResponse, errors: errorMessages };
    }
    return { success: true, message: "Archivos subidos con éxito.", filesUploaded: filesUploadedResponse, errors: [] };
  }

/**
 * [VERSIÓN CORREGIDA]
 * Marca una evidencia como 'eliminada' en el caché de sesión y mueve el archivo
 * correspondiente en Google Drive a una subcarpeta 'ELIMINADOS'.
 * Esta función opera exclusivamente sobre el caché de PropertiesService.
 *
 * @param idVisita El ID de la visita actual, necesario para encontrar la carpeta de evidencias.
 * @param tipoEvidencia El tipo único de la evidencia a eliminar.
 * @returns El array actualizado de todas las evidencias en la sesión.
 */
public marcarEvidenciaComoEliminada(idVisita: number, tipoEvidencia: string): EvidenciaDisplayDTO[] {
    // 1. Obtener el estado actual del caché
    let evidenciasActuales = this.getEvidenciasFromProperties() || [];
    const evidenciaIndex = evidenciasActuales.findIndex(ev => ev.tipo === tipoEvidencia && ev.estado !== 'eliminada');

    if (evidenciaIndex === -1) {
      Logger.log(`No se encontró la evidencia activa de tipo "${tipoEvidencia}" para eliminar.`);
      return evidenciasActuales;
    }

    const evidenciaParaEliminar = evidenciasActuales[evidenciaIndex];

    try {
      // 2. Mover el archivo en Google Drive usando el ID del caché
      if (evidenciaParaEliminar.driveFileId) {
        const folderId = getJornadaRepository().getFolderEvidenciasId(idVisita);
        if (!folderId) {
          throw new Error("No se pudo encontrar la carpeta de evidencias para mover el archivo.");
        }
        
        const file = DriveApp.getFileById(evidenciaParaEliminar.driveFileId);
        const parentFolder = file.getParents().next();
        const eliminadosFolder = this.driveUtils.findOrCreateFolder(parentFolder.getId(), 'ELIMINADOS');
        
        file.moveTo(eliminadosFolder);
        Logger.log(`Archivo ${file.getName()} movido a la carpeta ELIMINADOS.`);
      } else {
        Logger.log(`La evidencia tipo "${tipoEvidencia}" no tenía un driveFileId en el caché. No se pudo mover el archivo.`);
      }

      // 3. Actualizar el estado en el objeto JSON del caché
      evidenciaParaEliminar.estado = 'eliminada';
      Logger.log(`Evidencia tipo "${tipoEvidencia}" marcada como eliminada en el caché.`);

      // 4. Guardar el JSON actualizado de vuelta en PropertiesService
      this.saveEvidenciasToProperties(evidenciasActuales);

      // 5. Actualizar la celda de la hoja, excluyendo las eliminadas
      this.actualizarCeldaDeEvidencias(evidenciasActuales.filter(ev => ev.estado !== 'eliminada'));

    } catch (e) {
      const error = e as Error;
      Logger.log(`Error al eliminar evidencia tipo "${tipoEvidencia}": ${error.message}`);
    }

    // 6. Devolver el array completo para que la UI sepa el estado de todo
    return evidenciasActuales;
}
  /**
   * Orquesta la actualización de la celda de evidencias en la hoja.
   * @param idVisita El ID de la visita.
   */
  private actualizarCeldaDeEvidencias(evidenciasActuales: EvidenciaDisplayDTO[]): void {
    getJornadaSheetService().actualizarCeldaEvidencias(evidenciasActuales);
  }


  /**
   * Lee el caché de evidencias de PropertiesService y persiste los registros
   * 'activos' en la base de datos central.
   * @param idVisita El ID de la visita a la que se deben asociar las evidencias.
   */
  public persistEvidenciasFromProperties(idVisita: number): void {
    const evidenciasCache = this.getEvidenciasFromProperties();
    if (!evidenciasCache || evidenciasCache.length === 0) {
      Logger.log("No hay evidencias en el caché para persistir en la BD.");
      return;
    }

    const repo = getEvidenciaRepository();
    const evidenciasParaInsertar = evidenciasCache.filter(ev => ev.estado === 'activa');

    Logger.log(`Persistiendo ${evidenciasParaInsertar.length} evidencias activas en la BD para la visita ${idVisita}.`);

    evidenciasParaInsertar.forEach(dto => {
      // Antes de insertar, verificamos si una evidencia de este tipo ya existe,
      // para evitar duplicados si el proceso se ejecuta más de una vez.
      const evidenciaExistente = repo.findEvidenciaByTipo(idVisita, dto.tipo);
      if (!evidenciaExistente) {
          const record: Omit<Evidencia, 'ID_Registro_evidencia'> = {
              ID_visita: idVisita,
              Tipo_evidencia: dto.tipo,
              Nombre_archivo_original: dto.nombreOriginal,
              ID_archivo_drive: dto.driveFileId || '', // driveFileId debe existir en el DTO
              Url: dto.url,
              MIMEtype: dto.mimeType,
              Fecha_carga: new Date().toISOString(),
              Estado_evidencia: 'activa',
              Fecha_creacion: new Date().toISOString(),
              Fecha_actualizacion: new Date().toISOString()
          };
          repo.create(record);
      }
    });
  }  
}

/**
 * Retorna la instancia única de EvidenciaService_.
 */
function getEvidenciaService(): EvidenciaService_ {
  return EvidenciaService_.getInstance();
}