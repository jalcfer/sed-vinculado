// Configuración global de la aplicación agrupada por dominios

var appConfig = {
  environment: 'production', // o 'development'
  sheets: {
    jornada: {
      name: 'Jornada',
      startRow: 21,
      fields: { 
        titulo:{range: 'A1:U5', editable: false,type: 'date',protected: true },
        tituloFechaJornada:{range: 'B7:H7', editable: false,protected: true},
        fechaJornada:{range: 'I7:N7', editable: false,type: 'date',protected: true, required:true },
        tituloNumeroJornada: {range: 'B8:H8', editable: false, protected: true},
        numeroJornada: {range: 'I8', editable: false, type: 'number', protected: true, required:true},
        tituloHorasJornada:{ range: 'J8:K8', editable: false, protected: true},
        horasJornada: {range: 'L8:N8', editable: true, type: 'number', required:true },
        tituloTipoJornada: {range: 'B9:H9', editable: false, protected: true},
        tipoJornada: {range: 'I9:N9', editable: true, type: 'string', required:true} ,
        tituloIeoJornada:{ range: 'B10:H10', editable: false, protected: true,},
        ieoJornada:{ range: 'I10:R10', editable: false, protected: true, type: 'string', required:true},
        tituloLineaTrabajoJornada:{range: 'B11:H11', editable: false, protected: true},
        lineaTrabajoJornada:{range: 'I11:R11', editable: true, type: 'string', required:true,},
        tituloAreaLineaTrabajoJornada:{range: 'B12:H12', editable: false, protected: true},
        areaLineaTrabajoJornada:{range: 'I12:R12', editable: true, type: 'string'},
        tituloObjetivoJornada:{range: 'B13:H13', editable: false, protected: true},
        objetivoJornada:{range: 'I13:R16', editable: true, type: 'string', required:true},
        tituloParticipantes:{
          range:'A18:K18',editable: false, protected: true,
          fields: {
            tituloRolInstitucional: {range: 'A19:A20',editable: false,protected: true,},
            rolInstitucional: {startCol: 'A', editable: true,type: 'string',required:true,},
            tituloNombreCompleto: {range: 'B19:J20',editable: false,protected: true,},
            nombreCompleto: {startCol: 'B', endCol:'J', editable: true,type: 'string',required:true,},
            tituloTotalParticipantes: {range: 'K19:K20',editable: false,protected: true,},
            totalParticipantes: {startCol: 'K', editable: true,type: 'number',required:true,},
            tituloAreaDocente: {range: 'L18:N20',editable: false,protected: true,},
            areaDocente: {startCol: 'L', endCol: 'N', editable: true,type: 'string',required:true,},
            tituloGradoDocente: {range: 'O18:O20',editable: false,protected: true,},
            gradoDocente: {startCol: 'O', editable: true,type: 'string',required:true,},
            tituloHorasDocente: {range: 'P18:P20',editable: false,protected: true,},
            horasDocente: {startCol: 'P', editable: true,type: 'number',required:true,},
          },
        },
        tituloLogros: {range: 'Q18',editable: false,protected: true,},
        logros: {initRange:'Q19:Q20', column: 'Q', editable: false,type: 'string',required:true,},
        tituloDificultades: {range: 'R18',editable: false,protected: true,},
        dificultades: {initRange:'R19:R20', column: 'R', editable: false,type: 'string',required:true,},
        tituloAcuerdos: {range: 'S18',editable: false,protected: true,},
        acuerdos: {initRange:'S19:S20', column: 'S', editable: false,type: 'string',required:true,},
        tituloEvidencias: {range: 'T18',editable: false,protected: true,},
        evidencias: {initRange:'T19:T20', column: 'T', editable: false,type: 'string',required:true,},
        tituloObservaciones: {range: 'U18',editable: false,protected: true,},
        observaciones: {initRange:'U19:U20', column: 'U', editable: false,protected: true, type: 'string',required:true,}
      }
    }
  },
  features: {
    enableDebug: false,
    allowManualEdits: false,
  },
  formatos: {
    fecha: 'DD/MMM/YYYY',
    hora: 'HH:mm',
  },
  properties: {
    JORNADA_STATUS_KEY: 'JORNADA_STATUS',
    AUTH_STATUS_KEY: 'AUTH_STATUS',
    ID_IEO_KEY: 'ID_IEO',
    NOMBRE_IEO_KEY: 'IEO_NAME',
    ID_JORNADA_KEY: 'ID_VISITA',
    USER_ROLE_KEY:'USER_ROLE',
    USER_EMAIL_KEY:'USER_EMAIL',
    LOGROS_DIFICULTADES_ACUERDOS_KEY: 'LOGROS_DIFICULTADES_ACUERDOS',   
    EVIDENCIAS_JSON_KEY: 'EVIDENCIAS_SESION_ACTUAL', 
    PARTICIPANTS_COUNT_KEY: "PARTICIPANT_COUNT",
    VISIT_IN_PROGRESS_FLAG_KEY: "VISIT_IN_PROGRESS_FLAG",
    JORNADA_IS_DIRTY_KEY: "JORNADA_IS_DIRTY",
    JORNADA_NUMERO_KEY: "JORNADA_NUMERO",
  },
  triggers: {
    tirggerRange: [
      {
        col: 9,
        row: 11,
        value: 'area'
      },
      {
        col: 1,
        value: 'rolInstitucional',
      },
    ],
    area: {
      areaRow: 12,
      triggerValues: ['Planes De Estudio'],
      function: 'areaHandler',
    },
    rolInstitucional: {
      triggerValues: ['Docente', 'Rector/a', 'Coordinación', 'PTA'],
      nombreColumn: 'B',
      function: 'rolInstitucionalHandler',
    }
  }
};
