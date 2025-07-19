"use strict";
/**
 * @fileoverview Servicio para gestionar la lógica de negocio de las Jornadas de Acompañamiento.
 * Se encarga de orquestar la creación de la estructura de archivos en Drive y el registro en la base de datos,
 * siguiendo las especificaciones definidas en el prompt.
 */
class JornadaService {
    static getInstance() {
        if (!JornadaService.instance) {
            JornadaService.instance = new JornadaService();
        }
        return JornadaService.instance;
    }
    constructor() {
        this.driveUtils = SEDCentralLib.getDriveUtils();
    }
    /**
     * Orquesta la creación de la estructura completa para N nuevas jornadas de un acompañamiento.
     *
     * @param acompId El ID del acompañamiento para el cual se crean las jornadas.
     * @param numeroDeJornadas La cantidad de jornadas (y archivos) a crear.
     * @param reportProgress Función de callback para notificar el progreso a la UI.
     * @returns Un array con los objetos de los archivos de jornada registrados en la base de datos.
     */
    crearEstructurasDeJornada(acompId, numeroDeJornadas, reportProgress) {
        Logger.log(`Iniciando creación de ${numeroDeJornadas} estructuras para Acompañamiento: ${acompId}`);
        // 1. Obtener datos necesarios desde la BD a través del Repositorio
        const infoAcompanamiento = getAcompanamientoRepository().getAcompanamientoInfo(acompId);
        if (!infoAcompanamiento || !infoAcompanamiento.idFolderPrincipal) {
            throw new Error(`No se pudo encontrar la información del acompañamiento o el ID de la carpeta principal para el PA.`);
        }
        const { idFolderPrincipal, nombreIEO, nombreCarpeta } = infoAcompanamiento;
        // Obtener el último número de jornada existente para continuar la secuencia
        const ultimaJornada = getAcompanamientoRepository().getLastJornadaNumber(acompId);
        reportProgress(`Última jornada encontrada: ${ultimaJornada}. Las nuevas jornadas continuarán desde este número.`);
        // 2. Crear la estructura de carpetas base
        const carpetaAcompanamiento = this.crearCarpetasBase(idFolderPrincipal, nombreCarpeta);
        reportProgress('Estructura de carpetas base verificada/creada.');
        // 2.1 Asegurar que el archivo de informe del PA exista
        this.ensurePaStructureExists(infoAcompanamiento, reportProgress);
        // 3. Bucle para crear cada jornada
        const archivosCreados = [];
        const numeroJornadaInicial = ultimaJornada + 1;
        const numeroJornadaFinal = ultimaJornada + numeroDeJornadas;
        for (let i = numeroJornadaInicial; i <= numeroJornadaFinal; i++) {
            // La validación de existencia ya no es necesaria aquí si siempre creamos a partir de la última.
            // Sin embargo, la mantenemos como una doble verificación por si acaso.
            if (getJornadaRepository().isJornadaFileExists(acompId, i)) {
                reportProgress(`Jornada ${i}: Ya existe. Omitiendo creación.`);
                continue; // Si ya existe, se salta a la siguiente
            }
            const nuevoArchivo = this.crearJornadaIndividual(acompId, i, carpetaAcompanamiento.getId());
            archivosCreados.push(nuevoArchivo);
            reportProgress(`Jornada ${i} creada y registrada con éxito.`);
        }
        Logger.log(`${archivosCreados.length} de ${numeroDeJornadas} jornadas fueron creadas y registradas con éxito.`);
        return archivosCreados;
    }
    /**
     * Crea y/o encuentra la estructura de carpetas base para un acompañamiento.
     * @param idFolderPrincipal ID de la carpeta raíz del PA.
     * @param nombreCarpetaIEO Nombre de la carpeta para la Institución Educativa.
     * @returns El objeto Folder de la carpeta "{n}. Acompañamiento".
     */
    crearCarpetasBase(idFolderPrincipal, nombreCarpetaIEO) {
        // Usar el nombre de carpeta provisto. Si no existe, se formatea el nombre de la IEO como fallback.
        const nombreCarpeta = nombreCarpetaIEO.toUpperCase().replace(/INSTITUCIÓN EDUCATIVA/g, 'IE');
        const carpetaIEO = this.driveUtils.findOrCreateFolder(idFolderPrincipal, nombreCarpeta);
        // Crear carpeta "1. Acompañamiento"
        // Nota: La lógica para buscar "{n}. Acompañamiento" se simplifica a crear "1. Acompañamiento" si no existe.
        const carpetaAcompanamiento = this.driveUtils.findOrCreateFolder(carpetaIEO.getId(), '1. Acompañamiento');
        return carpetaAcompanamiento;
    }
    /**
     * Crea la estructura de una jornada individual.
     * @param acompId ID del acompañamiento.
     * @param numeroJornada Número de la jornada a crear.
     * @param idCarpetaAcompanamiento ID de la carpeta padre ("1. Acompañamiento").
     * @returns El objeto Archivo_Jornada creado.
     */
    crearJornadaIndividual(acompId, numeroJornada, idCarpetaAcompanamiento) {
        // Crear nombre de carpeta de jornada: "{consecutivo}. DD/Mes(Iniciales)/Año"
        const nombreCarpetaJornada = `${numeroJornada}. DD/Mes(iniciales)/AÑO`;
        const carpetaJornada = this.driveUtils.findOrCreateFolder(idCarpetaAcompanamiento, nombreCarpetaJornada);
        // Crear carpeta "Evidencias" dentro de la carpeta de la jornada
        const carpetaEvidencias = this.driveUtils.findOrCreateFolder(carpetaJornada.getId(), 'Evidencias');
        // 1. Copiar el archivo activo que contiene el script
        const archivoOriginal = SpreadsheetApp.getActiveSpreadsheet();
        const nombreArchivo = `Seguimiento de acompañamiento - Jornada ${numeroJornada}`;
        const nuevoArchivoDrive = this.driveUtils.copyFile(archivoOriginal.getId(), carpetaJornada.getId(), nombreArchivo);
        const nuevoArchivoId = nuevoArchivoDrive.getId();
        // 2. Preparar la hoja para la plantilla usando el servicio específico.
        getJornadaSheetService().prepararHojaDeJornada(nuevoArchivoId);
        // 3. Obtener la plantilla de formato
        const plantilla = getJornadaSheetTemplate();
        // 4. Construir el mapa de datos para las listas desplegables dinámicas
        const listDataMap = {};
        plantilla.fields.forEach(field => {
            if (field.type === 'dropdown' && field.dataSource) {
                const { table, valueColumn, activeColumn } = field.dataSource;
                // Solo consultamos si aún no tenemos los datos para esta tabla
                if (!listDataMap[table]) {
                    listDataMap[table] = getDataViewRepository().getListData(table, valueColumn, activeColumn);
                }
            }
        });
        Logger.log(`Datos de listas desplegables obtenidos: ${JSON.stringify(listDataMap)}`);
        // 5. Aplicar la plantilla de formato a la hoja, pasando los datos dinámicos
        getTemplateService().applySheetTemplate(nuevoArchivoId, appConfig.sheets.jornada.name, plantilla, listDataMap);
        // 6. Registrar el archivo en la base de datos usando el Repositorio
        return getJornadaRepository().registerJornadaFile(acompId, nuevoArchivoId, carpetaEvidencias.getId(), numeroJornada);
    }
    /**
     * Asegura que la estructura de carpetas e informes para un PA exista.
     * Crea la carpeta "Informes" y el archivo "Informe de Acompañamiento" si no existen.
     * @param paInfo Objeto con la información del PA (idPa, idFolderPrincipal, nombrePa, idFolderInformes).
     * @param reportProgress Función para notificar el progreso.
     */
    ensurePaStructureExists(paInfo, reportProgress) {
        // 1. Crear o encontrar la carpeta "Informes" y actualizar la BD si es necesario.
        let informesFolderId = paInfo.idFolderInformes;
        if (!informesFolderId) {
            reportProgress('Creando carpeta "Informes" para el PA...');
            const informesFolder = this.driveUtils.findOrCreateFolder(paInfo.idFolderPrincipal, 'Informes');
            informesFolderId = informesFolder.getId();
            getAcompanamientoRepository().updatePaFolderInformes(paInfo.idPa, informesFolderId);
            reportProgress('Carpeta "Informes" creada y registrada.');
        }
        else {
            reportProgress('Carpeta "Informes" ya existe.');
        }
        // 2. Verificar si el archivo de informe del PA ya existe.
        const paRepo = getPaRepository();
        const existingFile = paRepo.findPaFileByPaId(paInfo.idPa);
        if (existingFile) {
            reportProgress(`Archivo "Informe de Acompañamiento" para ${paInfo.nombrePa} ya existe.`);
            return;
        }
        // 3. Si no existe, crearlo dentro de la carpeta "Informes".
        reportProgress(`Creando archivo "Informe de Acompañamiento" para ${paInfo.nombrePa}...`);
        const fileName = `Informe de Acompañamiento - ${paInfo.nombrePa}`;
        const sourceFileId = SpreadsheetApp.getActiveSpreadsheet().getId();
        const newFile = this.driveUtils.copyFile(sourceFileId, informesFolderId, fileName);
        const newFileId = newFile.getId();
        reportProgress(`Archivo copia creado con ID: ${newFileId}`);
        // Limpiar el archivo copia, dejando solo una hoja llamada "Jornadas".
        this.driveUtils.limpiarSpreadsheet(newFileId, 'Jornadas');
        reportProgress(`Archivo copia limpiado y preparado.`);
        paRepo.createPaFileRecord(paInfo.idPa, newFileId);
        reportProgress(`Archivo de informe para PA registrado en la base de datos.`);
    }
    /**
     * Instala un trigger 'onEdit' para una hoja de cálculo específica.
     * El nombre de la función del trigger debe estar en el ámbito global.
     * @param spreadsheetId El ID de la hoja de cálculo donde se instalará el trigger.
     */
    instalarTriggerOnEdit(spreadsheetId) {
        try {
            ScriptApp.newTrigger('onEditJornadaSheet')
                .forSpreadsheet(spreadsheetId)
                .onEdit()
                .create();
            Logger.log(`Trigger 'onEditJornadaSheet' instalado correctamente en la hoja ${spreadsheetId}.`);
        }
        catch (e) {
            const error = e;
            Logger.log(`Error al instalar el trigger 'onEdit' en la hoja ${spreadsheetId}: ${error.message}`);
            // Dependiendo de la criticidad, se podría lanzar un error.
            // throw new Error(`No se pudo instalar el trigger onEdit: ${error.message}`);
        }
    }
    /**
     * Inicia una nueva jornada en la base de datos.
     * @returns Un objeto con los datos para actualizar la hoja: { fecha, numeroJornada, nombreIEO }.
     */
    iniciarJornada(numParticipantes, reportProgress) {
        const fileId = SpreadsheetApp.getActiveSpreadsheet().getId();
        // 1. Obtener datos clave del repositorio
        const info = getJornadaRepository().getJornadaInfoByFileId(fileId);
        if (!info) {
            throw new Error('Este archivo no está registrado como un archivo de jornada válido.');
        }
        // 2. Validar que la jornada no haya sido iniciada previamente
        if (info.ID_Visita) {
            throw new Error(`La jornada ${info.Numero_jornada} ya fue iniciada previamente.`);
        }
        // 3. Calcular el siguiente número de jornada y validar
        const ultimoNumJornadaEnBD = getAcompanamientoRepository().getLastJornadaNumber(info.ID_Acompanamiento);
        const numJornadaEsperado = ultimoNumJornadaEnBD + 1;
        if (info.Numero_jornada !== numJornadaEsperado) {
            throw new Error(`Error de secuencia. Se esperaba iniciar la jornada ${numJornadaEsperado}, pero este archivo corresponde a la jornada ${info.Numero_jornada}.`);
        }
        reportProgress(`Iniciando jornada ${info.Numero_jornada} para el acompañamiento ${info.ID_Acompanamiento}.`);
        // 4. Calcular ID_Semana_corte
        const fechaActual = new Date();
        const semanaCorteId = getCatalogoRepository().findSemanaCorteId(fechaActual);
        if (!semanaCorteId) {
            throw new Error('No se pudo determinar la semana de corte para la fecha actual. Verifique la configuración de la tabla Semana_Corte.');
        }
        // 5. Crear el registro inicial de la visita
        const nuevaVisitaId = getJornadaRepository().createInitialVisita({
            ID_Acompanamiento: info.ID_Acompanamiento,
            ID_Semana_corte: semanaCorteId,
            Numero_participantes: numParticipantes,
            Numero_jornada: info.Numero_jornada,
            Fecha_visita: fechaActual,
        });
        reportProgress(`Visita inicial creada con ID: ${nuevaVisitaId}`);
        // 6. Actualizar Archivo_Jornada con el nuevo ID_Visita
        getJornadaRepository().linkVisitaToJornadaFile(info.ID_Archivo_jornada, nuevaVisitaId);
        const ieoIdAsString = Math.floor(info.ID_IEO).toString();
        PropertiesService.getScriptProperties().setProperty(appConfig.properties.JORNADA_STATUS_KEY, 'INICIADA');
        PropertiesService.getScriptProperties().setProperty(appConfig.properties.ID_IEO_KEY, ieoIdAsString);
        PropertiesService.getScriptProperties().setProperty(appConfig.properties.NOMBRE_IEO_KEY, info.Institucion_educativa);
        PropertiesService.getScriptProperties().setProperty(appConfig.properties.ID_JORNADA_KEY, String(nuevaVisitaId));
        reportProgress(`Archivo de jornada ${info.ID_Archivo_jornada} actualizado con el ID de visita ${nuevaVisitaId}.`);
        Logger.log(`Jornada ${info.Numero_jornada} iniciada con éxito. Visita ID: ${nuevaVisitaId}`);
        // 7. Devolver datos para la UI
        return {
            fecha: fechaActual,
            numeroJornada: info.Numero_jornada,
            nombreIEO: info.Institucion_educativa, // Asumiendo que getJornadaInfoByFileId devuelve esto
        };
    }
    /**
     * Finaliza una jornada, registrando los datos finales en la base de datos y actualizando la hoja de cálculo.
     * @param jornadaData Un objeto con los datos de la jornada a registrar.
     */
    finalizarJornada(jornadaData) {
        try {
            const activeSheet = SpreadsheetApp.getActiveSpreadsheet();
            const fileId = activeSheet.getId();
            // 1. Obtener la información de la jornada desde la BD usando el ID del archivo
            const jornadaInfo = getJornadaRepository().getJornadaInfoByFileId(fileId);
            if (!jornadaInfo) {
                throw new Error('No se pudo encontrar la información de la jornada para este archivo.');
            }
            const { ID_Acompanamiento, Numero_jornada } = jornadaInfo;
            // 2. Validar que la jornada no esté ya registrada (finalizada)
            // (Lógica a implementar si es necesario, por ejemplo, chequear un campo "estado")
            // 3. Llamar al repositorio para actualizar la base de datos
            getJornadaRepository().updateJornada(ID_Acompanamiento, Numero_jornada, jornadaData);
            // 4. Actualizar y proteger la hoja de cálculo
            const sheet = activeSheet.getSheetByName(appConfig.sheets.jornada.name);
            if (!sheet) {
                throw new Error(`No se encontró la hoja "${appConfig.sheets.jornada.name}" en el archivo activo.`);
            }
            // Se utiliza el JornadaSheetService para actualizar y proteger los campos
            const plantilla = getJornadaSheetTemplate();
            getJornadaSheetService().updateAndProtectSheetFields(sheet, plantilla, jornadaData);
            Logger.log(`Jornada ${Numero_jornada} del acompañamiento ${ID_Acompanamiento} registrada con éxito.`);
            return { success: true, message: 'Jornada registrada con éxito.' };
        }
        catch (e) {
            const error = e;
            Logger.log(`Error al registrar la jornada: ${error.message}\n${error.stack}`);
            return { success: false, message: `Error al registrar la jornada: ${error.message}` };
        }
    }
    /**
     * Sube archivos de evidencia a Google Drive
     * @param visitaId El ID de la visita asociada.
     * @param archivos Un objeto con los archivos a subir
     */
    subirEvidencias(visitaId, archivos) {
        Logger.log(`Subiendo evidencias para la visita ${visitaId}: ${archivos} archivos.`);
        const jornadaRepository = getJornadaRepository();
        const evidenciaFolderId = ""; // Obtener de la base de datos
        if (archivos.asistencia) {
            const archivoAsistencia = this.driveUtils.uploadFile(evidenciaFolderId, archivos.asistencia.name, archivos.asistencia.data);
            const fileInfo = {
                nombre: archivos.asistencia.name,
                idDrive: archivoAsistencia.getId(),
                url: archivoAsistencia.getUrl(),
                tipo: archivos.asistencia.tipoEvidencia,
            };
            jornadaRepository.registrarEvidencia(visitaId, fileInfo);
        }
        if (archivos.transporte) {
            const archivoTransporte = this.driveUtils.uploadFile(evidenciaFolderId, archivos.transporte.name, archivos.transporte.data);
            const fileInfo = {
                nombre: archivos.transporte.name,
                idDrive: archivoTransporte.getId(),
                url: archivoTransporte.getUrl(),
                tipo: archivos.transporte.tipoEvidencia,
            };
            jornadaRepository.registrarEvidencia(visitaId, fileInfo);
        }
    }
    /**
     * Método privado que orquesta las validaciones de negocio.
     */
    validateDataForFinalizacion() {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        const template = getJornadaSheetTemplate(); // Necesitamos la plantilla
        // --- Validación 1: Campos requeridos de la plantilla ---
        const requiredFieldsResult = getBusinessValidationService().validateRequiredFields(sheet, template);
        if (!requiredFieldsResult.isValid) {
            return requiredFieldsResult; // Devolver el primer error encontrado
        }
        // --- Validación 2: Conteo de participantes ---
        // --- REFACTORIZACIÓN DE LA VALIDACIÓN 2 ---
        // a) Obtener el número esperado desde PropertiesService.
        const expectedCountStr = PropertiesService.getScriptProperties().getProperty(appConfig.properties.PARTICIPANTS_COUNT_KEY);
        const expectedCount = expectedCountStr ? parseInt(expectedCountStr, 10) : 0;
        // b) Obtener el número real de participantes contados EN LA HOJA.
        //    Esto asume que tienes una fórmula =CONTARA(...) en la celda K19, por ejemplo.
        const rangeTotalParticipantes = `${appConfig.sheets.jornada.fields.tituloParticipantes.fields.totalParticipantes.startCol}19`;
        const totalCell = sheet.getRange(rangeTotalParticipantes);
        const actualCountFromCell = totalCell.getValue();
        // d) Realizar la validación con el servicio.
        const participantCountResult = getBusinessValidationService().validateParticipantCount(expectedCount, actualCountFromCell);
        if (!participantCountResult.isValid) {
            return participantCountResult;
        }
        // --- Se pueden añadir más llamadas a otros métodos de validación aquí ---
        // Si todas las validaciones pasan
        return { isValid: true, message: 'Validación exitosa.' };
    }
    /**
     * Obtiene las líneas de trabajo seleccionadas en la hoja de jornada.
     * @returns Un array con los nombres de las líneas de trabajo.
     */
    getLineasDeTrabajoFromSheet() {
        // Asumo que la celda I11 contiene los valores separados por coma, o es una validación de datos.
        // Ajusta el rango según tu plantilla.
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        const range = sheet.getRange(appConfig.sheets.jornada.fields.lineaTrabajoJornada.range); // ej. 'I11'
        const value = range.getValue();
        if (typeof value === 'string' && value.trim() !== '') {
            // Devuelve un array de strings, quitando espacios extra.
            return value.split(',').map(item => item.trim());
        }
        return [];
    }
    /**
     * Guarda el objeto DTO de Logros, Dificultades y Acuerdos (LDA) en PropertiesService.
     * @param ldaData El objeto DTO que viene del modal.
     */
    saveLDAToProperties(ldaData) {
        try {
            // Convertimos el objeto a un string JSON para poder guardarlo.
            const ldaJsonString = JSON.stringify(ldaData);
            PropertiesService.getScriptProperties().setProperty(appConfig.properties.LOGROS_DIFICULTADES_ACUERDOS_KEY, ldaJsonString);
        }
        catch (e) {
            Logger.log(`Error al serializar o guardar LDA en PropertiesService: ${e.message}`);
            throw new Error("No se pudo guardar la información de logros y dificultades.");
        }
    }
    /**
     * Obtiene los datos LDA desde PropertiesService y los devuelve como un objeto.
     * @returns El objeto DTO de LDA, o null si no hay nada guardado.
     */
    getLDAFromProperties() {
        const ldaJsonString = PropertiesService.getScriptProperties().getProperty(appConfig.properties.LOGROS_DIFICULTADES_ACUERDOS_KEY);
        if (ldaJsonString) {
            try {
                // Parseamos el string JSON de vuelta a un objeto.
                return JSON.parse(ldaJsonString);
            }
            catch (e) {
                Logger.log(`Error al parsear LDA JSON desde PropertiesService: ${e.message}. Contenido: ${ldaJsonString}`);
                // Si el JSON está corrupto, es más seguro devolver null.
                return null;
            }
        }
        return null;
    }
    // --- Este es el método que usaremos al final del proceso ---
    /**
     * Lee el JSON de LDA desde PropertiesService y lo guarda en la BD.
     * @param idVisita El ID de la visita a la que se asociarán estos registros.
     */
    persistLDAFromPropertiesToDB(idVisita) {
        const ldaData = this.getLDAFromProperties();
        if (!ldaData) {
            Logger.log("No se encontraron datos LDA en Properties para persistir en la BD.");
            return;
        }
        // El repositorio debería tener métodos para insertar estos datos.
        // getJornadaRepository().batchInsertLogros(idVisita, ldaData);
        // getJornadaRepository().batchInsertDificultades(idVisita, ldaData);
        // getJornadaRepository().batchInsertAcuerdos(idVisita, ldaData);
        Logger.log(`LDA para la visita ${idVisita} persistidos correctamente en la BD.`);
        // Opcional: ¿limpiar la propiedad después de guardar?
        // PropertiesService.getScriptProperties().deleteProperty(appConfig.properties.LOGROS_DIFICULTADES_ACUERDOS_KEY);
    }
}
function getJornadaService() {
    return JornadaService.getInstance();
}
