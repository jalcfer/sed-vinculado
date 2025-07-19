/**
 * @fileoverview Define los Data Transfer Objects (DTOs) utilizados para la comunicación
 * entre la UI del cliente y los servicios del servidor.
 */

/**
 * DTO para un título académico de un docente.
 */
interface TituloDTO {
  id?: number;
  tipo_titulo_docente: string;
  titulo_docente: string;
}

/**
 * DTO que representa la información completa de un docente, tal como se maneja en el formulario.
 */
interface DocenteCompletoDTO {
  docenteId?: number;
  tipoIdentificacion: number;
  numeroIdentificacion: string;
  nombreDocente: string;
  apellidoDocente: string;
  correoDocente?: string;
  celularDocente?: string;
  titulos: TituloDTO[];
  areaPrincipal: number;
  areasAuxiliares: number[];
  grados: number[];
  existeEnOtraIEO?: boolean;
}

/**
 * DTO para la información de un archivo de evidencia.
 */
interface EvidenciaDTO {
  nombre: string;
  blob: Blob;
  tipo: string;
}



/**
 * DTO para agrupar los logros, dificultades y acuerdos por cada línea de trabajo.
 * La clave principal es el nombre de la línea de trabajo.
 */
interface LogrosDificultadesAcuerdosDTO {
  [lineaDeTrabajo: string]: {
    logros: string[];
    dificultades: string[];
    acuerdos: string[];
  };
}