/**
 * @fileoverview Servicio especializado en aplicar plantillas de formato a hojas de cálculo.
 * Su única responsabilidad es tomar una definición de plantilla y aplicarla a una hoja.
 */

class TemplateService {
  private static instance: TemplateService;

  private constructor() {
    // Constructor privado para el patrón Singleton.
  }

  public static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  /**
   * Aplica una plantilla de formato a una hoja de cálculo específica.
   * @param spreadsheetId El ID del Spreadsheet.
   * @param sheetName El nombre de la hoja a la que se aplicará la plantilla.
   * @param template El objeto de plantilla que define el formato.
   * @param listDataMap Un mapa que contiene los datos para las listas desplegables dinámicas.
   */
  public applySheetTemplate(spreadsheetId: string, sheetName: string, template: JornadaSheetTemplate, listDataMap: { [key: string]: string[] }): void {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    let sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error(`No se encontró la hoja "${sheetName}" en el archivo con ID ${spreadsheetId}.`);
    }

    // Configuración básica
    if (template.hideGridlines) {
      sheet.setHiddenGridlines(true);
    }

    // Aplicar tamaños de columnas y filas primero
    for (const col in template.columns) {
      const colIndex = sheet.getRange(col + '1').getColumn();
      sheet.setColumnWidth(colIndex, template.columns[col]);
    }

    for (const row in template.rows) {
      sheet.setRowHeight(parseInt(row), template.rows[row]);
    }

    // Insertar imágenes desde la plantilla
    this.insertImagesFromTemplate(sheet, template);

    // PRIMERA PASADA: Aplicar todos los campos (excepto bordes)
    template.fields.forEach(field => {
      const range = sheet.getRange(field.range);

      if (field.label) range.setValue(field.label);
      if (field.align) range.setHorizontalAlignment(field.align);
      if (field.verticalAlign) range.setVerticalAlignment(field.verticalAlign);
      if (field.rotation) range.setTextRotation(field.rotation);
      if (field.fontWeight) range.setFontWeight(field.fontWeight);

      if (field.type === 'dropdown') {
        let rule;
        if (field.options) {
          rule = SpreadsheetApp.newDataValidation().requireValueInList(field.options).build();
        } else if (field.dataSource && listDataMap) {
          const dataList = listDataMap[field.dataSource.table];
          if (dataList && dataList.length > 0) {
            rule = SpreadsheetApp.newDataValidation().requireValueInList(dataList).build();
          }
        }
        if (rule) range.setDataValidation(rule);
      }

      if (field.hidden) {
        const rowIndex = range.getRow();
        sheet.hideRows(rowIndex);
      }
    });

    // SEGUNDA PASADA: Aplicar TODOS los bordes
    template.fields.forEach(field => {
      if (field.border) {
        const range = sheet.getRange(field.range);
        const borderStyle = SpreadsheetApp.BorderStyle.SOLID;
        const color = field.border.color || '#000000';

        range.setBorder(null, null, null, null, null, null, color, borderStyle); // Limpiar primero

        if (field.border.type === 'bottom') {
          range.setBorder(null, null, true, null, null, null, color, borderStyle);
        } else if (field.border.type === 'full') {
          range.setBorder(true, true, true, true, true, true, color, borderStyle);
        }
      }
    });

    // TERCERA PASADA: Aplicar merges
    template.merges.forEach(merge => {
      try {
        sheet.getRange(merge.range).merge();
      } catch (e) {
        Logger.log(`Advertencia: No se pudo combinar el rango ${merge.range}: ${(e as Error).message}`);
      }
    });

    // CUARTA PASADA: Aplicar protecciones
    const me = Session.getEffectiveUser();
    template.fields.forEach(field => {
      if (field.protected) {
        try {
          const range = sheet.getRange(field.range);
          if (field.label === '') {
            range.setBackground('#f3f3f3');
          }
          // La lógica de protección real se puede refinar aquí
        } catch (e) {
          Logger.log(`No se pudo proteger el rango ${field.range}: ${(e as Error).message}`);
        }
      }
    });

    if (template.fontFamily) {
      sheet.getDataRange().setFontFamily(template.fontFamily);
    }

    const maxRows = sheet.getMaxRows();
    if (template.deleteRowsAfter && maxRows > template.deleteRowsAfter) {
      sheet.deleteRows(template.deleteRowsAfter + 1, maxRows - template.deleteRowsAfter);
    }
  }

  /**
   * Inserta imágenes en la hoja según la plantilla.
   * @param sheet La hoja donde se insertarán las imágenes.
   * @param template La plantilla que contiene la información de las imágenes.
   */
  private insertImagesFromTemplate(sheet: GoogleAppsScript.Spreadsheet.Sheet, template: JornadaSheetTemplate): void {
    const properties = PropertiesService.getScriptProperties();
    let offsetX = 120;
    const imageSpacing = 20;

    const baseCell = template.images.length > 0 ? template.images[0].cell : 'B1';
    const baseRange = sheet.getRange(baseCell);
    const baseColumn = baseRange.getColumn();
    const baseRow = baseRange.getRow();

    template.images.forEach((imageInfo) => {
      try {
        const imageFileId = properties.getProperty(imageInfo.logoKey);
        if (imageFileId) {
          const imageBlob = DriveApp.getFileById(imageFileId).getBlob();
          const image = sheet.insertImage(imageBlob, baseColumn, baseRow, offsetX, 0);
          image.setWidth(90);
          image.setHeight(90);
          Logger.log(`Imagen desde el fileId '${imageFileId}' (key: ${imageInfo.logoKey}) insertada y redimensionada.`);
          offsetX += image.getWidth() + imageSpacing;
        } else {
          Logger.log(`No se encontró el File ID para la key de logo: ${imageInfo.logoKey}`);
        }
      } catch (e) {
        Logger.log(`Error al insertar la imagen para la key ${imageInfo.logoKey}: ${(e as Error).message}`);
      }
    });
  }
}

/**
 * Retorna la instancia única de TemplateService.
 */
function getTemplateService(): TemplateService {
  return TemplateService.getInstance();
}
