/**
 * @fileoverview Repositorio para la gestión de datos de tablas de catálogo.
 */

class CatalogoRepository_ {
  private static instance: CatalogoRepository_;
  private db: any;

  private constructor() {
    this.db = SEDCentralLib.getDB();
  }

  public static getInstance(): CatalogoRepository_ {
    if (!CatalogoRepository_.instance) {
      CatalogoRepository_.instance = new CatalogoRepository_();
    }
    return CatalogoRepository_.instance;
  }

  /**
   * Busca el ID de la semana de corte que corresponde a una fecha dada.
   * @param fecha La fecha para la cual buscar la semana de corte.
   * @returns El ID de la semana de corte, o null si no se encuentra.
   */
  findSemanaCorteId(fecha: Date): number | null {
    interface SemanaCorteRow {
      ID_Semana_corte: string;
      Fecha_ini_semana_corte: string;
      Fecha_fin_semana_corte: string;
    }

    const results: SemanaCorteRow[] = this.db.selectFrom('Semana_Corte', [
      'ID_Semana_corte',
      'Fecha_ini_semana_corte',
      'Fecha_fin_semana_corte'
    ]).execute();

    // Función para parsear la fecha y normalizarla a medianoche (00:00:00)
    const parseAndNormalizeDate = (dateStr: string): Date => {
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0); // Normalizar a medianoche
      return date;
    };

    // Normalizar la fecha de entrada a medianoche para comparación
    const normalizedFecha = parseAndNormalizeDate(fecha.toISOString());

    const semanaEncontrada = results.find((row: SemanaCorteRow) => {
      const fechaInicio = parseAndNormalizeDate(row.Fecha_ini_semana_corte);
      const fechaFin = parseAndNormalizeDate(row.Fecha_fin_semana_corte);
      return normalizedFecha >= fechaInicio && normalizedFecha <= fechaFin;
    });

    return semanaEncontrada ? Number(semanaEncontrada.ID_Semana_corte) : null;
  }
  
  public getCortes(): any[] {
    // Se asume que la tabla Corte tiene las columnas ID_Corte y Nombre_corte.
    return this.db.selectFrom('Corte', ['ID_Corte', 'Nombre_corte']).execute();
  }  
}

function getCatalogoRepository(): CatalogoRepository_ {
  return CatalogoRepository_.getInstance();
}