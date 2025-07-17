"use strict";
/**
 * @fileoverview Repositorio para las operaciones de base de datos
 * relacionadas con el proceso de migración.
 */
class MigrationRepository_ {
    constructor() {
        this.dbDest = SEDCentralLib.getDB();
        this.dbOrigin = SEDCentralLib.getDB('1rDdBu0DcVF6Pb9H4x7uu-ZD6ddjOCs9sEeyBfNg_jDM');
    }
    static getInstance() {
        if (!MigrationRepository_.instance) {
            MigrationRepository_.instance = new MigrationRepository_();
        }
        return MigrationRepository_.instance;
    }
    /**
     * Obtiene un mapa de todas las evidencias, usando el ID de Drive como clave.
     * @returns Un Map donde la clave es el ID_archivo_drive y el valor es el ID_Registro_evidencia.
     */
    getEvidenciasMapByDriveId() {
        const allEvidencias = this.dbOrigin.selectFrom('Evidencia', ['ID_Registro_evidencia', 'ID_archivo_drive']).execute();
        return new Map(allEvidencias.map((e) => [e.ID_archivo_drive, e.ID_Registro_evidencia]));
    }
    /**
     * Actualiza la URL y el ID de Drive de un registro de evidencia específico.
     * @param idRegistroEvidencia El ID del registro a actualizar.
     * @param newUrl La nueva URL del archivo movido.
     * @param newId El nuevo ID de Drive del archivo movido.
     */
    updateEvidenciaUrlAndId(idRegistroEvidencia, newUrl, newId) {
        this.dbOrigin.update('Evidencia', { Url: newUrl, ID_archivo_drive: newId }, { ID_Registro_evidencia: idRegistroEvidencia });
    }
}
/**
 * Retorna la instancia única de MigrationRepository_.
 */
function getMigrationRepository() {
    return MigrationRepository_.getInstance();
}
