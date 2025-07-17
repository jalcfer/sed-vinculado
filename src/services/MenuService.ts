/**
 * @fileoverview Servicio para gestionar la creación dinámica de menús en la UI de Google Sheets.
 * Se basa en una configuración centralizada (menuConfig) y en el rol del usuario actual.
 */

// Se asume que las interfaces y configuraciones de `menuConfig.ts` están disponibles globalmente.

/**
 * @class MenuService
 * @description Construye y gestiona los menús de la aplicación de forma dinámica.
 */
class MenuService {
  private ui: GoogleAppsScript.Base.Ui;
  private userRole: 'ADMIN' | 'OWNER' | 'PA' | 'UNDEFINED';
  private appState: { [key: string]: string };
  static instance: MenuService;

  constructor() {
    this.ui = SpreadsheetApp.getUi();
    this.userRole = this.getCurrentUserRole();
    this.appState = this.getApplicationState();
    Logger.log(`Rol del usuario: ${this.userRole}`);
    Logger.log(`Estado de la aplicación: ${JSON.stringify(this.appState)}`);
  }

  public static getInstance(): MenuService {
    if (!MenuService.instance) {
      MenuService.instance = new MenuService();
    }
    return MenuService.instance;
  }

  /**
   * Crea y muestra el menú principal de la aplicación basado en la configuración y el rol del usuario.
   */
  public createDynamicMenu(): void {
    const topMenuConfig = menuConfig[0];
    const menu = this.ui.createMenu(topMenuConfig.label);

    if (topMenuConfig.subItems) {
      this.buildMenu(menu, topMenuConfig.subItems, this.userRole, this.appState);
    }

    menu.addToUi();
  }

  /**
   * Construye recursivamente los menús y submenús.
   * @param parentMenu El menú de la UI al que se añadirán los nuevos elementos.
   * @param items La configuración de los elementos de menú a procesar.
   * @param userRole El rol del usuario actual.
   * @param appState El estado actual de la aplicación.
   */
  private buildMenu(
    parentMenu: GoogleAppsScript.Base.Menu,
    items: MenuItem[],
    userRole: string,
    appState: { [key: string]: string }
  ): void {
    Logger.log(`Construyendo menú para el rol: ${userRole} con estado: ${JSON.stringify(appState)}`);
    Logger.log(`Elementos del menú: ${JSON.stringify(items)}`);
    items.forEach(item => {
      if (!item.roles.includes(userRole as any)) {
        return;
      }

      let finalLabel = item.icon ? `${item.icon} ${item.label}` : item.label;
      if (item.labelStates) {
        const currentState = appState[item.labelStates.stateKey];
        if (currentState && item.labelStates.states[currentState]) {
          finalLabel = item.icon ? `${item.icon} ${item.labelStates.states[currentState]}` : item.labelStates.states[currentState];
        }
      }

      if (item.subItems) {
        const subMenu = this.ui.createMenu(finalLabel);
        this.buildMenu(subMenu, item.subItems, userRole, appState);
        parentMenu.addSubMenu(subMenu);
      } else if (item.isSeparator) {
        parentMenu.addSeparator();
      } else if (item.functionName) {
        parentMenu.addItem(finalLabel, item.functionName);
      }
    });
  }

  /**
   * Determina el rol del usuario actual consultando la base de datos.
   * El rol de OWNER tiene la máxima precedencia.
   * @returns El rol del usuario: 'OWNER', 'ADMIN', o 'PA'.
   */
  private getCurrentUserRole(): 'ADMIN' | 'OWNER' | 'PA' | 'UNDEFINED' {
    const userEmail = Session.getActiveUser().getEmail();
    const owner = SpreadsheetApp.getActiveSpreadsheet().getOwner();
    Logger.log(`Iniciando obtención de rol para el usuario: ${userEmail}`);

    // 1. El propietario del archivo siempre tiene el rol de OWNER.
    if (owner && userEmail === owner.getEmail()) {
      Logger.log(`El usuario ${userEmail} es el propietario del archivo. Asignando rol OWNER.`);
      return 'OWNER';
    }
    Logger.log(`El usuario ${userEmail} no es el propietario. Propietario: ${owner ? owner.getEmail() : 'ninguno'}.`);

    // 2. Consultar la base de datos para otros roles.
    try {
      Logger.log('Consultando la base de datos para obtener el rol...');
      const db = SEDCentralLib.getDB();
      let result = db.selectFrom('Usuario', ['ID_Rol_acceso', 'Nombre_rol_acceso'])
        .where('Email_usuario', '=', userEmail)
        .join('Rol_Acceso') // Asume un join en ID_Rol
        .execute();

      Logger.log(`Resultado de la consulta a la BD: ${JSON.stringify(result)}`);

      if (result.length > 0) {
        const dbRole = (result[0].Nombre_rol_acceso || '').toLowerCase();
        Logger.log(`Rol encontrado en la tabla Usuario: '${dbRole}'`);
        if (dbRole === 'admin' || dbRole === 'soporte') return 'ADMIN';
        if (dbRole === 'pa') return 'PA';
      } else {
        Logger.log(`No se encontró el usuario ${userEmail} en la tabla Usuario. Verificando en Profesional_Acompanamiento.`);
      }

      // Si no se encontró en 'Usuario' o el rol no es reconocido, verificar en 'Profesional_Acompanamiento'
      const paResult = db.selectFrom('Profesional_Acompanamiento', ['ID_Profesional_Acompanamiento', 'Email_profesional_acompanamiento'])
        .where('Email_profesional_acompanamiento', '=', userEmail)
        .execute();

      if (paResult.length > 0) {
          Logger.log(`El usuario ${userEmail} existe en la tabla profesional_acompañamiento. Asignando rol PA.`);
          return 'PA';
      } else {
          Logger.log(`El usuario ${userEmail} no existe en la tabla Profesional_Acompanamiento.`);

          return 'UNDEFINED';
      }
    } catch (e: any) {
      const error = e;
      Logger.log(`Error al consultar el rol del usuario: ${error.message}. Se asignará el rol por defecto. Stack: ${error.stack}`);
      // Si hay un error (ej. la BD no es accesible), se asigna el rol más restrictivo.
    }

    // Si no es OWNER y no se encontró en ninguna tabla, el rol es UNDEFINED.
    return 'UNDEFINED';
  }

  /**
   * Obtiene el estado actual de la aplicación.
   * @returns Un objeto que representa el estado.
   */
  private getApplicationState(): { [key: string]: string } {
    const jornadaStatus = PropertiesService.getDocumentProperties().getProperty(appConfig.properties.JORNADA_STATUS_KEY) || 'NO_INICIADA';
    return {
      jornadaStatus: jornadaStatus,
    };
  }
}

function getMenuService(): MenuService {
  return MenuService.getInstance();
}
