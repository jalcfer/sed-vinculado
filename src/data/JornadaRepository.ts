/**
 * @fileoverview Funciones para gestionar los archivos de jornada en la base de datos.
 * Utiliza la clase SedDB para interactuar con la hoja de cálculo que actúa como BD.
 */

/**
 * @class JornadaRepository
 * @description Encapsula la lógica de acceso a datos para las entidades de Jornada.
 * Interactúa con la base de datos a través de la clase SedDB de la librería central.
 */
class JornadaRepository {
  private static instance: JornadaRepository;
  private db: any;

  private constructor() {
    this.db = SEDCentralLib.getDB();
  }

  /**
   * Obtiene la instancia única (singleton) del repositorio.
   * La conexión a la base de datos se inicializa de forma perezosa en el primer acceso.
   * @returns La instancia de JornadaRepository.
   */
  public static getInstance(): JornadaRepository {
    if (!JornadaRepository.instance) {
      JornadaRepository.instance = new JornadaRepository();
    }
    return JornadaRepository.instance;
  }

  /**
   * Registra un nuevo archivo de jornada en la base de datos.
   * @param acompId ID del acompañamiento al que pertenece.
   * @param fileId ID del archivo de Google Drive.
   * @param folderEvidenciasId ID de la carpeta de evidencias de la jornada.
   * @param numeroJornada Número de la jornada.
   * @param fechaCreacion Fecha de creación (opcional, por defecto now()).
   * @param estado Estado inicial (opcional, por defecto 'creado').
   * @returns El objeto del archivo de jornada creado.
   * @throws Error si ya existe un archivo para esa jornada y acompañamiento.
   */
  registerJornadaFile(
    acompId: string,
    fileId: string,
    folderEvidenciasId: string,
    numeroJornada: number,
    fechaCreacion: Date = new Date(),
    estado: string = 'creado'
  ): Archivo_Jornada {
    if (this.isJornadaFileExists(acompId, numeroJornada)) {
      throw new Error(
        `Ya existe un archivo de jornada para el acompañamiento ${acompId} y la jornada ${numeroJornada}.`
      );
    }

    const newRecord: Omit<Archivo_Jornada, 'ID_Archivo_jornada'> = {
      ID_Acompanamiento: acompId,
      ID_archivo_drive: fileId,
      ID_folder_evidencias: folderEvidenciasId,
      Numero_jornada: numeroJornada,
      Fecha_creacion: fechaCreacion.toISOString(),
      Fecha_actualizacion: fechaCreacion.toISOString(),
      Estado_archivo_jornada: estado,
    };

    const newId = this.db.insertInto('Archivo_Jornada', newRecord);

    return { ...newRecord, ID_Archivo_jornada: newId.toString() };
  }

  /**
   * Obtiene todos los archivos de jornada para un acompañamiento específico.
   * @param acompId ID del acompañamiento.
   * @returns Array de objetos de archivo de jornada.
   */
  getJornadaFilesByAcompanamiento(acompId: string): Archivo_Jornada[] {
    const results = this.db.selectFrom('Archivo_Jornada', ['ID_Archivo_jornada', 'Numero_jornada'])
      .where('ID_Acompanamiento', '=', acompId)
      .execute();
    Logger.log(`Obteniendo archivos de jornada para Acompañamiento: ${acompId}`);
    Logger.log(`Resultados obtenidos: ${JSON.stringify(results)}`);
    return results as Archivo_Jornada[];
  }

  /**
   * Verifica si ya existe un archivo de jornada para un acompañamiento y número de jornada.
   * @param acompId ID del acompañamiento.
   * @param numeroJornada Número de la jornada.
   * @returns `true` si ya existe, `false` en caso contrario.
   */
  isJornadaFileExists(acompId: string, numeroJornada: number): boolean {
    const result = this.db.selectFrom('Archivo_Jornada', ['ID_Archivo_jornada'])
      .where('ID_Acompanamiento', '=', acompId)
      .where('Numero_jornada', '=', numeroJornada)
      .execute();
    return result.length > 0;
  }

  /**
   * Obtiene la información de un archivo de jornada a partir del ID del archivo de Drive.
   * @param fileId El ID del archivo de Google Drive.
   * @returns El objeto Archivo_Jornada o null si no se encuentra.
   */
  getJornadaInfoByFileId(fileId: string): (Archivo_Jornada & IEO) | null {
    const result = this.db.selectFrom('Archivo_Jornada', [
      'ID_Archivo_jornada',
      'ID_Acompanamiento',
      'ID_Visita',
      'ID_archivo_drive',
      'ID_folder_evidencias',
      'Numero_jornada',
      'Fecha_creacion',
      'Fecha_actualizacion',
      'Estado_archivo_jornada',
      'ID_IEO',
      'Institucion_educativa'
    ])
      .where('ID_archivo_drive', '=', fileId)
      .join('Acompanamiento')
      .join('IEO')
      .execute();

    if (result.length === 0) {
      Logger.log(`No se encontró Archivo_Jornada para el fileId: ${fileId}`);
      return null;
    }
    return result[0] as (Archivo_Jornada & IEO);
  }

  /**
   * Busca el ID de la semana de corte que corresponde a una fecha dada.
   * @param fecha La fecha para la cual buscar la semana de corte.
   * @returns El ID de la semana de corte, o null si no se encuentra.
   */
  findSemanaCorteId(fecha: Date): number | null {
    // Definir el tipo de los resultados
    interface SemanaCorteRow {
      ID_Semana_corte: string;
      Fecha_ini_semana_corte: string;
      Fecha_fin_semana_corte: string;
    }

    // Se asume que letterToColumn está disponible globalmente
    const results: SemanaCorteRow[] = this.db.selectFrom('Semana_Corte', [
      'ID_Semana_corte',
      'Fecha_ini_semana_corte',
      'Fecha_fin_semana_corte'
    ])
      .execute();

    Logger.log(`Buscando semana de corte para la fecha: ${fecha.toISOString()}`);
    Logger.log(`Resultados obtenidos: ${JSON.stringify(results)}`);

    // Función auxiliar para parsear fechas en formato DD/MMM/YYYY
    // Función auxiliar para parsear fechas en formato ISO 8601
    const parseISODate = (dateStr: string): Date => {
      Logger.log(`Parseando fecha: ${dateStr}`);
      return new Date(dateStr);
    };

    // Buscar usando find() para un enfoque más funcional
    const semanaEncontrada = results.find((row: SemanaCorteRow) => {
      const fechaInicio = parseISODate(row.Fecha_ini_semana_corte);
      const fechaFin = parseISODate(row.Fecha_fin_semana_corte);

      return fecha >= fechaInicio && fecha <= fechaFin;
    });

    return semanaEncontrada ? Number(semanaEncontrada.ID_Semana_corte) : null;
  }

  /**
   * Crea un registro inicial para una nueva visita con estado 'En Proceso'.
   * @param data Objeto con los datos iniciales de la visita.
   * @returns El ID de la nueva visita creada.
   */
  createInitialVisita(data: {
    ID_Acompanamiento: string;
    ID_Semana_corte: number;
    Numero_participantes: number;
    Numero_jornada: number;
    Fecha_visita: Date;
  }): number {
    const visitaRecord: Omit<Visita, 'ID_Visita'> = {
      ID_Acompanamiento: parseInt(data.ID_Acompanamiento, 10),
      ID_Semana_corte: data.ID_Semana_corte,
      Numero_jornada: data.Numero_jornada,
      Fecha_visita: data.Fecha_visita.toISOString(),
      Estado: 'En Curso', // Estado inicial
      // Los siguientes campos se llenarán al finalizar la jornada
      Tipo_Visita: '',
      Objetivo_visita: '',
      DuracionHoras: 0,
      Numero_participantes: data.Numero_participantes,
      Fecha_creacion: new Date().toISOString(),
      Fecha_actualizacion: new Date().toISOString(),
    };
    const newVisitaId = this.db.insertInto('Visita', visitaRecord);
    Logger.log(`Visita inicial creada con ID: ${newVisitaId}`);
    return newVisitaId;
  }

  /**
   * Vincula una visita recién creada con su correspondiente archivo de jornada.
   * @param idArchivoJornada El ID del registro en la tabla Archivo_Jornada.
   * @param idVisita El ID de la visita a vincular.
   * @returns El número de filas actualizadas (debería ser 1).
   */
  linkVisitaToJornadaFile(idArchivoJornada: string, idVisita: number): number {
    const updatedRows = this.db.update(
      'Archivo_Jornada',
      { ID_Visita: idVisita },
      { ID_Archivo_jornada: idArchivoJornada }
    );
    if (updatedRows > 0) {
      Logger.log(`Archivo_Jornada ${idArchivoJornada} actualizado para enlazar con Visita ID: ${idVisita}`);
    } else {
      Logger.log(`No se pudo actualizar Archivo_Jornada ${idArchivoJornada} para enlazar con Visita ID: ${idVisita}`);
    }
    return updatedRows;
  }

  /**
   * Crea una nueva visita y la asocia a la jornada correspondiente.
   * Esta función maneja la transacción de crear la visita, la línea de trabajo asociada
   * y actualizar el registro del archivo de jornada con el ID de la nueva visita.
   * @param acompId ID del acompañamiento.
   * @param numeroJornada Número de la jornada.
   * @param jornadaData Datos de la jornada (ej. { fecha, duracion, tipo, objetivo, lineaTrabajoId, areaId }).
   * @returns El ID de la visita creada.
   */
  updateJornada(acompId: string, numeroJornada: number, jornadaData: any): number {
    Logger.log(`Iniciando registro de visita para acomp: ${acompId}, jornada: ${numeroJornada}`);
    Logger.log(`Datos recibidos: ${JSON.stringify(jornadaData)}`);

    // 1. Crear la entidad Visita
    const visitaRecord: Omit<Visita, 'ID_Visita'> = {
      ID_Acompanamiento: parseInt(acompId, 10),
      ID_Semana_corte: 1, // TODO: Este valor debe ser dinámico
      Tipo_Visita: jornadaData.tipoJornada,
      Fecha_visita: jornadaData.fecha,
      Numero_jornada: numeroJornada,
      Estado: 'Finalizada',
      Objetivo_visita: jornadaData.objetivo,
      DuracionHoras: jornadaData.duracion,
      Numero_participantes: jornadaData.numeroParticipantes,
      Fecha_creacion: new Date().toISOString(),
      Fecha_actualizacion: new Date().toISOString(),
    };
    const newVisitaId = this.db.insertInto('Visita', visitaRecord);
    Logger.log(`Visita creada con ID: ${newVisitaId}`);

    // 2. Crear la entidad Linea_Trabajo_Visita
    const ltvRecord: Omit<Linea_Trabajo_Visita, 'ID_Linea_trabajo_visita'> = {
      ID_Visita: newVisitaId,
      ID_Linea_trabajo: jornadaData.lineaTrabajoId,
      ID_Area_linea_trabajo: jornadaData.areaId,
    };
    this.db.insertInto('Linea_Trabajo_Visita', ltvRecord);
    Logger.log(`Linea_Trabajo_Visita creada para Visita ID: ${newVisitaId}`);

    // 3. Actualizar Archivo_Jornada con el ID_Visita
    const updatedRows = this.db.update(
      'Archivo_Jornada',
      { ID_Visita: newVisitaId },
      { ID_Acompanamiento: acompId, Numero_jornada: numeroJornada }
    );

    if (updatedRows === 0) {
      // Esto no debería pasar si la lógica es correcta, pero es una buena validación.
      throw new Error(`No se pudo actualizar el Archivo_Jornada para enlazar la nueva visita.`);
    }
    Logger.log(`Archivo_Jornada actualizado para enlazar Visita ID: ${newVisitaId}`);

    return newVisitaId;
  }

  /**
   * Busca archivos de jornada según un filtro flexible.
   * @param filtros Objeto con los criterios de búsqueda.
   * @returns Array de objetos de archivo de jornada que coinciden.
   */
  getJornadaFilesByFilter(filtros: {
    acompId?: string;
    estado?: string;
    fecha?: string;
    numeroJornada?: number;
  }): Archivo_Jornada[] {
    let query = this.db.selectFrom('Archivo_Jornada', ['*']);

    // Aplicar filtros dinámicamente
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined) {
        const conditionKey = key as keyof Archivo_Jornada; // Type assertion
        query = query.where(conditionKey, '=', value);
      }
    });

    return query.execute() as Archivo_Jornada[];
  }


  /**
   * Actualiza el estado de un archivo de jornada.
   * @param archivoJornadaId ID del archivo de jornada a actualizar.
   * @param nuevoEstado Nuevo estado a establecer ("creado" | "activo" | "finalizado").
   * @returns `true` si la actualización fue exitosa, `false` en caso contrario.
   */
  actualizarEstadoArchivoJornada(archivoJornadaId: number, nuevoEstado: string): boolean {
    const updatedRows = this.db.update(
      'Archivo_Jornada',
      { Estado_archivo_jornada: nuevoEstado },
      { ID_Archivo_jornada: archivoJornadaId }
    );
    return updatedRows > 0;
  }

  /**
   * Obtiene el ID del docente a partir del nombre completo concatenado (ej. "Juan Perez").
   * Busca solo entre los docentes de la IEO indicada.
   * @param nombreCompleto Nombre y apellido concatenados (ej. "Juan Perez").
   * @param idIEO ID de la IEO a filtrar.
   * @returns El ID del docente si se encuentra, o null si no hay coincidencia exacta.
   */
  getDocenteIdByNombreCompleto(nombreCompleto: string, idIEO: string): string | null {
    // Buscar docentes de la IEO
    const docentes = this.db.selectFrom('Docente', ['ID_Docente', 'nombre', 'apellido', 'ID_IEO'])
      .where('ID_IEO', '=', idIEO)
      .execute();
    if (!docentes || docentes.length === 0) return null;

    // Buscar coincidencia exacta de nombre completo (ignorando mayúsculas/minúsculas y espacios extra)
    const normalizar = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const nombreBuscado = normalizar(nombreCompleto);
    const docente = docentes.find((d: any) => normalizar(`${d.nombre} ${d.apellido}`) === nombreBuscado);
    return docente ? docente.ID_Docente : null;
  }

  /**
   * Registra nuevos logros para una visita.
   * @param visitaId El ID de la visita.
   * @param logros Un array de strings con la descripción de los logros.
   */
  registrarLogros(visitaId: number, logros: string[]): void {
    logros.forEach(logro => {
      this.db.insertInto('Logro', {
        ID_Linea_trabajo_visita: null, // TODO: ¿Cómo se relaciona el logro con la línea de trabajo?
        Descripcion_logro: logro,
        Fecha_logro: new Date().toISOString(),
        ID_Visita: visitaId
      });
    });
  }


  /**
   * Registra nuevas dificultades para una visita.
   * @param visitaId El ID de la visita.
   * @param dificultades Un array de strings con la descripción de las dificultades.
   */
  registrarDificultades(visitaId: number, dificultades: string[]): void {
    dificultades.forEach(dificultad => {
      this.db.insertInto('Dificultad', {
        ID_Linea_trabajo_visita: null, // TODO: ¿Cómo se relaciona la dificultad con la línea de trabajo?
        Descripcion_dificultad: dificultad,
        Fecha_dificultad: new Date().toISOString(),
        ID_Visita: visitaId
      });
    });
  }

  /**
   * Registra nuevos acuerdos y compromisos para una visita.
   * @param visitaId El ID de la visita.
   * @param acuerdos Un array de strings con la descripción de los acuerdos.
   */
  registrarAcuerdos(visitaId: number, acuerdos: string[]): void {
    acuerdos.forEach(acuerdo => {
      this.db.insertInto('Acuerdo_Compromiso', {
        ID_Linea_trabajo_visita: null, // TODO: ¿Cómo se relaciona el acuerdo con la línea de trabajo?
        Descripcion_acuerdo_compromiso: acuerdo,
        Fecha_acuerdo_compromiso: new Date().toISOString(),
        ID_Visita: visitaId
      });
    });
  }

  /**
   * Registra la información de un archivo de evidencia en la base de datos.
   * @param visitaId El ID de la visita.
   * @param archivo Un objeto con la información del archivo (nombre, idDrive, url, tipo).
   */
  registrarEvidencia(visitaId: number, archivo: { nombre: string; idDrive: string; url: string; tipo: string; }): void {
    this.db.insertInto('Evidencia', {
      ID_visita: visitaId,
      Tipo_evidencia: archivo.tipo,
      Nombre_archivo_original: archivo.nombre,
      ID_archivo_drive: archivo.idDrive,
      Url: archivo.url,
    });
  }

  /**
   * Obtiene todos los registros de participantes asociados a un ID de visita específico.
   * 
   * @param idVisita El ID de la visita de la cual se quieren obtener los participantes.
   * @returns Un array de objetos, donde cada objeto es un registro de la tabla 'Participante'.
   *          Devuelve un array vacío si no se encuentran participantes.
   */
  public getParticipantesByVisitaId(idVisita: string | number): any[] {
    // Validar que el idVisita no sea nulo o indefinido para evitar errores.
    if (!idVisita) {
      Logger.log("getParticipantesByVisitaId fue llamado con un idVisita nulo o inválido. Retornando array vacío.");
      return [];
    }

    try {
      // Usamos el QueryBuilder para hacer un SELECT en la tabla 'Participante'
      // filtrando por el ID_Visita.
      const participantes = this.db.selectFrom('Participante', [
        'ID_Participante', // Seleccionamos las columnas que nos interesen
        'ID_Docente',
        'ID_Rol_institucional',
        'Nombre_Completo',
        // etc.
      ])
        .where('ID_Visita', '=', idVisita)
        .execute();

      return participantes;

    } catch (e) {
      const error = e as Error;
      Logger.log(`Error al obtener participantes para la visita ID ${idVisita}: ${error.message}`);
      // En caso de un error en la consulta, es más seguro devolver un array vacío
      // para no romper la lógica que depende de este método.
      return [];
    }
  }

  /**
   * Obtiene el ID de la carpeta de evidencias para una visita específica.
   * @param idVisita El ID de la visita.
   * @returns El ID de la carpeta de evidencias o null si no se encuentra.
   */
  public getFolderEvidenciasId(idVisita: number): string | null {
    const result = this.db.selectFrom('Archivo_Jornada', ['ID_folder_evidencias'])
      .where('ID_Visita', '=', idVisita)
      .execute();
    
    return result.length > 0 ? result[0].ID_folder_evidencias : null;
  }  
  
}

/**
 * Proporciona acceso a la instancia única (singleton) de JornadaRepository.
 * Esto asegura que la base de datos no se inicialice en el ámbito global,
 * evitando errores de permisos con disparadores simples como onOpen.
 * @returns {JornadaRepository} La instancia del repositorio de jornadas.
 */
function getJornadaRepository(): JornadaRepository {
  return JornadaRepository.getInstance();
}
