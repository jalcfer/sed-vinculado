/**
 * @fileoverview Repositorio para obtener datos formateados como "Vistas" para la UI.
 * Ideal para poblar listas desplegables o tablas en hojas de cálculo.
 */

class DataViewRepository {
  private static instance: DataViewRepository;
  private db: any;

  private constructor() {
    this.db = SEDCentralLib.getDB();
  }

  public static getInstance(): DataViewRepository {
    if (!DataViewRepository.instance) {
      DataViewRepository.instance = new DataViewRepository();
    }
    return DataViewRepository.instance;
  }

  /**
   * Obtiene una lista de valores de una columna específica de una tabla para usar en listas desplegables.
   * @param table El nombre de la tabla de la que se obtendrán los datos (ej. 'Linea_Trabajo').
   * @param valueColumn La columna que contiene los valores a devolver (ej. 'nombre').
   * @param activeColumn La columna para filtrar por registros activos.
   * @returns Un array de strings con los valores de la columna, filtrando vacíos.
   */
  getListData(table: string, valueColumn: string, activeColumn: string): string[] {
    const results = this.db.selectFrom(table, [valueColumn])
      .where(activeColumn, '=', true)
      .execute();

    if (!results || results.length === 0) return [];

    return results.map((row: any) => row[valueColumn]).filter((value: any) => value);
  }

  /**
   * Obtiene una lista de valores de una columna (o varias concatenadas) con joins y filtros dinámicos.
   * @param table El nombre de la tabla principal.
   * @param joinTables Arreglo de tablas a unir.
   * @param valueColumn String o array de strings con los nombres de las columnas a concatenar.
   * @param activeColumns Arreglo de objetos para aplicar filtros dinámicos.
   * @returns Un array de strings con los valores concatenados.
   */
  getListDataWithJoin(
    table: string,
    joinTables: string[],
    valueColumn: string | string[],
    activeColumns: Array<{ col: string; val?: any; op?: string }>
  ): string[] {
    const columns = Array.isArray(valueColumn) ? valueColumn : [valueColumn];
    let query = this.db.selectFrom(table, columns);

    if (Array.isArray(activeColumns)) {
      activeColumns.forEach((filter) => {
        if (filter && filter.col) {
          const op = filter.op || '=';
          const val = filter.hasOwnProperty('val') ? filter.val : true;
          query = query.where(filter.col, op, val);
        }
      });
    }

    if (Array.isArray(joinTables)) {
      joinTables.forEach((joinTable) => {
        query = query.join(joinTable);
      });
    }

    const results = query.execute();
    if (!results || results.length === 0) return [];

    return results.map((row: any) => {
      if (Array.isArray(valueColumn)) {
        return valueColumn.map(col => row[col] ?? '').join(' ').trim();
      } else {
        return row[valueColumn];
      }
    }).filter((value: any) => value);
  }

  /**
   * Obtiene la vista de datos de Acompañamientos.
   */
  getAcompanamientosView(): any[] {
    return this.db.selectFrom('Acompanamiento', [
      'ID_Acompanamiento', 'Institucion_educativa', 'Nombre_profesional_acompanamiento'
    ])
      .join('IEO')
      .join('Profesional_Acompanamiento')
      .execute();
  }

  /**
   * Obtiene la vista de datos de Profesionales de Acompañamiento (PA).
   */
  getProfesionalesAcompanamientoView(): any[] {
    return this.db.selectFrom('Profesional_Acompanamiento', [
      'ID_Profesional_Acompanamiento', 'Nombre_profesional_acompanamiento', 'Email_profesional_acompanamiento', 'Celular_profesional_acompanamiento'
    ]).execute();
  }

  getAcompanamientosParaUsuarioView(): any[] {
    return this.getAcompanamientosView(); // Reutiliza la vista general
  }
}

function getDataViewRepository(): DataViewRepository {
  return DataViewRepository.getInstance();
}