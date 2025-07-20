/**
 * @fileoverview Define la estructura y configuración de los menús dinámicos de la aplicación.
 * Cada objeto define un menú o submenú, incluyendo los roles que tienen permiso para verlo.
 */

/**
 * @interface MenuItem
 * @description Define la estructura de un elemento de menú, que puede contener sub-elementos.
 */
interface MenuItem {
  label: string; // El texto que se muestra en el menú.
  icon?: string; // El ícono a mostrar junto al label.
  functionName?: string; // La función global a ejecutar (si no es un submenú padre).
  roles: ('ADMIN' | 'OWNER' | 'PA')[]; // Roles que pueden ver este menú.
  subItems?: MenuItem[]; // Array de sub-elementos de menú.
  isSeparator?: boolean; // Indica si el elemento es un separador.
  labelStates?: {
    stateKey: string; // La clave de estado a consultar.
    states: { [key: string]: string }; // Mapeo de valores de estado a textos de label.
  };
  /**
   * Define una plantilla para construir una etiqueta dinámica.
   * La plantilla usará {key} para interpolar valores del estado.
   */
  dynamicLabel?: {
    template: string; // ej. "Jornada {numero} - {status}{dirtyMark}"
    // Las claves aquí son las que se usarán en la plantilla.
    // Los valores son las claves a buscar en appState.
    keys: { [placeholder: string]: string }; 
  };
}

/**
 * @const menuConfig
 * @description Configuración central de los menús. El `MenuService` usará esta estructura
 * para construir dinámicamente la interfaz de usuario basada en el `onOpen` de `main.ts`.
 */
const menuConfig: MenuItem[] = [
  {
    label: 'Gestión Acompañamiento',
    roles: ['ADMIN', 'OWNER', 'PA'], // Rol padre que engloba a los demás
    subItems: [
      {
        label: 'Estado de la Jornada', // Un label base por si algo falla
        functionName: 'dummyFunction', // No hace nada al hacer clic
        roles: ['ADMIN', 'OWNER', 'PA'],
        dynamicLabel: {
          // La plantilla de cómo se debe ver el título.
          template: 'Jornada {numero} - {status}{dirtyMark}',
          // Mapeo de los placeholders en la plantilla a las claves del appState.
          keys: {
            numero: 'numeroJornada',
            status: 'jornadaStatus',
            dirtyMark: 'dirtyMark'
          }
        }
      },
      {
        isSeparator: true, // Separador para separar el título del resto.
        roles: ['ADMIN', 'OWNER', 'PA'],
        label: 'separator_title',
      },
      {
        label: 'Admin',
        icon: '⚙️',
        roles: ['ADMIN', 'OWNER'],
        subItems: [
          {
            label: 'Preparar documento admin',
            functionName: 'prepararDocumentoAdmin',
            roles: ['ADMIN', 'OWNER'],
          },
          {
            label: 'Asignar PA a IEO',
            functionName: 'asignarPAIEO',
            roles: ['ADMIN', 'OWNER'],
          },
          {
            label: 'Crear archivos de Jornada',
            functionName: 'showJornadaCreationDialog',
            roles: ['ADMIN', 'OWNER'],
          },
          {
            isSeparator: true,
            roles: ['ADMIN', 'OWNER'],
            label: 'separator_migration',
          },
          {
            label: 'Migración Semimanual',
            icon: '🚚',
            functionName: 'showMigrationDialog',
            roles: ['ADMIN', 'OWNER'],
          },
        ],
      },
      {
        label: 'Informes',
        icon: '🧑‍🏫',
        roles: ['OWNER'],
        subItems: [
          {
            label: 'Actualizar Jornadas',
            icon: '🔄',
            functionName: 'actualizarJornadasPA',
            roles: ['OWNER'],
          },
          {
            label: 'Generar Informe Preliminar',
            icon: '📝',
            functionName: 'generarInformePreliminar_',
            roles: ['OWNER'],
          },
          {
            label: 'Reportar Informe Bimensual',
            icon: '📊',
            functionName: 'showInformeDialog',
            roles: ['OWNER'],
          }


        ],
      },
      {
        label: 'Gestión Jornadas',
        icon: '📇',
        roles: ['PA'],
        subItems: [
          {
            label: 'Registrar Jornada',
            icon: '➕',
            functionName: 'iniciarJornada_',
            roles: ['ADMIN', 'PA'],
            labelStates: {
              stateKey: appConfig.properties.JORNADA_STATUS_KEY,
              states: {
                'EN CURSO': 'Registrar Jornada',
              },
            },
          },
          {
            label: 'Logros, Dificultades y Acuerdos',
            icon: '🎯',
            functionName: 'agregarLogrosPA',
            roles: ['ADMIN', 'PA'],
          },
          {
            label: 'Evidencias',
            icon: '📎',
            functionName: 'agregarEvidenciasPA',
            roles: ['ADMIN', 'PA'],
          },
          {
            label: 'Finalizar y Guardar Jornada',
            icon: '🏁',
            functionName: 'finalizarJornadaPA',
            roles: ['ADMIN', 'PA'],
            labelStates: {
              stateKey: appConfig.properties.JORNADA_STATUS_KEY,
              states: {
                INICIADA: 'Finalizar y Guardar Jornada',
                FINALIZADA: 'Finalizar y Guardar Jornada',
              },
            },
          },
          {
            isSeparator: true,
            roles: ['ADMIN', 'PA'],
            label: 'separator1', // label es requerido, pero no se mostrará
          },
          {
            label: 'Participante(s)',
            icon: '➕👤',
            functionName: 'agregarParticipantesPA',
            roles: ['ADMIN', 'PA'],
          },
          {
            label: 'Participante(s)',
            icon: '➖👤',
            functionName: 'eliminarParticipantesPA',
            roles: ['ADMIN', 'PA'],
          },
          {
            label: 'Docente',
            icon: '➕🧑‍🏫',
            functionName: 'showDocenteDialog',
            roles: ['ADMIN', 'PA'],
          }
        ],
      },
    ],
  },
];
