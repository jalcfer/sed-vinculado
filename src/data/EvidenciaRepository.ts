/**
 * @fileoverview Repositorio para la gestión de datos de la entidad Evidencia.
 */

class EvidenciaRepository_ {
  private static instance: EvidenciaRepository_;
  private db: any;

  private constructor() {
    this.db = SEDCentralLib.getDB();
  }

  public static getInstance(): EvidenciaRepository_ {
    if (!EvidenciaRepository_.instance) {
      EvidenciaRepository_.instance = new EvidenciaRepository_();
    }
    return EvidenciaRepository_.instance;
  }

  /**
   * Busca todas las evidencias asociadas a un ID de visita.
   * @param idVisita El ID de la visita.
   * @returns Un array de objetos Evidencia.
   */
  public findByVisitaId(idVisita: number): Evidencia[] {
    return this.db.selectFrom('Evidencia', [
      'ID_Registro_evidencia',
      'ID_visita',
      'Tipo_evidencia',
      'Nombre_archivo_original',
      'ID_archivo_drive',
      'Url',
      'MIMEtype',
      'Fecha_carga',
      'Estado_evidencia',
      'Fecha_creacion',
      'Fecha_actuallizacion'
    ])
      .where('ID_visita', '=', idVisita)
      .execute() as Evidencia[];
  }

  /**
   * Busca una evidencia específica por tipo dentro de una visita.
   * @param idVisita El ID de la visita.
   * @param tipo El tipo de evidencia.
   * @returns Un objeto Evidencia o null si no se encuentra.
   */
  public findEvidenciaByTipo(idVisita: number, tipo: string): Evidencia | null {
    const result = this.db.selectFrom('Evidencia', ['*'])
      .where('ID_visita', '=', idVisita)
      .where('Tipo_evidencia', '=', tipo)
      .execute();
    return result.length > 0 ? result[0] as Evidencia : null;
  }

  /**
   * Crea un nuevo registro de evidencia en la base de datos.
   * @param data El objeto con los datos de la evidencia a crear.
   * @returns El ID del nuevo registro creado.
   */
  public create(data: Omit<Evidencia, 'ID_Registro_evidencia'>): number {
    return this.db.insertInto('Evidencia', data);
  }

  /**
   * Actualiza un registro de evidencia.
   * @param idRegistro El ID de la evidencia a actualizar.
   * @param data Los datos a modificar.
   * @returns El número de filas actualizadas.
   */
  public update(idRegistro: number, data: Partial<Evidencia>): number {
    return this.db.update('Evidencia', data, { ID_Registro_evidencia: idRegistro });
  }
}

/**
 * Retorna la instancia única de EvidenciaRepository_.
 */
function getEvidenciaRepository(): EvidenciaRepository_ {
  return EvidenciaRepository_.getInstance();
}