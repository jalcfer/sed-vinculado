"use strict";
/**
 * @fileoverview Servicio para ejecutar migraciones de datos y archivos.
 */
class MigrationService_ {
    static getInstance() {
        if (!MigrationService_.instance) {
            MigrationService_.instance = new MigrationService_();
        }
        return MigrationService_.instance;
    }
    constructor() {
        this.driveUtils = SEDCentralLib.getDriveUtils();
    }
    /**
     * Extrae el ID de un archivo de una URL de Google Drive.
     * @param url La URL del archivo de Drive.
     * @returns El ID del archivo o null si no se puede extraer.
     */
    getFileIdFromUrl(url) {
        if (!url || typeof url !== 'string')
            return null;
        // Expresión regular para encontrar el ID de archivo de Google Drive.
        const match = url.match(/[-\w]{25,}/);
        return match ? match[0] : null;
    }
    /**
     * Migra las evidencias de una ubicación a otra, actualizando la BD y los archivos de jornada.
     * @param dbId El ID de la hoja de cálculo de la base de datos a utilizar.
     * @param reportProgress Función para notificar el progreso.
     */
    migrateEvidencias(dbOrigenId, reportProgress) {
        reportProgress('Iniciando migración de evidencias...');
        // Conectar a la BD específica para la migración. Asumimos que getDB puede manejar un ID.
        const dbOrigen = SEDCentralLib.getDB(dbOrigenId);
        const dbDestino = SEDCentralLib.getDB(); // BD Destino (la del complemento)
        reportProgress('Cargando datos de las bases de datos de Origen y Destino...');
        // --- Cargar datos del ORIGEN ---
        const evidenciasOrigen = dbOrigen.selectFrom('Evidencia', ['ID_Registro_evidencia', 'ID_visita', 'Nombre_archivo_original', 'Url']).execute();
        if (!evidenciasOrigen || evidenciasOrigen.length === 0) {
            return 'No se encontraron evidencias en la base de datos de Origen.';
        }
        // --- Cargar datos del DESTINO para buscar las rutas ---
        const acompanamientosDestino = dbDestino.selectFrom('Acompanamiento', ['ID_Acompanamiento', 'ID_Profesional_acompanamiento', 'ID_IEO', 'Nombre_carpeta']).execute();
        const pasDestino = dbDestino.selectFrom('Profesional_Acompanamiento', ['ID_Profesional_Acompanamiento', 'ID_Folder_principal', 'Nombre_profesional_acompanamiento']).execute();
        const ieosDestino = dbDestino.selectFrom('IEO', ['ID_IEO', 'Institucion_educativa']).execute();
        // Crear mapas para búsqueda eficiente en DESTINO
        const acompanamientosDestinoMap = new Map(acompanamientosDestino.map((a) => [a.ID_Acompanamiento, a]));
        const pasDestinoMap = new Map(pasDestino.map((p) => [p.ID_Profesional_Acompanamiento, p]));
        let successCount = 0;
        let errorCount = 0;
        reportProgress(`Se procesarán ${evidenciasOrigen.length} registros de evidencia desde el origen.`);
        evidenciasOrigen.forEach(evidencia => {
            try {
                reportProgress(`Procesando evidencia: ${evidencia.Nombre_archivo_original} (ID: ${evidencia.ID_Registro_evidencia})`);
                // 1. Obtener el archivo y su ruta en el ORIGEN
                const fileId = this.getFileIdFromUrl(evidencia.Url);
                if (!fileId)
                    throw new Error(`URL de evidencia no válida en origen: ${evidencia.Url}`);
                const evidenceFile = DriveApp.getFileById(fileId);
                // Subir en la jerarquía de carpetas para encontrar la carpeta de la jornada
                const parentFolders = evidenceFile.getParents();
                if (!parentFolders.hasNext())
                    throw new Error(`El archivo de evidencia ${evidenceFile.getName()} no tiene carpeta padre.`);
                const carpetaEvidenciasOrigen = parentFolders.next();
                if (carpetaEvidenciasOrigen.getName() !== 'Evidencias') {
                    throw new Error(`El archivo ${evidenceFile.getName()} no está en una carpeta 'Evidencias'.`);
                }
                const jornadaParentFolders = carpetaEvidenciasOrigen.getParents();
                if (!jornadaParentFolders.hasNext())
                    throw new Error(`La carpeta de evidencias para ${evidenceFile.getName()} no tiene padre.`);
                const carpetaJornadaOrigen = jornadaParentFolders.next();
                const nombreCarpetaJornada = carpetaJornadaOrigen.getName();
                // 2. Encontrar el acompañamiento y PA correspondientes en el DESTINO
                // Se asume que ID_visita y ID_Acompanamiento son consistentes entre BDs.
                const visitaOrigen = dbOrigen.selectFrom('Visita', ['ID_Acompanamiento']).where('ID_Visita', '=', evidencia.ID_visita).execute()[0];
                if (!visitaOrigen)
                    throw new Error(`No se encontró la visita ${evidencia.ID_visita} en la BD de Origen.`);
                const acompanamientoDestino = acompanamientosDestinoMap.get(visitaOrigen.ID_Acompanamiento);
                if (!acompanamientoDestino)
                    throw new Error(`No se encontró el acompañamiento ${visitaOrigen.ID_Acompanamiento} en la BD de Destino.`);
                const paDestino = pasDestinoMap.get(acompanamientoDestino.ID_Profesional_acompanamiento);
                if (!paDestino || !paDestino.ID_Folder_principal) {
                    throw new Error(`No se encontró el PA o su carpeta principal en Destino para el acompañamiento ${acompanamientoDestino.ID_Acompanamiento}`);
                }
                // 3. Construir la ruta de DESTINO
                const nombreCarpetaIEO = (acompanamientoDestino.Nombre_carpeta || 'CARPETA_SIN_NOMBRE').toUpperCase().replace(/INSTITUCIÓN EDUCATIVA/g, 'IE');
                const carpetaPaDestino = DriveApp.getFolderById(paDestino.ID_Folder_principal);
                const carpetaIEODestino = this.driveUtils.findOrCreateFolder(carpetaPaDestino.getId(), nombreCarpetaIEO);
                const carpetaAcompanamientoDestino = this.driveUtils.findOrCreateFolder(carpetaIEODestino.getId(), '1. Acompañamiento');
                const carpetaJornadaDestino = this.driveUtils.findOrCreateFolder(carpetaAcompanamientoDestino.getId(), nombreCarpetaJornada);
                const carpetaEvidenciasDestino = this.driveUtils.findOrCreateFolder(carpetaJornadaDestino.getId(), 'Evidencias');
                // 4. Validar si el archivo ya existe en el destino
                const archivosExistentes = carpetaEvidenciasDestino.getFilesByName(evidencia.Nombre_archivo_original);
                if (archivosExistentes.hasNext()) {
                    throw new Error(`El archivo ${evidencia.Nombre_archivo_original} ya existe en la carpeta destino. Se omite.`);
                }
                // 5. Mover el archivo
                reportProgress(`Moviendo archivo a: ${carpetaEvidenciasDestino.getName()}`);
                evidenceFile.moveTo(carpetaEvidenciasDestino);
                // 6. Actualizar la base de datos de DESTINO
                const newUrl = evidenceFile.getUrl();
                const newId = evidenceFile.getId();
                dbDestino.update('Evidencia', { Url: newUrl, ID_archivo_drive: newId }, { ID_Registro_evidencia: evidencia.ID_Registro_evidencia });
                reportProgress('Registro en BD de Destino actualizado.');
                successCount++;
            }
            catch (e) {
                const error = e;
                errorCount++;
                const errorMessage = `Error procesando evidencia ID ${evidencia.ID_Registro_evidencia} (${evidencia.Nombre_archivo_original}): ${error.message}`;
                reportProgress(errorMessage);
                Logger.log(errorMessage + `\n${error.stack}`);
            }
        });
        return `Migración completada. Éxitos: ${successCount}, Errores: ${errorCount}. Revise los logs para más detalles.`;
    }
    /**
     * Ejecuta la migración semimanual de archivos de evidencia.
     * @param migrationData Un array de objetos con los IDs de las carpetas de origen y destino.
     * @returns Un string con el resumen de la operación.
     */
    migrateSemiManual(migrationData) {
        let successCount = 0;
        let filesFound = 0;
        let errorCount = 0;
        const migrationRepo = getMigrationRepository();
        const evidenciaMapByDriveId = migrationRepo.getEvidenciasMapByDriveId();
        Logger.log(`Iniciando migración semimanual para ${migrationData.length} par(es) de carpetas.`);
        // Procesar cada par secuencialmente para evitar problemas de concurrencia
        for (const [index, pair] of migrationData.entries()) {
            const urlsMovidas = [];
            let sourceFolder;
            let destinationFolder;
            try {
                // 1. Obtener carpetas con verificación explícita
                sourceFolder = DriveApp.getFolderById(pair.sourceFolderId);
                destinationFolder = DriveApp.getFolderById(pair.destinationFolderId);
                const movidoFolder = this.driveUtils.findOrCreateFolder(sourceFolder.getId(), 'MOVIDO');
                Logger.log(`Procesando par ${index + 1}: Origen '${sourceFolder.getName()}' -> Destino '${destinationFolder.getName()}'`);
                // 2. Búsqueda más robusta de archivos
                const fileIterator = sourceFolder.getFiles();
                Logger.log(`Buscando archivos en la carpeta '${sourceFolder.getName()}'...`);
                // Procesar archivos en lotes para evitar timeouts
                let batchCount = 0;
                while (fileIterator.hasNext()) {
                    try {
                        const file = fileIterator.next();
                        batchCount++;
                        // Verificar tipos MIME permitidos
                        const mimeType = file.getMimeType();
                        if (!['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType)) {
                            continue;
                        }
                        const originalFileId = file.getId();
                        filesFound++;
                        Logger.log(`Archivo encontrado: ${file.getName()} (ID: ${originalFileId})`);
                        // 3. Comprobar registro en evidencia con verificación adicional
                        // if (evidenciaMapByDriveId.has(originalFileId)) {
                        const idRegistroEvidencia = evidenciaMapByDriveId.get(originalFileId);
                        if (!idRegistroEvidencia) {
                            Logger.log(`Advertencia: ID de registro vacío para archivo ${originalFileId}`);
                            // continue;
                        }
                        //Logger.log(`Archivo '${file.getName()}' coincide con registro de evidencia (ID: ${idRegistroEvidencia}).`);
                        // 4. Operaciones de copia y movimiento con manejo de errores
                        try {
                            // Crear copia de respaldo
                            file.makeCopy(`COPIA - ${file.getName()}`, movidoFolder);
                            // Mover archivo original
                            const movedFile = file.moveTo(destinationFolder);
                            // Registrar nueva URL
                            const newUrl = movedFile.getUrl();
                            const newId = movedFile.getId();
                            urlsMovidas.push(newUrl);
                            // Actualizar registro
                            if (idRegistroEvidencia) {
                                migrationRepo.updateEvidenciaUrlAndId(idRegistroEvidencia, newUrl, newId);
                            }
                            successCount++;
                        }
                        catch (moveError) {
                            errorCount++;
                            Logger.log(`Error moviendo archivo ${file.getName()}: ${moveError.message}`);
                        }
                        //}
                        // Manejar posibles timeouts para lotes grandes
                        if (batchCount % 10 === 0) {
                            Utilities.sleep(500); // Pequeña pausa cada 10 archivos
                        }
                    }
                    catch (fileError) {
                        errorCount++;
                        Logger.log(`Error procesando archivo: ${fileError.message}`);
                        continue;
                    }
                }
                // 5. Actualización de hoja de jornada con mejor manejo
                if (urlsMovidas.length > 0) {
                    try {
                        const jornadaFiles = sourceFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
                        let jornadaFile = null;
                        while (jornadaFiles.hasNext()) {
                            const f = jornadaFiles.next();
                            if (f.getName().startsWith('Seguimiento de acompañamiento')) {
                                jornadaFile = f;
                                break;
                            }
                        }
                        if (jornadaFile) {
                            Logger.log(`Actualizando hoja de jornada: ${jornadaFile.getName()}`);
                            const spreadsheet = SpreadsheetApp.openById(jornadaFile.getId());
                            const sheet = spreadsheet.getSheets()[0];
                            // Encontrar la última fila con contenido real
                            let ultimaFila = sheet.getLastRow();
                            const range = sheet.getRange(`T18:T${ultimaFila}`);
                            const values = range.getValues();
                            // Buscar la última fila no vacía
                            for (let i = values.length - 1; i >= 0; i--) {
                                if (values[i][0]) {
                                    ultimaFila = 18 + i;
                                    break;
                                }
                            }
                            // Asegurar un mínimo de filas
                            ultimaFila = Math.max(ultimaFila, 20);
                            const rangoEvidencias = sheet.getRange(`T18:T${ultimaFila}`);
                            rangoEvidencias.breakApart();
                            rangoEvidencias.merge();
                            rangoEvidencias.setValue(urlsMovidas.join('\n'));
                            rangoEvidencias.setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);
                            rangoEvidencias.setVerticalAlignment('top').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
                            // Guardar cambios explícitamente
                            SpreadsheetApp.flush();
                        }
                    }
                    catch (sheetError) {
                        errorCount++;
                        Logger.log(`Error actualizando hoja de jornada: ${sheetError.message}`);
                    }
                }
            }
            catch (e) {
                errorCount++;
                Logger.log(`Error procesando par de carpetas (Origen: ${pair.sourceFolderId}): ${e.message}`);
            }
        }
        return `Migración finalizada. Archivos encontrados: ${filesFound}, Movidos y actualizados con éxito: ${successCount}, Errores: ${errorCount}.`;
    }
}
function getMigrationService() {
    return MigrationService_.getInstance();
}
/**
 * Controlador para iniciar la migraciÃ³n de evidencias desde el menÃº.
 */
function runEvidenciaMigration_() {
    const dbOrigenId = "1rDdBu0DcVF6Pb9H4x7uu-ZD6ddjOCs9sEeyBfNg_jDM"; // <-- ID de la BD de Origen
    getNotificationService().runProcessWithFeedback('Migración de Evidencias', 'Iniciando proceso de migración. Esto puede tardar varios minutos.', (reportProgress) => {
        return getMigrationService().migrateEvidencias(dbOrigenId, reportProgress);
    });
}
