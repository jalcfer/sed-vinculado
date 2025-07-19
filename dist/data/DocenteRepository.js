"use strict";
/**
 * @fileoverview Repositorio para la gestión de datos de Docentes.
 * Se encarga de todas las interacciones directas con la base de datos central
 * relacionadas con la entidad Docente y sus tablas relacionadas.
 */
class DocenteRepository_ {
    constructor() {
        this.db = SEDCentralLib.getDB();
    }
    static getInstance() {
        if (!DocenteRepository_.instance) {
            DocenteRepository_.instance = new DocenteRepository_();
        }
        return DocenteRepository_.instance;
    }
    /**
     * Obtiene los catálogos iniciales para el formulario de docentes.
     * @returns Un objeto con los tipos de ID, áreas y grados.
     */
    getInitialFormData() {
        const tiposId = this.db.selectFrom('Tipo_Identificacion', ['ID_Tipo_identificacion', 'Tipo_identificacion'])
            .where('Activo_tipo_identificacion', '=', true)
            .execute();
        const areas = this.db.selectFrom('Area_Docencia', ['ID_Area_docencia', 'Nombre_area_docencia'])
            .where('Activo_area_docencia', '=', true)
            .execute();
        const grados = this.db.selectFrom('Grado_Docencia', [
            'ID_Grado_docencia',
            'Numero_grado_docencia',
            'Tipo_grado_docencia'
        ])
            .execute();
        return { tiposId, areas, grados };
    }
    /**
     * Busca un docente y toda su información relacionada por su identificación.
     * @param tipoId El ID del tipo de identificación.
     * @param numeroId El número de identificación.
     * @returns Un objeto con los datos del docente o null si no se encuentra.
     */
    findDocenteCompletoByIdentificacion(tipoId, numeroId) {
        const docenteResult = this.db.selectFrom('Docente', [
            'ID_Docente',
            'Tipo_identificacion_docente',
            'Numero_identificacion_docente',
            'Nombre_docente',
            'Apellido_docente',
            'Correo_electronico_docente',
            'Numero_celular_docente',
            'ID_Area_docencia'
        ])
            .where('Tipo_identificacion_docente', '=', tipoId)
            .where('Numero_identificacion_docente', '=', numeroId)
            .execute();
        if (!docenteResult || docenteResult.length === 0) {
            return null;
        }
        const docente = docenteResult[0];
        const docenteId = docente.ID_Docente;
        const titulos = this.db.selectFrom('Titulos_Docente', ['Tipo_titulo_docente', 'Titulo_docente'])
            .where('ID_Docente', '=', docenteId)
            .execute();
        const ieos = this.db.selectFrom('IEO_Docente', ['ID_IEO'])
            .where('ID_Docente', '=', docenteId)
            .execute();
        const grados = this.db.selectFrom('Grado_Escolar_Docente', ['ID_Grado_docencia'])
            .where('ID_Docente', '=', docenteId)
            .execute();
        const areasAuxiliares = this.db.selectFrom('Docente_Area_Auxiliar', ['ID_Area_docencia'])
            .where('ID_Docente', '=', docenteId)
            .execute();
        return { docente, titulos, ieos, grados, areasAuxiliares };
    }
    /**
     * Inicia una transacción en la base de datos.
     */
    // public beginTransaction(): void {
    //   this.db.beginTransaction();
    // }
    /**
     * Confirma la transacción actual.
     */
    // public commitTransaction(): void {
    //   this.db.commit();
    // }
    /**
     * Revierte la transacción actual.
     */
    // public rollbackTransaction(): void {
    //   this.db.rollback();
    // }
    /**
     * Crea un nuevo docente en la base de datos.
     * @param data Objeto con los datos del docente.
     * @returns El ID del nuevo docente creado.
     */
    createDocente(data) {
        // Se asume que el método insertInto de la librería devuelve el ID del nuevo registro.
        return this.db.insertInto('Docente', data);
    }
    /**
     * Actualiza un docente existente en la base de datos.
     * @param docenteId El ID del docente a actualizar.
     * @param data Objeto con los datos a actualizar.
     */
    updateDocente(docenteId, data) {
        this.db.update('Docente', data, { ID_Docente: docenteId });
    }
    /**
     * Busca si existe una relación entre un docente y una IEO.
     * @param docenteId El ID del docente.
     * @param ieoId El ID de la IEO.
     * @returns El registro de la relación si existe, de lo contrario null.
     */
    findIeoDocente(docenteId, ieoId) {
        const result = this.db.selectFrom('IEO_Docente', ['ID_IEO_Docente'])
            .where('ID_Docente', '=', docenteId)
            .where('ID_IEO', '=', ieoId)
            .execute();
        return result.length > 0 ? result[0] : null;
    }
    /**
     * Crea una nueva relación entre un docente y una IEO.
     * @param docenteId El ID del docente.
     * @param ieoId El ID de la IEO.
     */
    createIeoDocente(docenteId, ieoId) {
        this.db.insertInto('IEO_Docente', {
            ID_Docente: docenteId,
            ID_IEO: ieoId,
            Activo_ieo_docente: true
        });
    }
    /**
     * Elimina todos los registros de una tabla asociados a un docente.
     * @param tableName El nombre de la tabla (ej. 'Titulos_Docente').
     * @param docenteId El ID del docente.
     */
    deleteByDocenteId(tableName, docenteId) {
        // La librería central no usa un QueryBuilder para DELETE, sino un filtro directo.
        // La llamada correcta es db.delete(tableName, where).
        // El objeto 'where' define las condiciones para la eliminación.
        const where = { 'ID_Docente': docenteId };
        this.db.delete(tableName, where);
    }
    /**
     * Obtiene una vista de los docentes con sus datos básicos.
     * @returns Un array de objetos con los datos básicos de los docentes.
     */
    getDocentesRawDataView() {
        return this.db.selectFrom('Docente', ['ID_Docente', 'Nombre_docente', 'Apellido_docente']).execute();
    }
    /**
     * Elimina registros de una tabla basados en un array de sus IDs primarios.
     * @param tableName El nombre de la tabla.
     * @param primaryKeyName El nombre de la columna de la clave primaria.
     * @param idsToDelete Un array de IDs a eliminar.
     */
    batchDelete(tableName, primaryKeyName, idsToDelete) {
        if (idsToDelete && idsToDelete.length > 0) {
            Logger.log(`Eliminando ${idsToDelete.length} registros de ${String(tableName)}.`);
            idsToDelete.forEach(id => {
                this.db.delete(tableName, { [primaryKeyName]: id });
            });
        }
    }
    /**
     * Inserta múltiples registros en una tabla.
     * @param tableName El nombre de la tabla.
     * @param records Un array de objetos a insertar.
     */
    batchInsert(tableName, records) {
        if (records && records.length > 0) {
            Logger.log(`Insertando ${records.length} nuevos registros en ${String(tableName)}.`);
            // Se podría optimizar para hacer una sola llamada a setValues,
            // pero por ahora, la iteración es segura y funcional.
            records.forEach(record => {
                this.db.insertInto(tableName, record);
            });
        }
    }
    // Métodos para obtener relaciones específicas
    getTitulosByDocenteId(docenteId) {
        return this.db.selectFrom('Titulos_Docente', ['ID_Titulo_docente', 'Tipo_titulo_docente', 'Titulo_docente'])
            .where('ID_Docente', '=', docenteId)
            .execute();
    }
    getAreasAuxiliaresByDocenteId(docenteId) {
        return this.db.selectFrom('Docente_Area_Auxiliar', ['ID_Docente_area_auxiliar', 'ID_Area_docencia'])
            .where('ID_Docente', '=', docenteId)
            .execute();
    }
    // IMPORTANTE: Obtenemos los grados solo para la IEO actual para evitar borrar datos de otras IEOs.
    getGradosByDocenteAndIeoId(docenteId, ieoId) {
        return this.db.selectFrom('Grado_Escolar_Docente', ['ID_Grado_escolar_docencia', 'ID_Grado_docencia'])
            .where('ID_Docente', '=', docenteId)
            .where('ID_IEO', '=', ieoId)
            .execute();
    }
    /**
     * Actualiza un título específico de un docente.
     * @param tituloId El ID del título a actualizar.
     * @param data Objeto con los datos a actualizar.
     */
    updateTitulo(tituloId, data) {
        this.db.update('Titulos_Docente', data, { ID_Titulo_docente: tituloId });
    }
}
function getDocenteRepository() {
    return DocenteRepository_.getInstance();
}
