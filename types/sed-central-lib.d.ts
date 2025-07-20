declare const SEDCentralLib: {
    getDB(dbId?: string): any;
    asignarPAIEO(paId: string, ieoId: string, carpetaPA: string): void;
    isJornadaFileExists(acompId: string, numeroJornada: number): boolean;
    registerJornadaFile(acompId: string, nuevoArchivoId: string, carpetaEvidenciasId: string, numeroJornada: number): Archivo_Jornada;
    getDriveUtils():any;
};



declare const schema: {
    /**
     * DUPLICACIÓN MANUAL del objeto tableMap.
     * Las claves aquí DEBEN ser idénticas a las del schema.ts de la librería.
     * Esto permite que `keyof typeof schema.tableMap` funcione correctamente.
     */
    tableMap: {
        IEO: string;
        Docente: string;
        IEO_Sede: string;
        Titulos_Docente: string;
        Docente_Area_Auxiliar: string;
        Rol_Institucional: string;
        Rol_Acceso: string;
        Usuario: string;
        IEO_Docente: string;
        Grado_Escolar_Docente: string;
        Grado_Docencia: string;
        Area_Docencia: string;
        Tipo_Identificacion: string;
        Acompanamiento: string;
        Profesional_Acompanamiento: string;
        Linea_Trabajo: string;
        Visita: string;
        Participante: string;
        Linea_Trabajo_Visita: string;
        Logro: string;
        Dificultad: string;
        Acuerdo_Compromiso: string;
        Area_Linea_Trabajo: string;
        Ciclo: string;
        Corte: string;
        Semana_Corte: string;
        Formacion: string;
        Asistencia: string;
        Evidencia: string;
        Archivo_Jornada: string;
        Archivo_Habilitado: string;
        Archivo_PA: string;
        Archivo_Informe_PA: string;
    };
};

/**
 * Representa la tabla IEO (Instituciones Educativas Oficiales).
 */
interface IEO {
    /** Identificador único de la IEO */
    ID_IEO: number;
    /** Código DANE de la institución */
    Codigo_dane: string;
    /** Número de comuna */
    Comuna: number;
    /** Zona geográfica */
    Zona: string;
    /** Nombre de la institución */
    Institucion_educativa: string;
    /** Grupo */
    Grupo: string;
    /** Carácter de educación media */
    Caracter_educacion_media: string;
    /** Especialidades */
    Especialidades: string;
    /** Convenio SENA */
    Convenio_sena: string;
    /** Convenio CASD */
    Convenio_casd: string;
    /** Metodologías flexibles */
    Metodologias_flexibles: string;
    /** Educación de adultos */
    Educacion_adultos: string;
    /** Etnoeducativa */
    Etnoeducativa: string;
    /** PTA */
    Pta: string;
    /** Estado de la IEO */
    Activo_ieo: boolean;
}

/**
 * Representa la tabla Docente.
 */
interface Docente {
    /** Identificador único del docente */
    ID_Docente: number;
    /** Área del docente (FK a Area_Docencia) */
    ID_Area_docencia: number;
    /** Tipo de identificación (FK a Tipo_Identificacion) */
    Tipo_identificacion_docente: number;
    /** Número de identificación */
    Numero_identificacion_docente: string;
    /** Nombre del docente */
    Nombre_docente: string;
    /** Apellido del docente */
    Apellido_docente: string;
    /** Correo electrónico */
    Correo_electronico_docente: string;
    /** Número de celular */
    Numero_celular_docente: string;
    /** Indica si el docente está activo */
    Activo_docente: boolean;
}

/**
 * Representa la tabla IEO_Sede, que relaciona IEO con sus sedes.
 */
interface IEO_Sede {
    ID_Sede: number;
    ID_IEO: number;
    Sede_educativa: string;
    Com: string;
    Zona: string;
    Caracter_educacion_media: string;
    Especialidades: string;
    Convenio_sena: string;
    Convenio_casd: string;
    Metodologias_flexibles: string;
    Educacion_adultos: string;
    Etnoeducativa: string;
    Pta: string;
}

/**
 * Representa la tabla Titulos_Docente, que almacena los títulos de los docentes.
 */
interface Titulos_Docente {
    ID_Titulo_docente: number;
    ID_Docente: number;
    Tipo_titulo_docente: string;
    Titulo_docente: string;
}

/**
 * Representa la tabla IEO_Docente, que relaciona docentes con IEO.
 */
interface IEO_Docente {
    ID_IEO_Docente: number;
    ID_Docente: number;
    ID_IEO: number;
    Activo_ieo_docente: boolean;
}

/**
 * Representa la tabla Grado_Escolar_Docente, que relaciona docentes con grados escolares.
 */
interface Grado_Escolar_Docente {
    ID_Grado_escolar_docencia: number;
    ID_Docente: number;
    ID_IEO: number;
    ID_Grado_docencia: number;
}

/**
 * Representa la tabla Grado_Docencia, que define los grados de docencia.
 */
interface Grado_Docencia {
    ID_Grado_docencia: number;
    Numero_grado_docencia: number;
    Nombre_grado_docencia: string;
    Tipo_grado_docencia: string;
    Activo_grado_docencia: boolean;			
}

/**
 * Representa la tabla Docente_Area_Auxiliar, que relaciona docentes con sus áreas de docencia auxiliares.
 */
interface Docente_Area_Auxiliar {
    ID_Docente_area_auxiliar: number;
    ID_Docente: number;
    ID_Area_docencia: number;
}

/**
 * Representa la tabla Area_Docencia, que define las áreas de docencia.
 */
interface Area_Docencia {
    ID_Area_docencia: number;
    Nombre_area_docencia: string;
    Activo_area_docencia: boolean;
}

/**
 * Representa la tabla Rol_Institucional, que define los roles institucionales.
 */
interface Rol_Institucional {
    ID_Rol_institucional: number;
    Nombre_rol_institucional: string;
    Activo_rol_institucional: boolean;
}

/**
 * Representa la tabla Tipo_Identificacion, que define los tipos de identificación.
 */
interface Tipo_Identificacion {
    ID_Tipo_identificacion: number;
    Tipo_identificacion: string;
    Activo_tipo_identificacion: boolean;
}

/**
 * Representa la tabla Acompanamiento, que almacena los acompañamientos realizados.
 */
interface Acompanamiento {
    ID_Acompanamiento: number;
    ID_IEO: number;
    ID_Profesional_acompanamiento: number;
    Tiene_archivo: boolean;
    Nombre_carpeta: string;
}

/**
 * Representa la tabla Profesional_Acompanamiento, que almacena los profesionales de acompañamiento.
 */
interface Profesional_Acompanamiento {
    ID_Profesional_Acompanamiento: number;
    Tipo_identificacion: number;
    Numero_identificacion: string;
    Nombre_profesional_acompanamiento: string;
    Email_profesional_acompanamiento: string;
    Celular_profesional_acompanamiento: string;
    ID_Folder_principal: string;
    /** (Opcional) ID de la carpeta de informes del PA. */
    ID_Folder_informes?: string;
}

/**
 * Representa la tabla Linea_Trabajo, que define las líneas de trabajo.
 */
interface Linea_Trabajo {
    ID_Linea_trabajo: number;
    Nombre_linea_trabajo: string;
}

type EstadoVisita = 'Cancelada' | 'En Curso' | 'Finalizada';

/**
 * Representa la tabla Visita, que almacena las visitas realizadas.
 */
interface Visita {
    ID_Visita: number;
    ID_Acompanamiento: number;
    ID_Semana_corte: number;
    Tipo_Visita: string;
    Fecha_visita: string;
    Numero_jornada: number;
    Estado: EstadoVisita;
    Objetivo_visita: string;
    DuracionHoras: number;
    Numero_participantes?: number;
    Fecha_creacion: string; // ISO string
    Fecha_actualizacion: string; // ISO string
}

/**
 * Representa la tabla Participante, que almacena los participantes de una visita.
 */
interface Participante {
    ID_Participante: number;
    ID_Visita: number;
    ID_Rol_institucional: number;
    ID_Docente: number;
    Nombre_Completo: string;
    Fecha: string;
    Horas: number;
}

/**
 * Representa la tabla Linea_Trabajo_Visita, que relaciona líneas de trabajo con visitas.
 */
interface Linea_Trabajo_Visita {
    ID_Linea_trabajo_visita: number;
    ID_Linea_trabajo: number;
    ID_Area_linea_trabajo: number;
    ID_Visita: number;
}

/**
 * Representa la tabla Logro, que almacena los logros de una visita.
 */
interface Logro {
    ID_Logro: number;
    ID_Linea_trabajo_visita: number;
    Descripcion_logro: string;
    Fecha_logro: string;
}

/**
 * Representa la tabla Dificultad, que almacena las dificultades encontradas en una visita.
 */
interface Dificultad {
    ID_Dificultad: number;
    ID_Linea_trabajo_visita: number;
    Descripcion_dificultad: string;
    Fecha_dificultad: string;
}

/**
 * Representa la tabla Acuerdo_Compromiso, que almacena los acuerdos de compromiso de una visita.
 */
interface Acuerdo_Compromiso {
    ID_Acuerdo_compromiso: number;
    ID_Linea_trabajo_visita: number;
    Descripcion_acuerdo_compromiso: string;
    Fecha_acuerdo_compromiso: string;
}

/**
 * Representa la Area_Linea_Trabajo, que relaciona áreas con líneas de trabajo.
 */
interface Area_Linea_Trabajo {
    ID_Area_linea_trabajo: number;
    Nombre_area_linea_trabajo: string;
    Activo_area_linea_trabajo: boolean;
}

/**
 * Representa los roles de acceso del sistema (autenticación y permisos de usuario).
 */
interface Rol_Acceso {
    /** Identificador único del rol de acceso */
    ID_Rol_acceso: number;
    /** Nombre del rol (admin, soporte, pa, etc.) */
    Nombre_rol_acceso: string;
    /** Descripción del rol */
    Descripcion_rol_acceso?: string;
}

/**
 * Representa un usuario del sistema autenticado.
 */
interface Usuario {
    /** Identificador único del usuario */
    ID_Usuario: number;
    /** Correo electrónico del usuario (clave de autenticación) */
    Email_usuario: string;
    /** Nombre del usuario */
    Nombre_usuario: string;
    /** Rol de acceso (FK a Rol_Acceso) */
    ID_Rol_acceso: number;
    /** Indica si el usuario está activo */
    Activo_usuario: boolean;
    /** Permisos adicionales (opcional) */
    Permisos?: string;
}

/**
 * Representa la tabla Evidencia para el registro de archivos copia de jornadas.
 */
interface Evidencia {
  ID_Registro_evidencia: number,
  ID_visita: number,
  Tipo_evidencia: string,
  Nombre_archivo_original: string,
  ID_archivo_drive: string,
  Fecha_carga: string,
  MIMEtype: string,
  Url: string,
  Estado_evidencia: 'activa' | 'eliminada',
  Fecha_creacion:string,
  Fecha_actuallizacion: string
}

/**
 * Representa la tabla Archivo_Jornada para el registro de archivos copia de jornadas.
 */
interface Archivo_Jornada {
    /** Identificador único del registro */
    ID_Archivo_jornada: string;
    /** Relación con el acompañamiento */
    ID_Acompanamiento: string;
    /** Relación con el acompañamiento */
    ID_Visita?: string;
    /** ID de Google Drive del archivo copia */
    ID_archivo_drive: string;
    /** Profesional de acompañamiento responsable */
    ID_folder_evidencias: string;
    /** Número de la jornada */
    Numero_jornada: number;
    /** Fecha de creación del archivo */
    Fecha_creacion: string; // ISO string
    /** Fecha de creación del archivo */
    Fecha_actualizacion: string; // ISO string
    /** Estado del archivo ('activo' / 'finalizado') */
    Estado_archivo_jornada: string;
}

/**
 * Representa la tabla Archivo_Habilitado para la gestión de habilitación/inhabilitación de archivos.
 * Esta tabla debe existir en la BD central (hoja Archivo_Habilitado).
 *
 * Estructura sugerida en la hoja:
 * | ID_Archivo (string) | ID_Acompanamiento (string, opcional) | ID_Propietario (string) | Estado (string: 'habilitado'/'inhabilitado') | Fecha_Habilitacion (datetime) | Fecha_Inhabilitacion (datetime) |
 */
interface Archivo_Habilitado {
    /** ID de Google Drive del archivo */
    ID_Archivo: string;
    /** (Opcional) Relación con acompañamiento */
    ID_Acompanamiento?: string;
    /** Usuario que habilitó el archivo */
    ID_Propietario: string;
    /** Estado del archivo: 'habilitado' o 'inhabilitado' */
    Estado: 'habilitado' | 'inhabilitado';
    /** Fecha de habilitación (ISO string) */
    Fecha_Habilitacion: string;
    /** Fecha de inhabilitación (ISO string, opcional) */
    Fecha_Inhabilitacion?: string;
}

/**
 * Representa la tabla Archivo_PA para el registro de archivos de informe de un PA.
 */
interface Archivo_PA {
    ID_Archivo_pa: number;
    ID_PA: number;
    ID_archivo_drive: string;
    Fecha_creacion: string; // ISO string
    Fecha_actualizacion: string; // ISO string
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