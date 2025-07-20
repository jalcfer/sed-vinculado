/**
 * @fileoverview Repositorio para la gestión de datos de Acompañamientos.
 * Se encarga de las interacciones con la BD central relacionadas con Acompañamientos,
 * Profesionales de Acompañamiento (PA) y sus relaciones.
 */

class AcompanamientoRepository_ {
  private static instance: AcompanamientoRepository_;
  private db: any;

  private constructor() {
    this.db = SEDCentralLib.getDB();
  }

  public static getInstance(): AcompanamientoRepository_ {
    if (!AcompanamientoRepository_.instance) {
      AcompanamientoRepository_.instance = new AcompanamientoRepository_();
    }
    return AcompanamientoRepository_.instance;
  }

  /**
   * Obtiene la información detallada de un acompañamiento, incluyendo datos del PA y la IEO.
   * @param acompId El ID del acompañamiento.
   * @returns Un objeto con la información o null si no se encuentra.
   */
  public getAcompanamientoInfo(acompId: string): any | null {
    const resultado = this.db.selectFrom('Acompanamiento', [
      'Institucion_educativa',
      'Nombre_carpeta',
      'ID_Profesional_Acompanamiento',
      'ID_Profesional_acompanamiento',
      'Nombre_profesional_acompanamiento',
      'ID_Folder_principal',
      'ID_Folder_informes'
    ])
    .join('IEO')
    .join('Profesional_Acompanamiento')
    .where('ID_Acompanamiento', '=', acompId)
    .execute();

    if (resultado.length === 0) return null;

    const data = resultado[0] as any;

    return {
      idFolderPrincipal: data['ID_Folder_principal'],
      nombreIEO: data['Institucion_educativa'],
      nombreCarpeta: data['Nombre_carpeta'],
      idPa: data['ID_Profesional_acompanamiento'],
      nombrePa: data['Nombre_profesional_acompanamiento'],
      idFolderInformes: data['ID_Folder_informes']
    };
  }

  /**
   * Obtiene el número de la última jornada registrada para un acompañamiento.
   * @param acompId El ID del acompañamiento.
   * @returns El número de la última jornada, o 0 si no hay ninguna.
   */
  public getLastJornadaNumber(acompId: string): number {
    const result = this.db.selectFrom('Visita', ['Numero_jornada'])
      .where('ID_Acompanamiento', '=', acompId)
      .execute();

    if (!result || result.length === 0) {
      return 0;
    }

    // La lógica de ordenamiento se hace aquí, no en la BD.
    return Math.max(...result.map((r: any) => r.Numero_jornada));
  }

  /**
   * Busca un Profesional de Acompañamiento por su email.
   * @param email El email del PA.
   * @returns El registro del PA si se encuentra, de lo contrario null.
   */
  public findPaByEmail(email: string): any | null {
    const result = this.db.selectFrom('Profesional_Acompanamiento', [
      'ID_Profesional_Acompanamiento',
      'Tipo_identificacion',
      'Numero_identificacion',
      'Nombre_profesional_acompanamiento',
      'Email_profesional_acompanamiento',
      'Celular_profesional_acompanamiento',
      'ID_Folder_principal',
      'ID_Folder_informes'
    ])
      .where('Email_profesional_acompanamiento', '=', email)
      .execute();
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Encuentra todas las IEOs asignadas a un PA específico.
   * @param paId El ID del Profesional de Acompañamiento.
   * @returns Un array de objetos IEO.
   */
  public findIeosByPaId(paId: number): any[] {
    return this.db.selectFrom('Acompanamiento', [
        'ID_IEO',
        'Institucion_educativa'
      ])
      .join('IEO')
      .where('ID_Profesional_acompanamiento', '=', paId)
      .execute();
  }

  /**
   * Actualiza el campo ID_Folder_informes para un Profesional de Acompañamiento.
   * @param paId El ID del PA.
   * @param folderId El ID de la carpeta de Informes.
   */
  public updatePaFolderInformes(paId: number, folderId: string): void {
    const dataToUpdate = { ID_Folder_informes: folderId };
    this.db.update('Profesional_Acompanamiento', 
      dataToUpdate,
      {ID_Profesional_Acompanamiento: paId}
    );
  }

}

function getAcompanamientoRepository(): AcompanamientoRepository_ {
  return AcompanamientoRepository_.getInstance();
}