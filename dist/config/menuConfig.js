"use strict";
/**
 * @fileoverview Define la estructura y configuración de los menús dinámicos de la aplicación.
 * Cada objeto define un menú o submenú, incluyendo los roles que tienen permiso para verlo.
 */
/**
 * @const menuConfig
 * @description Configuración central de los menús. El `MenuService` usará esta estructura
 * para construir dinámicamente la interfaz de usuario basada en el `onOpen` de `main.ts`.
 */
const menuConfig = [
    {
        label: 'Gestión Acompañamiento',
        roles: ['ADMIN', 'OWNER', 'PA'], // Rol padre que engloba a los demás
        subItems: [
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
                roles: ['PA'],
                subItems: [
                    {
                        label: 'Actualizar Jornadas',
                        icon: '🔄',
                        functionName: 'actualizarJornadasPA', // Placeholder
                        roles: ['PA'],
                    },
                    {
                        label: 'Generar Informe Preliminar',
                        icon: '📝',
                        functionName: 'generarInformePreliminar_',
                        roles: ['PA'],
                    },
                    {
                        label: 'Reportar Informe Bimensual',
                        icon: '📊',
                        functionName: 'showInformeDialog',
                        roles: ['PA'],
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
                                INICIADA: 'Registrar Jornada (en curso...)',
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
                                NO_INICIADA: 'Finalizar y Guardar Jornada (No iniciada)',
                                FINALIZADA: 'Finalizar y Guardar Jornada (Finalizada)',
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
