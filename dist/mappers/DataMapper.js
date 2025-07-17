"use strict";
// Módulo para transformaciones de datos generales
class DataMapper {
    /**
     * Convierte un array de objetos a un array 2D (formato para Sheets).
     * Los encabezados se extraen del primer objeto.
     * @param data Array de objetos.
     * @returns Un array 2D con encabezados y filas.
     */
    static to2DArray(data) {
        if (!data || data.length === 0) {
            return [[]]; // Retorna un array vacío si no hay datos
        }
        const headers = Object.keys(data[0]);
        const rows = data.map(obj => headers.map(header => {
            const value = obj[header];
            // Convierte explícitamente a String y maneja nulos/indefinidos
            return value !== null && value !== undefined ? String(value) : '';
        }));
        return [headers, ...rows];
    }
}
const dataMapper = DataMapper;
