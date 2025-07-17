/**
 * @fileoverview Declara las interfaces de las tablas de la base de datos central (SED_DB)
 * que se utilizan en este proyecto. Esto proporciona type-checking y autocompletado.
 * Estas interfaces deben mantenerse sincronizadas con el schema de `sed-central-lib`.
 */

/**
 * Representa la tabla Docente de la base de datos central.
 */
interface Docente {
    ID_Docente: number;
    ID_Area_docencia: number;
    Tipo_identificacion_docente: number;
    Numero_identificacion_docente: string;
    Nombre_docente: string;
    Apellido_docente: string;
    Correo_electronico_docente: string;
    Numero_celular_docente: string;
    Activo_docente: boolean;
}

/**
 * Representa la tabla Archivo_Informe_PA para registrar los informes preliminares.
 */
interface Archivo_Informe_PA {
    ID_Archivo_informe_pa: number;
    ID_PA: number;
    ID_Corte?: number;
    ID_archivo_drive: string;
    Estado: 'creado' | 'presentado';
    Fecha_creacion: string; // ISO string
    Fecha_actualizacion: string; // ISO string
}