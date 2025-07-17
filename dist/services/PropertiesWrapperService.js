"use strict";
/**
 * @fileoverview Servicio de envoltura (wrapper) para PropertiesService de Google Apps Script.
 * Centraliza la obtención y guardado de propiedades para facilitar su gestión y pruebas.
 */
class PropertiesWrapperService_ {
    constructor() {
        // Usamos DocumentProperties para que las propiedades sean específicas de este archivo.
        this.properties = PropertiesService.getDocumentProperties();
    }
    static getInstance() {
        if (!PropertiesWrapperService_.instance) {
            PropertiesWrapperService_.instance = new PropertiesWrapperService_();
        }
        return PropertiesWrapperService_.instance;
    }
    /**
     * Guarda un valor en las propiedades del documento.
     * @param key La clave bajo la cual se guardará el valor.
     * @param value El valor a guardar.
     */
    setProperty(key, value) {
        this.properties.setProperty(key, value);
    }
    /**
     * Obtiene un valor de las propiedades del documento.
     * @param key La clave del valor a obtener.
     * @returns El valor como string, o null si la clave no existe.
     */
    getProperty(key) {
        return this.properties.getProperty(key);
    }
    /**
     * Elimina una propiedad del documento.
     * @param key La clave de la propiedad a eliminar.
     */
    deleteProperty(key) {
        this.properties.deleteProperty(key);
    }
    /**
     * Limpia todas las propiedades del documento.
     * ¡Usar con precaución!
     */
    deleteAllProperties() {
        this.properties.deleteAllProperties();
    }
}
function getPropertiesService() {
    return PropertiesWrapperService_.getInstance();
}
