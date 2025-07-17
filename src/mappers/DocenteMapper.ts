// sed-vinculado/src/mappers/DocenteMapper.ts

interface RawDocenteData {
    ID_Docente: string;
    Nombre_docente: string;
    Apellido_docente: string;
    Correo_electronico: string;
    Institucion_educativa: string;
    Nombre_area_docencia: string;
    Titulo_docente: string | null;
    Tipo_titulo_docente: string | null;
    Numero_grado_docencia: string | null;
}

interface ProcessedDocente {
    "Nombre": string;
    "Apellido": string;
    "Correo": string;
    "Títulos": string;
    "IEO": string;
    "Área de Docencia": string;
    "Grados": string;
}

class DocenteMapper {
  /**
   * Procesa los datos crudos de la consulta de docentes para agrupar por docente
   * y concatenar títulos y grados.
   * @param data Datos directamente desde la consulta.
   * @returns Un array de objetos procesado y listo para la vista.
   */
  static processDocentesView(data: RawDocenteData[]): ProcessedDocente[] {
    Logger.log('Iniciando DocenteMapper.processDocentesView');
    Logger.log('data recibida: %s', JSON.stringify(data.slice(0, 5))); 

    if (!data || data.length === 0) {
      Logger.log('No hay docentes para procesar. Retornando array vacío.');
      return [];
    }

    const docentesMap = new Map<string, any>();

    data.forEach(row => {
      const docenteId = row.ID_Docente;
      if (!docentesMap.has(docenteId)) {
        docentesMap.set(docenteId, {
          "Nombre": row.Nombre_docente,
          "Apellido": row.Apellido_docente,
          "Correo": row.Correo_electronico,
          "Títulos": new Set<string>(),
          "IEO": row['Institucion_educativa'],
          "Área de Docencia": row['Nombre_area_docencia'],
          "Grados": new Set<string>(),
        });
      }

      const docenteEntry = docentesMap.get(docenteId);
      if (row['Titulo_docente']) {
        const tipo = row['Tipo_titulo_docente'] || '';
        const tituloCompleto = `${tipo}: ${row['Titulo_docente']}`;
        docenteEntry["Títulos"].add(tituloCompleto);
      }

      if (row['Numero_grado_docencia']) {
        docenteEntry["Grados"].add(row['Numero_grado_docencia']);
      }
    });

    const result = Array.from(docentesMap.values()).map(docente => {
      return {
        ...docente,
        "Títulos": Array.from(docente["Títulos"]).join(', '),
        "Grados": Array.from(docente["Grados"]).join(', '),
      };
    });
    Logger.log('Docentes procesados: %s', JSON.stringify(result.slice(0, 5)));
    return result;
  }
}

const docenteMapper = DocenteMapper;
