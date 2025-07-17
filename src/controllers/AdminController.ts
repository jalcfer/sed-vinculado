// Controlador para exponer funciones globales de administración (AdminController)
// Orquesta los flujos y expone funciones Apps Script
// Se asume que adminService está declarado como variable global en AdminService.ts

function prepararDocumentoAdmin() {
  getAdminService().prepararDocumentoAdmin();
}

function asignarPAIEO(paId:string, ieoId:string, carpetaPA:string) {
  getAdminService().asignarPAIEO(paId, ieoId, carpetaPA);
}

function showJornadaCreationDialog() {
  // Obtener los datos de acompañamientos desde el servidor
  const acompanamientos = getAdminService().getAcompanamientosParaUsuario();

  // Crear el template HTML y pasarle los datos
  const template = HtmlService.createTemplateFromFile('ui/dialog');
  template.acompanamientos = acompanamientos;

  // Generar el HTML final y mostrar el diálogo
  const html = template.evaluate().setWidth(700).setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'Crear Nuevas Jornadas de Acompañamiento');
}
