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
    //this.repository.beginTransaction();
    try {
      let docenteId = dto.docenteId;

      const docenteData: Partial<Docente> = {
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
        // --- Lógica de Actualización ---
        this.repository.updateDocente(docenteId, docenteData);

        // Limpiar relaciones existentes para este docente antes de re-insertar
        this.repository.deleteByDocenteId('Titulos_Docente', docenteId);
        this.repository.syncTitulos(docenteId, dto.titulos);
        this.repository.deleteByDocenteId('Docente_Area_Auxiliar', docenteId);
        // Nota: Borramos todos los grados asociados al docente y los re-creamos para la IEO actual.
        // Si se necesitara mantener grados de otras IEOs, la lógica aquí sería más compleja.
        this.repository.deleteByDocenteId('Grado_Escolar_Docente', docenteId);

      } else {
        // --- Lógica de Creación ---
        docenteId = this.repository.createDocente(docenteData);
      }

      // --- (Re)Insertar relaciones ---

      // Insertar Títulos
      const titulosToInsert = dto.titulos.map(t => ({ ...t, ID_Docente: docenteId }));
      this.repository.batchInsert('Titulos_Docente', titulosToInsert);

      // Insertar Áreas Auxiliares
      const areasToInsert = dto.areasAuxiliares.map(areaId => ({
        ID_Docente: docenteId,
        ID_Area_docencia: areaId
      }));
      this.repository.batchInsert('Docente_Area_Auxiliar', areasToInsert);

      // Insertar Grados
      const gradosToInsert = dto.grados.map(gradoId => ({
        ID_Docente: docenteId,
        ID_IEO: idIeoActual,
        ID_Grado_docencia: gradoId
      }));
      this.repository.batchInsert('Grado_Escolar_Docente', gradosToInsert);

      // Asegurar la relación IEO_Docente
      if (!this.repository.findIeoDocente(docenteId, idIeoActual)) {
        this.repository.createIeoDocente(docenteId, idIeoActual);
      }

      //this.repository.commitTransaction();
      return { success: true, message: 'Docente guardado exitosamente.', docenteId: docenteId };

    } catch (e) {
      // this.repository.rollbackTransaction();
      const error = e as Error;
      Logger.log(`Error en saveOrUpdateDocente: ${error.message}\n${error.stack}`);
      throw new Error(`No se pudo guardar el docente. Detalles: ${error.message}`);
    }
  }
}

function getDocenteService(): DocenteService_ {
  return DocenteService_.getInstance();
}