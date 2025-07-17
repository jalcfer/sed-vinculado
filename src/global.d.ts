type Archivo_Jornada = any; // Se recomienda definir una interfaz más específica

declare const SEDCentralLib: {
    getDB(dbId?: string): any;
    asignarPAIEO(paId: string, ieoId: string, carpetaPA: string): void;
    isJornadaFileExists(acompId: string, numeroJornada: number): boolean;
    registerJornadaFile(acompId: string, nuevoArchivoId: string, carpetaEvidenciasId: string, numeroJornada: number): Archivo_Jornada;
    getDriveUtils():any;
};
