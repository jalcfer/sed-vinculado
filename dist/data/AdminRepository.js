"use strict";
/**
 * @fileoverview Repositorio para gestionar las operaciones de datos administrativos.
 */
class AdminRepository {
    constructor() {
        this.db = SEDCentralLib.getDB();
    }
    /**
     * Obtiene la instancia única (singleton) del repositorio.
     * @returns La instancia de AdminRepository.
     */
    static getInstance() {
        if (!AdminRepository.instance) {
            AdminRepository.instance = new AdminRepository();
        }
        return AdminRepository.instance;
    }
    /**
     * Asigna un Profesional de Acompañamiento (PA) a una Institución Educativa (IEO).
     */
    asignarPAIEO(paId, ieoId, carpetaPA) {
        // Esta función probablemente debería hacer un UPDATE en la tabla Acompañamiento.
        // Por ahora, replicamos la llamada a la librería central, asumiendo que encapsula la lógica.
        // Lo ideal sería implementar la lógica de UPDATE aquí.
        SEDCentralLib.asignarPAIEO(paId, ieoId, carpetaPA);
    }
}
/**
 * Proporciona acceso a la instancia única (singleton) de AdminRepository.
 * @returns {AdminRepository} La instancia del repositorio de administración.
 */
function getAdminRepository() {
    return AdminRepository.getInstance();
}
