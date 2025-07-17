/**
 * @fileoverview Servicio para la lógica de negocio específica del Profesional de Acompañamiento (PA).
 */

class PaService_ {
  private static instance: PaService_;
  private paRepository: PaRepository_;
  private acompanamientoRepository: AcompanamientoRepository_;
  private driveUtils: any;

  public static getInstance(): PaService_ {
    if (!PaService_.instance) {
      PaService_.instance = new PaService_();
    }
    return PaService_.instance;
  }

  private constructor() {
    this.paRepository = getPaRepository();
    this.acompanamientoRepository = getAcompanamientoRepository();
    this.driveUtils = SEDCentralLib.getDriveUtils();
  }

  /**
   * Obtiene los datos necesarios para construir el modal de "Reportar Informe".
   * @param paEmail El email del PA logueado.
   * @returns Un objeto con la lista de preguntas y las IEOs asignadas al PA.
   */
  public getInformeData(paEmail: string): { questions: any[], ieos: any[] } {
    const pa = this.acompanamientoRepository.findPaByEmail(paEmail);
    if (!pa) {
      throw new Error("No se encontró un Profesional de Acompañamiento con el email proporcionado.");
    }

    const ieos = this.acompanamientoRepository.findIeosByPaId(pa.ID_Profesional_Acompanamiento);

    // Las preguntas pueden venir de la BD en el futuro, por ahora están aquí.
    const questions = [
      { id: 1, text: "En este periodo la revisión del PMI se encuentra" },
      // ... agregar más preguntas aquí
    ];

    return { questions, ieos };
  }

  /**
   * Sube el archivo del informe bimensual a la carpeta raíz del PA.
   * @param paEmail El email del PA.
   * @param fileData Los datos del archivo a subir.
   * @returns Un objeto con el resultado.
   */
  public subirInformeBimensual(paEmail: string, fileData: { name: string; mimeType: string; data: string }): { success: boolean, fileUrl?: string, message?: string } {
    // 1. Obtener la información del PA para encontrar su carpeta raíz
    const pa = this.acompanamientoRepository.findPaByEmail(paEmail);
    if (!pa || !pa.ID_Folder_principal) {
      throw new Error("No se pudo encontrar la carpeta principal para el PA. Verifique la configuración.");
    }

    const rootFolderId = pa.ID_Folder_principal;
    Logger.log(`Carpeta raíz del PA encontrada: ${rootFolderId}`);

    try {
      // 2. Decodificar los datos base64 y crear el blob
      const decodedData = Utilities.base64Decode(fileData.data);
      const blob = Utilities.newBlob(decodedData, fileData.mimeType, fileData.name);

      // 3. Crear el archivo en la carpeta raíz del PA
      const folder = DriveApp.getFolderById(rootFolderId);
      const newFile = folder.createFile(blob);
      
      Logger.log(`Archivo de informe bimensual '${fileData.name}' subido a la carpeta ${rootFolderId}. URL: ${newFile.getUrl()}`);
      return { success: true, fileUrl: newFile.getUrl() };

    } catch (e) {
      const error = e as Error;
      throw new Error(`Error al subir el archivo a Google Drive: ${error.message}`);
    }
  }

  /**
   * Genera un documento de Google Docs con el informe preliminar de un PA.
   * @param paEmail El email del PA.
   * @param reportProgress Función para notificar el progreso a la UI.
   * @returns El ID del archivo de informe creado.
   */
  public generarInformePreliminar(paEmail: string, reportProgress: (message: string) => void): string {
    reportProgress('Obteniendo información del PA...');
    const pa = this.acompanamientoRepository.findPaByEmail(paEmail);
    if (!pa) throw new Error("No se encontró al PA en la base de datos.");

    const idFolderInformes = pa.ID_Folder_informes;
    if (!idFolderInformes) {
      throw new Error("No se ha configurado la carpeta de informes para este PA. Por favor, ejecute primero la creación de jornadas para una de sus IEOs asignadas.");
    }

    reportProgress('Recopilando datos de todas las jornadas...');
    const rawData = this.paRepository.getJornadasDataForReport(pa.ID_Profesional_Acompanamiento);

    // Agrupar datos por jornada
    const jornadasData = rawData.reduce((acc, row) => {
      const numJornada = row.Numero_jornada;
      if (!acc[numJornada]) {
        acc[numJornada] = {
          objetivos: new Set(),
          logros: new Set(),
          dificultades: new Set(),
          acuerdos: new Set()
        };
      }
      acc[numJornada].objetivos.add(row.Objetivo_visita);
      acc[numJornada].logros.add(row.Descripcion_logro);
      acc[numJornada].dificultades.add(row.Descripcion_dificultad);
      acc[numJornada].acuerdos.add(row.Descripcion_acuerdo_compromiso);
      return acc;
    }, {});

    if (Object.keys(jornadasData).length === 0) {
      throw new Error("No se encontraron datos de logros, dificultades o acuerdos para las jornadas de este PA.");
    }

    reportProgress('Generando documento de informe...');
    const docName = `Informe Preliminar - ${pa.Nombre_profesional_acompanamiento} - ${new Date().toLocaleDateString()}`;
    const doc = DocumentApp.create(docName);
    const body = doc.getBody();

    body.appendParagraph(docName).setHeading(DocumentApp.ParagraphHeading.TITLE);

    Object.keys(jornadasData).sort((a,b) => parseInt(a) - parseInt(b)).forEach(numJornada => {
      const data = jornadasData[numJornada];
      body.appendParagraph(`Jornada ${numJornada}`).setHeading(DocumentApp.ParagraphHeading.HEADING1);
      
      body.appendParagraph('Objetivos').setHeading(DocumentApp.ParagraphHeading.HEADING2);
      Array.from(data.objetivos).forEach(item => body.appendListItem(item as string).setGlyphType(DocumentApp.GlyphType.BULLET));
      body.appendParagraph('Logros').setHeading(DocumentApp.ParagraphHeading.HEADING2);
      Array.from(data.logros).forEach(item => body.appendListItem(item as string).setGlyphType(DocumentApp.GlyphType.BULLET));
      body.appendParagraph('Dificultades').setHeading(DocumentApp.ParagraphHeading.HEADING2);
      Array.from(data.dificultades).forEach(item => body.appendListItem(item as string).setGlyphType(DocumentApp.GlyphType.BULLET));
    });

    doc.saveAndClose();
    const fileId = this.driveUtils.moveFile(doc.getId(), idFolderInformes);

    reportProgress('Registrando informe en la base de datos...');
    this.paRepository.createInformePaRecord(pa.ID_Profesional_Acompanamiento, fileId);

    return fileId;
  }
}

function getPaService(): PaService_ {
  return PaService_.getInstance();
}
