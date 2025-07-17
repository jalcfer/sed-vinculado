
class MyTriggersHandlers {
  static areaHandler(triggerObj: any) {
    try {
      var sheet = SpreadsheetApp.getActiveSheet();
      var editedCell = sheet.getActiveCell();
      var editedValue = editedCell.getValue();
      Logger.log('areaHandler: Valor editado: ' + editedValue);
      if (triggerObj.triggerValues.indexOf(editedValue) !== -1) {
        Logger.log('areaHandler: Valor válido, mostrando fila ' + triggerObj.areaRow);
        sheet.showRows(triggerObj.areaRow);
      } else {
        Logger.log('areaHandler: Valor no válido, ocultando fila ' + triggerObj.areaRow);
        sheet.hideRows(triggerObj.areaRow);
      }
    } catch (e: any) {
      Logger.log('Error en areaHandler: ' + e.message);
    }
  }

  static rolInstitucionalHandler(triggerObj: any) {
    try {
      const sheet = SpreadsheetApp.getActiveSheet();
      const editedCell = sheet.getActiveCell();
      const editedValue = editedCell.getValue();
      const nombreCell = sheet.getRange(`${triggerObj.nombreColumn}${editedCell.getRow()}`);
      nombreCell.clearDataValidations();
      nombreCell.clearContent();

      if (triggerObj.triggerValues.indexOf(editedValue) !== -1) {
        // obtener el id de la ieo de properties services
        const ieoId = PropertiesService.getScriptProperties().getProperty(appConfig.properties.ID_IEO_KEY);

        // Obtener lista de docentes activos
        var docenteList = getDataViewRepository().getListDataWithJoin(
          'IEO_Docente',
          ['Docente'],
          ['Nombre_docente','Apellido_docente'], 
          [
            {col:'ID_IEO', op: '=',val: ieoId}
          ]);
        Logger.log('rolInstitucionalHandler: Lista de docentes: ' + JSON.stringify(docenteList));
        nombreCell.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(docenteList, true).build());
      }
    } catch (err: any) {
      Logger.log('Error en rolInstitucionalHandler: ' + err.message);
    }
  }
}

function rolInstitucionalHandler(triggerObj: any) {
  MyTriggersHandlers.rolInstitucionalHandler(triggerObj);
}

function areaHandler(triggerObj: any) {
  MyTriggersHandlers.areaHandler(triggerObj);
}