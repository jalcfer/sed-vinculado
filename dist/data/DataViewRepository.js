"use strict";
/**
 * @fileoverview Repositorio para obtener datos formateados como "Vistas" para la UI.
 * Ideal para poblar listas desplegables o tablas en hojas de cálculo.
 */
class DataViewRepository {
    constructor() {
        this.db = SEDCentralLib.getDB();
    }
    static getInstance() {
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
    getListData(table, valueColumn, activeColumn) {
        const results = this.db.selectFrom(table, [valueColumn])
            .where(activeColumn, '=', true)
            .execute();
        if (!results || results.length === 0)
            return [];
        return results.map((row) => row[valueColumn]).filter((value) => value);
    }
    /**
     * Obtiene una lista de valores de una columna (o varias concatenadas) con joins y filtros dinámicos.
     * @param table El nombre de la tabla principal.
     * @param joinTables Arreglo de tablas a unir.
     * @param valueColumn String o array de strings con los nombres de las columnas a concatenar.
     * @param activeColumns Arreglo de objetos para aplicar filtros dinámicos.
     * @returns Un array de strings con los valores concatenados.
     */
    getListDataWithJoin(table, joinTables, valueColumn, activeColumns) {
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
        if (!results || results.length === 0)
            return [];
        return results.map((row) => {
            if (Array.isArray(valueColumn)) {
                return valueColumn.map(col => { var _a; return (_a = row[col]) !== null && _a !== void 0 ? _a : ''; }).join(' ').trim();
            }
            else {
                return row[valueColumn];
            }
        }).filter((value) => value);
    }
    /**
     * Obtiene la vista de datos de Acompañamientos.
     */
    getAcompanamientosView() {
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
    getProfesionalesAcompanamientoView() {
        return this.db.selectFrom('Profesional_Acompanamiento', [
            'ID_Profesional_Acompanamiento', 'Nombre_profesional_acompanamiento', 'Email_profesional_acompanamiento', 'Celular_profesional_acompanamiento'
        ]).execute();
    }
    getAcompanamientosParaUsuarioView() {
        return this.getAcompanamientosView(); // Reutiliza la vista general
    }
}
function getDataViewRepository() {
    return DataViewRepository.getInstance();
}
