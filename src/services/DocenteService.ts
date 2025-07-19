/**
 * @fileoverview Servicio para gestionar la lógica de negocio de los Docentes.
 * Orquesta las operaciones llamando a la capa de repositorio.
 */

class DocenteService_ {
  private static instance: DocenteService_;
  private repository: DocenteRepository_;

  public static getInstance(): DocenteService_ {
    if (!DocenteService_.instance) {
      DocenteService_.instance = new DocenteService_();
    }
    return DocenteService_.instance;
  }

  private constructor() {
    this.repository = getDocenteRepository();
  }

  /**
   * Obtiene los datos iniciales necesarios para el formulario de agregar/editar docente.
   * @returns Un objeto con los tipos de identificación, áreas de docencia y grados.
   */
  public getInitialDataForDocenteForm(): { tiposId: any[], areas: any[], grados: any[] } {
    return this.repository.getInitialFormData();
  }

  /**
   * Busca un docente por su identificación y construye un DTO completo con toda su información.
   * @param tipoId El ID del tipo de identificación.
   * @param numeroId El número de identificación.
   * @returns Un DTO con la información completa del docente o null.
   */
  public getDocenteCompletoByIdentificacion(tipoId: string, numeroId: string): DocenteCompletoDTO | null {
    const rawData = this.repository.findDocenteCompletoByIdentificacion(tipoId, numeroId);

    if (!rawData) {
      return null;
    }

    // Obtener el ID de la IEO actual desde las propiedades del script
    const idIeoActualStr = PropertiesService.getScriptProperties().getProperty(appConfig.properties.ID_IEO_KEY);
    if (!idIeoActualStr) {
      throw new Error("No se ha podido determinar la IEO del contexto actual. Por favor, inicie una jornada primero.");
    }
    const idIeoActual = parseInt(idIeoActualStr, 10);

    const { docente, titulos, ieos, grados, areasAuxiliares } = rawData;

    // Lógica para determinar si existe en otra IEO
    const ieoIds = ieos.map((i: any) => i.ID_IEO);
    const existeEnOtraIEO = ieoIds.some((id: number) => id !== idIeoActual);

    const dto: DocenteCompletoDTO = {
      docenteId: docente.ID_Docente,
      tipoIdentificacion: docente.Tipo_identificacion_docente,
      numeroIdentificacion: docente.Numero_identificacion_docente,
      nombreDocente: docente.Nombre_docente,
      apellidoDocente: docente.Apellido_docente,
      correoDocente: docente.Correo_electronico_docente,
      celularDocente: docente.Numero_celular_docente,
      areaPrincipal: docente.ID_Area_docencia,
      titulos: titulos.map((t: any) => ({
        tipo_titulo_docente: t.Tipo_titulo_docente,
        titulo_docente: t.Titulo_docente
      })),
      areasAuxiliares: areasAuxiliares.map((a: any) => a.ID_Area_docencia),
      grados: grados.map((g: any) => g.ID_Grado_docencia),
      existeEnOtraIEO: existeEnOtraIEO
    };

    return dto;
  }

  /**
   * Guarda o actualiza la información de un docente y sus relaciones.
   * Todas las operaciones se ejecutan dentro de una transacción.
   * @param dto El DTO con toda la información del docente desde el formulario.
   * @param idIeoActual El ID de la IEO en el contexto actual.
   * @returns Un objeto con el resultado de la operación.
   */
  public saveOrUpdateDocente(dto: DocenteCompletoDTO, idIeoActual: number): { success: boolean; message: string; docenteId: number } {
    try {
      let docenteId = dto.docenteId;

      const docenteData: Partial<Docente> = {
        // Mapeo directo desde el DTO a las columnas de la tabla 'Docente'
        Tipo_identificacion_docente: dto.tipoIdentificacion,
        Numero_identificacion_docente: dto.numeroIdentificacion,
        Nombre_docente: dto.nombreDocente,
        Apellido_docente: dto.apellidoDocente,
        Correo_electronico_docente: dto.correoDocente,
        Numero_celular_docente: dto.celularDocente,
        ID_Area_docencia: dto.areaPrincipal,
        Activo_docente: true
      };

      if (docenteId) {
        this.repository.updateDocente(docenteId, docenteData);
      } else {
        docenteId = this.repository.createDocente(docenteData);
      }

      this.syncTitulos(docenteId, dto.titulos);
      this.syncAreasAuxiliares(docenteId, dto.areasAuxiliares);
      this.syncGrados(docenteId, idIeoActual, dto.grados);

      // Asegurar la relación IEO_Docente (esto ya estaba bien)
      if (!this.repository.findIeoDocente(docenteId, idIeoActual)) {
        this.repository.createIeoDocente(docenteId, idIeoActual);
      }

      return { success: true, message: 'Docente guardado exitosamente.', docenteId: docenteId };

    } catch (e) {
      const error = e as Error;
      Logger.log(`Error en saveOrUpdateDocente: ${error.message}\n${error.stack}`);
      throw new Error(`No se pudo guardar el docente. Detalles: ${error.message}`);
    }
  }

  private syncTitulos(docenteId: number, nuevosTitulosDTO: TituloDTO[]): void {
    // 1. Obtener los títulos actuales de la BD
    const titulosActuales = this.repository.getTitulosByDocenteId(docenteId);

    // Convertimos el array a un Map para búsquedas eficientes
    const mapTitulosActuales = new Map(titulosActuales.map(t => [t.ID_Titulo_docente, t]));

    const idsNuevosTitulos = new Set();

    // 2. Iterar sobre los títulos que vienen del formulario
    for (const dto of nuevosTitulosDTO) {
      if (dto.id) {
        // --- CASO: TÍTULO EXISTENTE (tiene ID) ---
        idsNuevosTitulos.add(dto.id); // Marcar este ID como "todavía existe"

        const tituloExistente = mapTitulosActuales.get(dto.id);

        // Comprobar si ha habido algún cambio
        if (tituloExistente && (tituloExistente.Tipo_titulo_docente !== dto.tipo_titulo_docente || tituloExistente.Titulo_docente !== dto.titulo_docente)) {
          // Si cambió, lo actualizamos en la BD
          Logger.log(`Actualizando título ID: ${dto.id}`);
          this.repository.updateTitulo(dto.id, {
            Tipo_titulo_docente: dto.tipo_titulo_docente,
            Titulo_docente: dto.titulo_docente
          });
        }
      } else {
        // --- CASO: TÍTULO NUEVO (no tiene ID) ---
        // Simplemente lo creamos
        Logger.log(`Creando nuevo título para docente ID: ${docenteId}`);
        this.repository.batchInsert('Titulos_Docente', [{
          ID_Docente: docenteId,
          Tipo_titulo_docente: dto.tipo_titulo_docente,
          Titulo_docente: dto.titulo_docente
        }]);
      }
    }

    // 3. Identificar y eliminar los títulos que ya no existen
    const idsParaEliminar: number[] = [];
    for (const idActual of mapTitulosActuales.keys()) {
      if (!idsNuevosTitulos.has(idActual)) {
        // Si un ID de la BD no vino de vuelta del formulario, hay que eliminarlo.
        idsParaEliminar.push(idActual);
      }
    }

    if (idsParaEliminar.length > 0) {
      Logger.log(`Eliminando ${idsParaEliminar.length} títulos obsoletos.`);
      this.repository.batchDelete('Titulos_Docente', 'ID_Titulo_docente', idsParaEliminar);
    }
  }


  private syncAreasAuxiliares(docenteId: number, nuevasAreasIds: number[]): void {
    const areasActuales = this.repository.getAreasAuxiliaresByDocenteId(docenteId);
    const idsActuales = areasActuales.map(a => a.ID_Area_docencia);

    const setNuevas = new Set(nuevasAreasIds);
    const setActuales = new Set(idsActuales);

    const paraAgregar = nuevasAreasIds.filter(id => !setActuales.has(id));
    const paraEliminar = areasActuales.filter(a => !setNuevas.has(a.ID_Area_docencia));

    if (paraAgregar.length > 0) {
      const records = paraAgregar.map(id => ({ ID_Docente: docenteId, ID_Area_docencia: id }));
      this.repository.batchInsert('Docente_Area_Auxiliar', records);
    }
    if (paraEliminar.length > 0) {
      const idsToDelete = paraEliminar.map(a => a.ID_Docente_area_auxiliar);
      this.repository.batchDelete('Docente_Area_Auxiliar', 'ID_Docente_area_auxiliar', idsToDelete);
    }
  }

  private syncGrados(docenteId: number, idIeoActual: number, nuevosGradosIds: number[]): void {
    const gradosActuales = this.repository.getGradosByDocenteAndIeoId(docenteId, idIeoActual);
    const idsActuales = gradosActuales.map(g => g.ID_Grado_docencia);

    const setNuevos = new Set(nuevosGradosIds);
    const setActuales = new Set(idsActuales);

    const paraAgregar = nuevosGradosIds.filter(id => !setActuales.has(id));
    const paraEliminar = gradosActuales.filter(g => !setNuevos.has(g.ID_Grado_docencia));

    if (paraAgregar.length > 0) {
      const records = paraAgregar.map(id => ({ ID_Docente: docenteId, ID_IEO: idIeoActual, ID_Grado_docencia: id }));
      this.repository.batchInsert('Grado_Escolar_Docente', records);
    }
    if (paraEliminar.length > 0) {
      const idsToDelete = paraEliminar.map(g => g.ID_Grado_escolar_docencia);
      this.repository.batchDelete('Grado_Escolar_Docente', 'ID_Grado_escolar_docencia', idsToDelete);
    }
  }
}

function getDocenteService(): DocenteService_ {
  return DocenteService_.getInstance();
}