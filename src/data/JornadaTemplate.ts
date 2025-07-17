/**
 * Plantilla y utilidades para la generación de hojas de Jornada de Acompañamiento.
 * Permite definir la estructura, validaciones y protecciones requeridas para los archivos copia.
 */

type JornadaSheetTemplate = {
  columns: { [col: string]: number };
  rows: { [row: number]: number };
  merges: { range: string }[];
  images: { cell: string; logoKey: string; description?: string }[];
  fields: {
    range: string;
    label?: string;
    editable: boolean;
    type?: 'text' | 'number' | 'date' | 'dropdown';
    options?: string[]; // Para listas desplegables estáticas
    dataSource?: { // Para listas desplegables dinámicas desde la BD
      table: string;
      valueColumn: string;
      activeColumn: string; 
    };
    border?: {
      type: 'bottom' | 'full';
      color?: string;
    };
    align?: 'left' | 'center' | 'right';
    verticalAlign?: 'middle' | 'top' | 'bottom';
    rotation?: number;
    hidden?: boolean;
    conditionalVisibility?: {
      field: string;
      value: string;
    };
    protected?: boolean;
    fontWeight?: 'normal' | 'bold';
  }[];
  protections: { range: string; description: string }[];
  fontFamily?: string;
  hideGridlines?: boolean;
  deleteRowsAfter?: number;
};

/**
 * Devuelve la plantilla estándar para la hoja principal de una Jornada de Acompañamiento.
 */
function getJornadaSheetTemplate(): JornadaSheetTemplate {
  return {
    columns: {
      A: 120, B: 39, C: 17, D: 26, E: 24, F: 32, G: 27, H: 53, I: 73, J: 71, K: 97, L: 30, M: 30, N: 41, O: 25, P: 17, Q: 179, R: 183, S: 178, T: 245, U: 213
    },
    rows: {
      1: 20, 2: 20, 3: 20, 4: 20, 5: 27, 6: 27, 7: 27, 8: 27, 9: 32, 10: 32, 11: 27, 12: 27, 13: 20, 14: 20, 15: 20, 16: 20, 17: 20, 18: 20, 19: 20, 20: 20
    },
    merges: [
      { range: appConfig.sheets.jornada.fields.titulo.range },
      { range: 'B7:H7' }, { range: 'I7:N7' },
      { range: 'B8:H8' }, { range: 'J8:K8' }, { range: 'L8:N8' },
      { range: 'B9:H9' }, { range: 'I9:N9' },
      { range: 'B10:H10' }, { range: 'I10:R10' },
      { range: 'B11:H11' }, { range: 'I11:R11' },
      { range: 'B12:H12' }, { range: 'I12:R12' },
      { range: 'B13:H13' }, { range: 'I13:R16' },
      { range: 'A18:K18' }, { range: 'A19:A20' }, { range: 'B19:J20' }, { range: 'K19:K20' },
      { range: 'L18:N20' }, { range: 'O18:O20' }, { range: 'P18:P20' },
      { range: 'Q19:Q20' }, { range: 'R19:R20' }, { range: 'S19:S20' }, { range: 'T19:T20' }, { range: 'U19:U20' }
    ],
    images: [
      { cell: 'A1', logoKey: 'APP_ID_LOGO_ALCALDIA_400_KEY', description: 'Logo Alcaldía' },
      { cell: 'A2', logoKey: 'APP_ID_LOGO_OPERADOR_400_KEY', description: 'Logo Operador' },
      { cell: 'A3', logoKey: 'APP_ID_LOGO_PROYECTO_400_KEY', description: 'Logo Proyecto' }
    ],
    fields: [
      { range: 'A1:U5', label: 'FORTALECER LOS PROCESOS DE INNOVACIÓN PEDAGÓGICA Y CURRICULAR QUE CONTRIBUYAN AL DESARROLLO DE APRENDIZAJES\nINFORME JORNADA DE ACOMPAÑAMIENTO  ', editable: false, align: 'center', verticalAlign: 'middle', protected: true, fontWeight: 'bold' },
      { range: 'B7:H7', label: 'FECHA JORNADA:', editable: false, align: 'left', protected: true, fontWeight: 'bold' },
      { range: 'I7:N7', label: '', editable: false, type: 'date', border: { type: 'bottom' }, align: 'left', protected: true },
      { range: 'B8:H8', label: 'JORNADA DE ACOMPAÑAMIENTO No.', editable: false, align: 'left', protected: true, fontWeight: 'bold' },
      { range: 'I8', label: '', editable: false, type: 'number', border: { type: 'bottom' }, align: 'left', protected: true },
      { range: 'J8:K8', label: 'DURACIÓN (Horas)', editable: false, align: 'center', protected: true, fontWeight: 'bold' },
      { range: 'L8:N8', label: '', editable: true, type: 'number', border: { type: 'bottom' }, align: 'left' },
      { range: 'B9:H9', label: 'TIPO DE JORNADA', editable: false, align: 'left', protected: true, fontWeight: 'bold' },
      { range: 'I9:N9', label: '', editable: true, type: 'dropdown', options: ['Socialización', 'Linea Trabajo', 'Gestión'], border: { type: 'bottom' }, align: 'left' },
      { range: 'B10:H10', label: 'INST EDUCATIVA (IEO)', editable: false, align: 'left', protected: true, fontWeight: 'bold' },
      { range: 'I10:R10', label: '', editable: false, border: { type: 'bottom' }, align: 'left', protected: true },
      { range: 'B11:H11', label: 'LÍNEA DE TRABAJO:', editable: false, align: 'left', protected: true, fontWeight: 'bold' },
      { range: 'I11:R11', label: '', editable: true, type: 'dropdown', dataSource: { table: 'Linea_Trabajo', valueColumn: 'Nombre_linea_trabajo', activeColumn: 'Activo_linea_trabajo' }, border: { type: 'bottom' }, align: 'left' },
      { range: 'B12:H12', label: 'ÁREA:', editable: false, align: 'left', protected: true, fontWeight: 'bold' },
      { range: 'I12:R12', label: '', editable: true, type: 'dropdown', dataSource: { table: 'Area_Linea_Trabajo', valueColumn: 'Nombre_area_linea_trabajo', activeColumn: 'Activo' }, border: { type: 'bottom' }, align: 'left', hidden: true, conditionalVisibility: { field: 'I11:R11', value: 'Planes de Estudio' } },
      { range: 'B13:H13', label: 'OBJETIVO:', editable: false, align: 'left', protected: true, fontWeight: 'bold' },
      { range: 'I13:R16', label: '', editable: true, type: 'text', border: { type: 'bottom' }, align: 'left' },
      { range: 'A18:K18', label: 'PARTICIPANTES', editable: false, align: 'center', border: { type: 'full' }, protected: true, fontWeight: 'bold' },
      { range: 'A19:A20', label: 'ROL', editable: false, align: 'center', border: { type: 'full' }, protected: true, fontWeight: 'bold' },
      { range: 'B19:J20', label: 'NOMBRE COMPLETO', editable: false, align: 'center', border: { type: 'full' }, protected: true, fontWeight: 'bold' },
      { range: 'K19:K20', label: 'TOTAL\nPARTICIPANTES', editable: false, align: 'center', border: { type: 'full' }, protected: true, fontWeight: 'bold' },
      { range: 'L18:N20', label: 'ARE\nDOCENTE', editable: false, align: 'center', verticalAlign: 'middle', rotation: 90, border: { type: 'full' }, protected: true, fontWeight: 'bold' },
      { range: 'O18:O20', label: 'GRADOS', editable: false, align: 'center', verticalAlign: 'middle', rotation: 90, border: { type: 'full' }, protected: true, fontWeight: 'bold' },
      { range: 'P18:P20', label: 'HORAS', editable: false, align: 'center', verticalAlign: 'middle', rotation: 90, border: { type: 'full' }, protected: true, fontWeight: 'bold' },
      { range: 'Q18', label: 'LOGROS', editable: false, align: 'center', border: { type: 'full' }, protected: true, fontWeight: 'bold' },
      { range: 'R18', label: 'DIFICULTADES', editable: false, align: 'center', border: { type: 'full' }, protected: true, fontWeight: 'bold' },
      { range: 'S18', label: 'ACUERDOS Y COMPROMISOS', editable: false, align: 'center', border: { type: 'full' }, protected: true, fontWeight: 'bold' },
      { range: 'T18', label: 'EVIDENCIAS', editable: false, align: 'center', border: { type: 'full' }, protected: true, fontWeight: 'bold' },
      { range: 'U18', label: 'OBSERVACIONES SED', editable: false, align: 'center', border: { type: 'full' }, protected: true, fontWeight: 'bold' },
      { range: 'Q19:Q20', label: '', editable: false, align: 'left', border: { type: 'full' }, protected: true },
      { range: 'R19:R20', label: '', editable: false, align: 'left', border: { type: 'full' }, protected: true },
      { range: 'S19:S20', label: '', editable: false, align: 'left', border: { type: 'full' }, protected: true },
      { range: 'T19:T20', label: '', editable: false, align: 'left', border: { type: 'full' }, protected: true },
      { range: 'U19:U20', label: '', editable: false, align: 'left', border: { type: 'full' }, protected: true }
    ],
    protections: [
      { range: 'A1:U20', description: 'Protección general de la plantilla, solo campos editables pueden ser modificados' }
    ],
    fontFamily: "Calibri",
    hideGridlines: true,
    deleteRowsAfter: 20
  };
}
