/**
 * @fileoverview Servicio para gestionar la lógica de negocio de las Jornadas de Acompañamiento.
 * Se encarga de orquestar la creación de la estructura de archivos en Drive y el registro en la base de datos,
 * siguiendo las especificaciones definidas en el prompt.
 */

class JornadaService {
  private static instance: JornadaService;
  private driveUtils: any;

  public static getInstance(): JornadaService {
    if (!JornadaService.instance) {
      JornadaService.instance = new JornadaService();
    }
    return JornadaService.instance;
  }

  private constructor() {
    this.driveUtils = SEDCentralLib.getDriveUtils();
  }

  /**
   * Orquesta la creación de la estructura completa para N nuevas jornadas de un acompañamiento.
   *
   * @param acompId El ID del acompañamiento para el cual se crean las jornadas.
   * @param numeroDeJornadas La cantidad de jornadas (y archivos) a crear.
   * @param reportProgress Función de callback para notificar el progreso a la UI.
   * @returns Un array con los objetos de los archivos de jornada registrados en la base de datos.
   */
  public crearEstructurasDeJornada(acompId: string, numeroDeJornadas: number, reportProgress: (message: string) => void): Archivo_Jornada[] {
    Logger.log(`Iniciando creación de ${numeroDeJornadas} estructuras para Acompañamiento: ${acompId}`);

    // 1. Obtener datos necesarios desde la BD a través del Repositorio
    const infoAcompanamiento = getAcompanamientoRepository().getAcompanamientoInfo(acompId);
    if (!infoAcompanamiento || !infoAcompanamiento.idFolderPrincipal) {
      throw new Error(`No se pudo encontrar la información del acompañamiento o el ID de la carpeta principal para el PA.`);
    }

    const { idFolderPrincipal, nombreIEO, nombreCarpeta } = infoAcompanamiento;

    // Obtener el último número de jornada existente para continuar la secuencia
    const ultimaJornada = getAcompanamientoRepository().getLastJornadaNumber(acompId);
    reportProgress(`Última jornada encontrada: ${ultimaJornada}. Las nuevas jornadas continuarán desde este número.`);

    // 2. Crear la estructura de carpetas base
    const carpetaAcompanamiento = this.crearCarpetasBase(idFolderPrincipal, nombreCarpeta);
    reportProgress('Estructura de carpetas base verificada/creada.');


    Logger.log(`infoAcompanamiento: ${JSON.stringify(infoAcompanamiento)}`);
    // 2.1 Asegurar que el archivo de informe del PA exista
    this.ensurePaStructureExists(infoAcompanamiento, reportProgress);

    // 3. Bucle para crear cada jornada
    const archivosCreados: Archivo_Jornada[] = [];
    const numeroJornadaInicial = ultimaJornada + 1;
    const numeroJornadaFinal = ultimaJornada + numeroDeJornadas;

    for (let i = numeroJornadaInicial; i <= numeroJornadaFinal; i++) {
      // La validación de existencia ya no es necesaria aquí si siempre creamos a partir de la última.
      // Sin embargo, la mantenemos como una doble verificación por si acaso.
      if (getJornadaRepository().isJornadaFileExists(acompId, i)) {
        reportProgress(`Jornada ${i}: Ya existe. Omitiendo creación.`);
        continue; // Si ya existe, se salta a la siguiente
      }

      const nuevoArchivo = this.crearJornadaIndividual(acompId, i, carpetaAcompanamiento.getId());
      archivosCreados.push(nuevoArchivo);
      reportProgress(`Jornada ${i} creada y registrada con éxito.`);
    }

    Logger.log(`${archivosCreados.length} de ${numeroDeJornadas} jornadas fueron creadas y registradas con éxito.`);
    return archivosCreados;
  }

  /**
   * Crea y/o encuentra la estructura de carpetas base para un acompañamiento.
   * @param idFolderPrincipal ID de la carpeta raíz del PA.
   * @param nombreCarpetaIEO Nombre de la carpeta para la Institución Educativa.
   * @returns El objeto Folder de la carpeta "{n}. Acompañamiento".
   */
  private crearCarpetasBase(idFolderPrincipal: string, nombreCarpetaIEO: string): GoogleAppsScript.Drive.Folder {
    // Usar el nombre de carpeta provisto. Si no existe, se formatea el nombre de la IEO como fallback.
    const nombreCarpeta = nombreCarpetaIEO.toUpperCase().replace(/INSTITUCIÓN EDUCATIVA/g, 'IE');
    const carpetaIEO = this.driveUtils.findOrCreateFolder(idFolderPrincipal, nombreCarpeta);

    // Crear carpeta "1. Acompañamiento"
    // Nota: La lógica para buscar "{n}. Acompañamiento" se simplifica a crear "1. Acompañamiento" si no existe.
    const carpetaAcompanamiento = this.driveUtils.findOrCreateFolder(carpetaIEO.getId(), '1. Acompañamiento');
    return carpetaAcompanamiento;
  }

  /**
   * Crea la estructura de una jornada individual.
   * @param acompId ID del acompañamiento.
   * @param numeroJornada Número de la jornada a crear.
   * @param idCarpetaAcompanamiento ID de la carpeta padre ("1. Acompañamiento").
   * @returns El objeto Archivo_Jornada creado.
   */
  private crearJornadaIndividual(acompId: string, numeroJornada: number, idCarpetaAcompanamiento: string): Archivo_Jornada {
    // Crear nombre de carpeta de jornada: "{consecutivo}. DD/Mes(Iniciales)/Año"

    const nombreCarpetaJornada = `${numeroJornada}. DD/Mes(iniciales)/AÑO`;
    const carpetaJornada = this.driveUtils.findOrCreateFolder(idCarpetaAcompanamiento, nombreCarpetaJornada);

    // Crear carpeta "Evidencias" dentro de la carpeta de la jornada
    const carpetaEvidencias = this.driveUtils.findOrCreateFolder(carpetaJornada.getId(), 'Evidencias');

    // 1. Copiar el archivo activo que contiene el script
    const archivoOriginal = SpreadsheetApp.getActiveSpreadsheet();
    const nombreArchivo = `Seguimiento de acompañamiento - Jornada ${numeroJornada}`;
    const nuevoArchivoDrive = this.driveUtils.copyFile(archivoOriginal.getId(), carpetaJornada.getId(), nombreArchivo);
    const nuevoArchivoId = nuevoArchivoDrive.getId();

    // 2. Preparar la hoja para la plantilla usando el servicio específico.
    getJornadaSheetService().prepararHojaDeJornada(nuevoArchivoId);

    // 3. Obtener la plantilla de formato
    const plantilla = getJornadaSheetTemplate();

    // 4. Construir el mapa de datos para las listas desplegables dinámicas
    const listDataMap: { [key: string]: string[] } = {};
    plantilla.fields.forEach(field => {
      if (field.type === 'dropdown' && field.dataSource) {
        const { table, valueColumn, activeColumn } = field.dataSource;
        // Solo consultamos si aún no tenemos los datos para esta tabla
        if (!listDataMap[table]) {
          listDataMap[table] = getDataViewRepository().getListData(table, valueColumn, activeColumn);
        }
      }
    });

    Logger.log(`Datos de listas desplegables obtenidos: ${JSON.stringify(listDataMap)}`);

    // 5. Aplicar la plantilla de formato a la hoja, pasando los datos dinámicos
    getTemplateService().applySheetTemplate(nuevoArchivoId, appConfig.sheets.jornada.name, plantilla, listDataMap);

    // 6. Registrar el archivo en la base de datos usando el Repositorio
    return getJornadaRepository().registerJornadaFile(
      acompId,
      nuevoArchivoId,
      carpetaEvidencias.getId(),
      numeroJornada
    );
  }

  /**
   * Asegura que la estructura de carpetas e informes para un PA exista.
   * Crea la carpeta "Informes" y el archivo "Informe de Acompañamiento" si no existen.
   * @param paInfo Objeto con la información del PA (idPa, idFolderPrincipal, nombrePa, idFolderInformes).
   * @param reportProgress Función para notificar el progreso.
   */
  private ensurePaStructureExists(paInfo: any, reportProgress: (message: string) => void): void {
    Logger.log(`Iniciando ensurePaStructureExists para PA: ${paInfo.nombrePa} (ID: ${paInfo.idPa})`);
    // 1. Crear o encontrar la carpeta "Informes" y actualizar la BD si es necesario.
    let informesFolderId = paInfo.idFolderInformes;
    if (!informesFolderId) {
      reportProgress('Creando carpeta "Informes" para el PA...');
      Logger.log(`ID de carpeta principal del PA: ${paInfo.idFolderPrincipal}`);
      const informesFolder = this.driveUtils.findOrCreateFolder(paInfo.idFolderPrincipal, 'Informes');
      informesFolderId = informesFolder.getId();
      getAcompanamientoRepository().updatePaFolderInformes(paInfo.idPa, informesFolderId);
      reportProgress('Carpeta "Informes" creada y registrada.');
      Logger.log(`Carpeta "Informes" creada con ID: ${informesFolderId}`);
    } else {
      reportProgress('Carpeta "Informes" ya existe.');
      Logger.log(`Carpeta "Informes" ya existe con ID: ${informesFolderId}`);
    }

    // 2. Verificar si el archivo de informe del PA ya existe.
    Logger.log('Verificando si el archivo de informe del PA ya existe...');
    const paRepo = getPaRepository();
    const existingFile = paRepo.findPaFileByPaId(paInfo.idPa);
    if (existingFile) {
      reportProgress(`Archivo "Informe de Acompañamiento" para ${paInfo.nombrePa} ya existe.`);
      return;
    }

    // 3. Si no existe, crearlo dentro de la carpeta "Informes".
    reportProgress(`Creando archivo "Informe de Acompañamiento" para ${paInfo.nombrePa}...`);
    Logger.log(`Creando archivo de informe en la carpeta: ${informesFolderId}`);
    const fileName = `Informe de Acompañamiento - ${paInfo.nombrePa}`;

    const sourceFileId = SpreadsheetApp.getActiveSpreadsheet().getId();
    const newFile = this.driveUtils.copyFile(sourceFileId, informesFolderId, fileName);
    const newFileId = newFile.getId();
    reportProgress(`Archivo copia creado con ID: ${newFileId}`);
    Logger.log(`Archivo de informe creado con ID: ${newFileId}`);

    // Limpiar el archivo copia, dejando solo una hoja llamada "Jornadas".
    this.driveUtils.limpiarSpreadsheet(newFileId, 'Jornadas');
    reportProgress(`Archivo copia limpiado y preparado.`);
    Logger.log('Archivo de informe limpiado y preparado.');

    paRepo.createPaFileRecord(paInfo.idPa, newFileId);
    reportProgress(`Archivo de informe para PA registrado en la base de datos.`);
  }

  /**
   * Instala un trigger 'onEdit' para una hoja de cálculo específica.
   * El nombre de la función del trigger debe estar en el ámbito global.
   * @param spreadsheetId El ID de la hoja de cálculo donde se instalará el trigger.
   */
  public instalarTriggerOnEdit(spreadsheetId: string): void {
    try {
      ScriptApp.newTrigger('onEditJornadaSheet')
        .forSpreadsheet(spreadsheetId)
        .onEdit()
        .create();
      Logger.log(`Trigger 'onEditJornadaSheet' instalado correctamente en la hoja ${spreadsheetId}.`);
    } catch (e) {
      const error = e as Error;
      Logger.log(`Error al instalar el trigger 'onEdit' en la hoja ${spreadsheetId}: ${error.message}`);
      // Dependiendo de la criticidad, se podría lanzar un error.
      // throw new Error(`No se pudo instalar el trigger onEdit: ${error.message}`);
    }
  }

  /**
   * Inicia una nueva jornada en la base de datos.
   * @returns Un objeto con los datos para actualizar la hoja: { fecha, numeroJornada, nombreIEO }.
   */
  public iniciarJornada(numParticipantes: number, reportProgress: (message: string) => void): { fecha: Date; numeroJornada: number; nombreIEO: string } {
    const fileId = SpreadsheetApp.getActiveSpreadsheet().getId();

    // 1. Obtener datos clave del repositorio
    const info = getJornadaRepository().getJornadaInfoByFileId(fileId);
    if (!info) {
      throw new Error('Este archivo no está registrado como un archivo de jornada válido.');
    }

    // 2. Validar que la jornada no haya sido iniciada previamente
    if (info.ID_Visita) {
      throw new Error(`La jornada ${info.Numero_jornada} ya fue iniciada previamente.`);
    }

    // 3. Calcular el siguiente número de jornada y validar
    const ultimoNumJornadaEnBD = getAcompanamientoRepository().getLastJornadaNumber(info.ID_Acompanamiento);
    const numJornadaEsperado = ultimoNumJornadaEnBD + 1;

    if (info.Numero_jornada !== numJornadaEsperado) {
      throw new Error(`Error de secuencia. Se esperaba iniciar la jornada ${numJornadaEsperado}, pero este archivo corresponde a la jornada ${info.Numero_jornada}.`);
    }
    reportProgress(`Iniciando jornada ${info.Numero_jornada} para el acompañamiento ${info.ID_Acompanamiento}.`);
    // 4. Calcular ID_Semana_corte
    const fechaActual = new Date();
    const semanaCorteId = getCatalogoRepository().findSemanaCorteId(fechaActual);
    if (!semanaCorteId) {
      throw new Error('No se pudo determinar la semana de corte para la fecha actual. Verifique la configuración de la tabla Semana_Corte.');
    }

    // 5. Crear el registro inicial de la visita
    const nuevaVisitaId = getJornadaRepository().createInitialVisita({
      ID_Acompanamiento: info.ID_Acompanamiento,
      ID_Semana_corte: semanaCorteId,
      Numero_participantes: numParticipantes,
      Numero_jornada: info.Numero_jornada,
      Fecha_visita: fechaActual,
    });
    reportProgress(`Visita inicial creada con ID: ${nuevaVisitaId}`);
    // 6. Actualizar Archivo_Jornada con el nuevo ID_Visita
    getJornadaRepository().updateArchivoJornada(info.ID_Archivo_jornada, {
      ID_Visita: String(nuevaVisitaId),
      Estado_archivo_jornada: 'activo',
      Fecha_actualizacion: new Date().toISOString()
    });

    const ieoIdAsString = Math.floor(info.ID_IEO).toString();
    PropertiesService.getScriptProperties().setProperty(appConfig.properties.JORNADA_STATUS_KEY, 'INICIADA');
    PropertiesService.getScriptProperties().setProperty(appConfig.properties.ID_IEO_KEY, ieoIdAsString);
    PropertiesService.getScriptProperties().setProperty(appConfig.properties.NOMBRE_IEO_KEY, info.Institucion_educativa);
    PropertiesService.getScriptProperties().setProperty(appConfig.properties.ID_JORNADA_KEY, String(nuevaVisitaId));
    PropertiesService.getScriptProperties().setProperty(appConfig.properties.JORNADA_NUMERO_KEY, String(info.Numero_jornada));

    reportProgress(`Archivo de jornada ${info.ID_Archivo_jornada} actualizado con el ID de visita ${nuevaVisitaId}.`);
    Logger.log(`Jornada ${info.Numero_jornada} iniciada con éxito. Visita ID: ${nuevaVisitaId}`);

    // 7. Devolver datos para la UI
    return {
      fecha: fechaActual,
      numeroJornada: info.Numero_jornada,
      nombreIEO: info.Institucion_educativa, // Asumiendo que getJornadaInfoByFileId devuelve esto
    };
  }

  /**
   * Orquesta el proceso completo de validación, persistencia y protección
   * de una jornada de acompañamiento.
   * @param reportProgress Función de callback para notificar el progreso a la UI.
   * @returns Un string con el mensaje de éxito final.
   */
  public finalizarYGuardarJornada(reportProgress: (message: string) => void): string {
    // --- 1. OBTENER CONTEXTO Y VALIDAR ---
    reportProgress('Obteniendo información de la sesión...');
    const props = PropertiesService.getScriptProperties();
    const idVisitaStr = props.getProperty(appConfig.properties.ID_JORNADA_KEY);

    if (!idVisitaStr) {
      throw new Error("No se encontró un ID de visita activo en la sesión. No se puede finalizar.");
    }
    const idVisita = parseInt(idVisitaStr, 10);

    reportProgress('Validando datos de la jornada...');
    const validationResult = this.validateDataForFinalizacion();
    if (!validationResult.isValid) {
      // Si la validación falla, lanzamos un error que será capturado por el controlador.
      throw new Error(validationResult.message);
    }

    // --- 2. RECOPILAR Y PERSISTIR DATOS ---
    reportProgress('Guardando datos principales...');
    this.persistirDatosVisita(idVisita);

    reportProgress('Guardando líneas de trabajo...');
    // Este método devuelve los IDs de los registros creados para usarlos después.
    const lineasVisitaMap = this.persistirLineasTrabajo(idVisita);

    reportProgress('Guardando logros, dificultades y acuerdos...');
    this.persistirLDA(idVisita, lineasVisitaMap);

    reportProgress('Registrando evidencias...');
    // Llamamos al servicio de evidencias para que se encargue de su lógica.
    getEvidenciaService().persistEvidenciasFromProperties(idVisita);

    // --- 3. ACTUALIZAR ESTADO Y PROTEGER LA HOJA ---
    reportProgress('Aplicando protecciones a la hoja...');
    getJornadaSheetService().protegerHojaCompleta();

    reportProgress('Actualizando estado final de la jornada...');
    const fileId = SpreadsheetApp.getActiveSpreadsheet().getId();
    getJornadaRepository().actualizarEstadoArchivoJornadaByArchivoId(fileId, 'Finalizada');

    this.actualizarEstadoFinal();

    reportProgress('Limpiando datos de sesión...');
    this.limpiarCacheDeSesion();

    return '¡Jornada finalizada y guardada con éxito! La hoja ha sido bloqueada.';
  }

  // --- MÉTODOS PRIVADOS DE AYUDA ---

  /**
   * [HELPER] Lee los datos finales de la visita desde la hoja y los actualiza en la BD.
   */
  private persistirDatosVisita(idVisita: number): void {
    const sheet = getJornadaSheetService().getActiveJornadaSheet();

    const estadoFinal: EstadoVisita = 'Finalizada';

    const jornadaData = {
      Tipo_Visita: sheet.getRange(appConfig.sheets.jornada.fields.tipoJornada.range).getValue(),
      Objetivo_visita: sheet.getRange(appConfig.sheets.jornada.fields.objetivoJornada.range).getValue(),
      DuracionHoras: sheet.getRange(appConfig.sheets.jornada.fields.horasJornada.range).getValue(),
      Estado: estadoFinal, 
      Fecha_actualizacion: new Date().toISOString()
    };
    getJornadaRepository().updateVisita(idVisita, jornadaData);
  }

  /**
   * [HELPER] Lee las líneas de trabajo, las guarda en la BD y devuelve un mapa para su uso posterior.
   */
  private persistirLineasTrabajo(idVisita: number): Map<string, number> {
    const repo = getJornadaRepository();
    const lineasNombres = this.getLineasDeTrabajoFromSheet();
    const lineasVisitaMap = new Map<string, number>();

    lineasNombres.forEach(nombreLinea => {
      // Necesitamos el ID de la línea de trabajo, no solo el nombre.
      const idLineaTrabajo = getCatalogoRepository().findIdByValue('Linea_Trabajo', 'Nombre_linea_trabajo', nombreLinea);
      if (idLineaTrabajo) {
        const idLineaVisita = repo.createLineaTrabajoVisita(idVisita, idLineaTrabajo);
        lineasVisitaMap.set(nombreLinea, idLineaVisita);
      }
    });
    return lineasVisitaMap;
  }

  /**
   * [HELPER] Lee el JSON de LDA y lo guarda en la BD.
   */
  private persistirLDA(idVisita: number, lineasVisitaMap: Map<string, number>): void {
    const ldaData = this.getLDAFromProperties();
    if (!ldaData) return;

    const repo = getJornadaRepository();
    const logrosParaInsertar: any[] = [];
    const dificultadesParaInsertar: any[] = [];
    const acuerdosParaInsertar: any[] = [];

    for (const nombreLinea in ldaData) {
      const idLineaVisita = lineasVisitaMap.get(nombreLinea);
      if (idLineaVisita) {
        ldaData[nombreLinea].logros.forEach(desc => logrosParaInsertar.push({ ID_Linea_trabajo_visita: idLineaVisita, Descripcion_logro: desc }));
        ldaData[nombreLinea].dificultades.forEach(desc => dificultadesParaInsertar.push({ ID_Linea_trabajo_visita: idLineaVisita, Descripcion_dificultad: desc }));
        ldaData[nombreLinea].acuerdos.forEach(desc => acuerdosParaInsertar.push({ ID_Linea_trabajo_visita: idLineaVisita, Descripcion_acuerdo_compromiso: desc }));
      }
    }

    // Llamar a los métodos de inserción masiva del repositorio.
    if (logrosParaInsertar.length > 0) repo.batchInsertLogros(logrosParaInsertar);
    if (dificultadesParaInsertar.length > 0) repo.batchInsertDificultades(dificultadesParaInsertar);
    if (acuerdosParaInsertar.length > 0) repo.batchInsertAcuerdos(acuerdosParaInsertar);
  }

  /**
   * [HELPER] Actualiza la propiedad de estado a 'Finalizada'.
   */
  private actualizarEstadoFinal(): void {
    PropertiesService.getScriptProperties().setProperty(appConfig.properties.JORNADA_STATUS_KEY, 'Finalizada');
  }

  /**
   * [HELPER] Limpia todas las propiedades de la sesión de jornada.
   */
  private limpiarCacheDeSesion(): void {
    const props = PropertiesService.getScriptProperties();
    const keysToDelete = [
      appConfig.properties.LOGROS_DIFICULTADES_ACUERDOS_KEY,
      appConfig.properties.EVIDENCIAS_JSON_KEY,
      appConfig.properties.JORNADA_IS_DIRTY_KEY,
      // Añade aquí cualquier otra clave de sesión que quieras limpiar
    ];
    keysToDelete.forEach(key => props.deleteProperty(key));
  }

  /**
   * Método privado que orquesta las validaciones de negocio.
   */
  private validateDataForFinalizacion(): { isValid: boolean; message: string; } {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const template = getJornadaSheetTemplate(); // Necesitamos la plantilla

    // --- Validación 1: Campos requeridos de la plantilla ---
    const requiredFieldsResult = getBusinessValidationService().validateRequiredFields(sheet, template);
    if (!requiredFieldsResult.isValid) {
      return requiredFieldsResult; // Devolver el primer error encontrado
    }

    // --- Validación 2: Conteo de participantes ---

    // --- REFACTORIZACIÓN DE LA VALIDACIÓN 2 ---

    // a) Obtener el número esperado desde PropertiesService.
    const expectedCountStr = PropertiesService.getScriptProperties().getProperty(appConfig.properties.PARTICIPANTS_COUNT_KEY);
    const expectedCount = expectedCountStr ? parseInt(expectedCountStr, 10) : 0;

    // b) Obtener el número real de participantes contados EN LA HOJA.
    //    Esto asume que tienes una fórmula =CONTARA(...) en la celda K19, por ejemplo.
    const rangeTotalParticipantes = `${appConfig.sheets.jornada.fields.tituloParticipantes.fields.totalParticipantes.startCol}19`;
    const totalCell = sheet.getRange(rangeTotalParticipantes);
    const actualCountFromCell = totalCell.getValue();

    // d) Realizar la validación con el servicio.
    const participantCountResult = getBusinessValidationService().validateParticipantCount(expectedCount, actualCountFromCell);
    if (!participantCountResult.isValid) {
      return participantCountResult;
    }

    // --- Se pueden añadir más llamadas a otros métodos de validación aquí ---

    // Si todas las validaciones pasan
    return { isValid: true, message: 'Validación exitosa.' };
  }

  /**
   * Obtiene las líneas de trabajo seleccionadas en la hoja de jornada.
   * @returns Un array con los nombres de las líneas de trabajo.
   */
  public getLineasDeTrabajoFromSheet(): string[] {
    // Asumo que la celda I11 contiene los valores separados por coma, o es una validación de datos.
    // Ajusta el rango según tu plantilla.
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const range = sheet.getRange(appConfig.sheets.jornada.fields.lineaTrabajoJornada.range); // ej. 'I11'
    const value = range.getValue();

    if (typeof value === 'string' && value.trim() !== '') {
      // Devuelve un array de strings, quitando espacios extra.
      return value.split(',').map(item => item.trim());
    }
    return [];
  }

  /**
   * Guarda el objeto DTO de Logros, Dificultades y Acuerdos (LDA) en PropertiesService.
   * @param ldaData El objeto DTO que viene del modal.
   */
  public saveLDAToProperties(ldaData: LogrosDificultadesAcuerdosDTO): void {
    try {
      // Convertimos el objeto a un string JSON para poder guardarlo.
      const ldaJsonString = JSON.stringify(ldaData);
      PropertiesService.getScriptProperties().setProperty(
        appConfig.properties.LOGROS_DIFICULTADES_ACUERDOS_KEY,
        ldaJsonString
      );
    } catch (e: any) {
      Logger.log(`Error al serializar o guardar LDA en PropertiesService: ${e.message}`);
      throw new Error("No se pudo guardar la información de logros y dificultades.");
    }
  }

  /**
   * Obtiene los datos LDA desde PropertiesService y los devuelve como un objeto.
   * @returns El objeto DTO de LDA, o null si no hay nada guardado.
   */
  public getLDAFromProperties(): LogrosDificultadesAcuerdosDTO | null {
    const ldaJsonString = PropertiesService.getScriptProperties().getProperty(
      appConfig.properties.LOGROS_DIFICULTADES_ACUERDOS_KEY
    );

    if (ldaJsonString) {
      try {
        // Parseamos el string JSON de vuelta a un objeto.
        return JSON.parse(ldaJsonString) as LogrosDificultadesAcuerdosDTO;
      } catch (e: any) {
        Logger.log(`Error al parsear LDA JSON desde PropertiesService: ${e.message}. Contenido: ${ldaJsonString}`);
        // Si el JSON está corrupto, es más seguro devolver null.
        return null;
      }
    }
    return null;
  }

  public getJornadaStatus(): EstadoJornada {
    return (PropertiesService.getScriptProperties().getProperty(appConfig.properties.JORNADA_STATUS_KEY) || 'No Iniciada') as EstadoJornada;
  }
}

function getJornadaService(): JornadaService {
  return JornadaService.getInstance();
}
