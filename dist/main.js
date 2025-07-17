"use strict";
/**
 * @fileoverview Punto de entrada del script para SED Gestión Acompañamiento.
 * Gestiona la creación de un trigger instalable para el menú y el flujo de autorización.
 */
/**
 * Se ejecuta cuando el usuario abre el documento (Trigger Simple).
 * Verifica el estado de autorización usando PropertiesService y muestra el menú apropiado.
 */
function onOpen(e) {
    try {
        const scriptProperties = PropertiesService.getScriptProperties();
        const authStatus = scriptProperties.getProperty(appConfig.properties.AUTH_STATUS_KEY);
        if (authStatus === 'COMPLETED') {
            // Si ya está autorizado, muestra un menú de carga temporal.
            createOnOpenWaitMenu();
        }
        else {
            // Si no hay estado de autorización, mostrar el menú para iniciar el proceso.
            createOnOpenAuthorizeMenu();
        }
    }
    catch (error) {
        // Este bloque se ejecuta si el script nunca ha sido autorizado y `getScriptProperties` falla.
        Logger.log('Error en onOpen (probablemente requiere autorización): ' + error.message);
        createOnOpenAuthorizeMenu();
    }
}
/**
 * Crea el trigger instalable para onOpen y ejecuta la lógica del menú inmediatamente.
 * Esta función es llamada desde el menú "Autorizar Complemento".
 */
function onOpenAuthorize() {
    try {
        // 1. Disparar el diálogo de autorización si es necesario.
        const userEmail = Session.getActiveUser().getEmail();
        // 2. Instalar el trigger onEdit para la nueva hoja
        getJornadaService().instalarTriggerOnEdit(SpreadsheetApp.getActive().getId());
        // 3. Marcar la autorización como completada en las propiedades del script.
        PropertiesService.getScriptProperties().setProperty(appConfig.properties.AUTH_STATUS_KEY, 'COMPLETED');
        PropertiesService.getScriptProperties().setProperty(appConfig.properties.JORNADA_STATUS_KEY, 'NO_INICIADA');
        PropertiesService.getScriptProperties().setProperty(appConfig.properties.USER_EMAIL_KEY, userEmail);
        // 4. Install the onOpen trigger, this trigger will run as the user that has authorized the script.
        ScriptApp.newTrigger('buildDynamicMenu')
            .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
            .onOpen()
            .create();
        // 5. Informar al usuario y ejecutar la construcción del menú inmediatamente.
        SpreadsheetApp.getUi().alert('¡Autorización completa! El menú se cargará ahora.');
        // 6. Llamada directa para cargar el menú inmediatamente
        // onOpen({} as any); 
        buildDynamicMenu({});
    }
    catch (e) {
        Logger.log('El usuario no concedió la autorización. ' + e.message);
        SpreadsheetApp.getUi().alert('La autorización fue denegada. El script no podrá funcionar hasta que se concedan los permisos.');
    }
}
/**
 * Construye el menú dinámico. Esta función es llamada por el trigger instalable onOpen.
 * Contiene la lógica de autorización que ahora funcionará de forma fiable.
 */
function buildDynamicMenu(e) {
    // Si está autorizado, construir el menú dinámico.
    try {
        getMenuService().createDynamicMenu();
    }
    catch (error) {
        Logger.log('Error al crear el menú dinámico: ' + error.message);
        SpreadsheetApp.getUi().alert('No se pudo cargar el menú de Gestión de Acompañamiento. Verifique que su usuario esté registrado en la base de datos y tenga un rol asignado.');
    }
}
/**
 * Crea el menú que permite al usuario iniciar el flujo de autorización.
 */
function createOnOpenAuthorizeMenu() {
    SpreadsheetApp.getUi()
        .createMenu('Gestión Acompañamiento')
        .addItem('Autorizar Complemento', 'onOpenAuthorize')
        .addToUi();
}
/**
 * Crea el menú que permite al usuario iniciar el flujo de autorización.
 */
function createOnOpenWaitMenu() {
    SpreadsheetApp.getUi()
        .createMenu('Gestión Acompañamiento')
        .addItem('...', 'showWaitMessage')
        .addToUi();
}
function showWaitMessage() {
    SpreadsheetApp.getUi().alert('Cargando menú...');
}
