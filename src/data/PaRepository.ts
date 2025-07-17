/**
 * @fileoverview Repositorio para la gestión de datos de Profesionales de Acompañamiento (PA).
 */

class PaRepository_ {
  private static instance: PaRepository_;
  private db: any;

  private constructor() {
    this.db = SEDCentralLib.getDB();
  }

  public static getInstance(): PaRepository_ {
    if (!PaRepository_.instance) {
      PaRepository_.instance = new PaRepository_();
    }
    return PaRepository_.instance;
  }

  /**
   * Busca si ya existe un archivo de informe para un PA.
   * @param paId El ID del Profesional de Acompañamiento.
   * @returns El registro de Archivo_PA si existe, de lo contrario null.
   */
  public findPaFileByPaId(paId: number): any | null {
    const result = this.db.selectFrom('Archivo_PA', ['ID_archivo_drive'])
      .where('ID_PA', '=', paId)
      .execute();
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Registra un nuevo archivo de informe para un PA en la base de datos.
   * @param paId El ID del PA.
   * @param fileId El ID de Google Drive del archivo creado.
   * @returns El objeto del nuevo registro creado.
   */
  public createPaFileRecord(paId: number, fileId: string): any {
    const now = new Date().toISOString();
    const record = {
      ID_PA: paId,
      ID_archivo_drive: fileId,
      Fecha_creacion: now,
      Fecha_actualizacion: now,
    };
    this.db.insertInto('Archivo_PA', record);
    return record;
  }

  /**
   * Obtiene todos los datos relevantes de las jornadas para un PA.
   * @param paId El ID del Profesional de Acompañamiento.
   * @returns Un array de objetos, cada uno representando una jornada con sus datos.
   */
  public getJornadasDataForReport(paId: number): any[] {
    return this.db.selectFrom('Acompanamiento', [
      'Numero_jornada',
      'Objetivo_visita',
      'Descripcion_logro',
      'Descripcion_dificultad',
      'Descripcion_acuerdo_compromiso'
    ])
    .join('Visita')
    .join('Linea_Trabajo_Visita')
    .join('Logro')
    .join('Dificultad')
    .join('Acuerdo_Compromiso')
    .where('ID_Profesional_acompanamiento', '=', paId)
    .execute();
  }

  /**
   * Registra un nuevo archivo de informe preliminar en la base de datos.
   * @param paId El ID del PA.
   * @param fileId El ID del archivo de Google Docs.
   * @returns El ID del nuevo registro.
   */
  public createInformePaRecord(paId: number, fileId: string): number {
    const now = new Date().toISOString();
    const record = {
      ID_PA: paId,
      ID_archivo_drive: fileId,
      Estado: 'creado',
      Fecha_creacion: now,
      Fecha_actualizacion: now
    };
    return this.db.insertInto('Archivo_Informe_PA', record);
  }

  /**
   * Encuentra un informe preliminar activo (en estado 'creado') para un PA.
   * @param paId El ID del Profesional de Acompañamiento.
   * @returns El registro del informe si se encuentra, de lo contrario null.
   */
  public findActiveInformeByPaId(paId: number): any | null {
    const result = this.db.selectFrom('Archivo_Informe_PA', [
        'ID_Archivo_informe_pa',
        'ID_PA',
        'ID_archivo_drive',
        'Estado',
        'Fecha_creacion'
      ])
      .where('ID_PA', '=', paId)
      .where('Estado', '=', 'creado')
      .execute();
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Actualiza un registro de informe preliminar.
   * @param informeId El ID del informe a actualizar (PK de Archivo_Informe_PA).
   * @param data Objeto con los datos a actualizar (ej. Estado, ID_Corte).
   */
  public updateInforme(informeId: number, data: Partial<Archivo_Informe_PA>): void {
    this.db.update('Archivo_Informe_PA', 
      data,
      { ID_Archivo_informe_pa:informeId }
    ); 
  }
}

function getPaRepository(): PaRepository_ {
  return PaRepository_.getInstance();
}