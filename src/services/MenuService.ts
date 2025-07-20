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
  private appState: { [key: string]: string } | null = null;
  static instance: MenuService;

  constructor() {
    this.ui = SpreadsheetApp.getUi();
    this.userRole = this.getCurrentUserRole();
    Logger.log(`Rol del usuario: ${this.userRole}`);
  }

  public static getInstance(): MenuService {
    if (!MenuService.instance) {
      MenuService.instance = new MenuService();
    }
    return MenuService.instance;
  }

  /**
   * [NUEVO MÉTODO] Refresca el estado de la aplicación leyendo desde PropertiesService.
   * Este método DEBE ser llamado antes de cualquier operación que dependa del estado.
   */
  public refreshApplicationState(): void {
    const props = PropertiesService.getScriptProperties();
    const fileId = SpreadsheetApp.getActiveSpreadsheet().getId();
    const fileType = getJornadaRepository().getFileTypeById(fileId);

    const status: EstadoJornada = (props.getProperty(appConfig.properties.JORNADA_STATUS_KEY) || 'No Iniciada') as EstadoJornada;
    const numero = props.getProperty(appConfig.properties.JORNADA_NUMERO_KEY) || 'N/A';
    const isDirty = props.getProperty(appConfig.properties.JORNADA_IS_DIRTY_KEY) === 'true';

    this.appState = {
      fileType: fileType,
      jornadaStatus: status,
      numeroJornada: numero,
      isDirty: String(isDirty),
      dirtyMark: isDirty ? ' ❌ ' : ''
    };
    Logger.log(`Estado de la aplicación refrescado: ${JSON.stringify(this.appState)}`);
  }

  /**
   * Crea y muestra el menú principal de la aplicación basado en la configuración y el rol del usuario.
   */
  public createDynamicMenu(): void {
    this.refreshApplicationState();
    const topMenuConfig = menuConfig[0];
    const menu = this.ui.createMenu(topMenuConfig.label);

    if (topMenuConfig.subItems && this.appState) {
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
    appState: { [key: string]: string } | null
  ): void {
    Logger.log(`Construyendo menú para el rol: ${userRole} con estado: ${JSON.stringify(appState)}`);
    Logger.log(`Elementos del menú: ${JSON.stringify(items)}`);
    items.forEach(item => {
      if (!item.roles.includes(userRole as any)) {
        return;
      }
      // 2. Si el ítem especifica tipos de archivo, filtramos por el estado actual.
      if (appState && item.fileTypes && !item.fileTypes.includes(appState.fileType as any)) {
        return; // Si el tipo de archivo actual no está en la lista permitida, saltar.
      }

      let finalLabel = item.icon ? `${item.icon} ${item.label}` : item.label;
      if (item.labelStates && appState) {
        // Lógica existente para estados simples
        const currentState = appState[item.labelStates.stateKey];
        if (currentState && item.labelStates.states[currentState]) {
          finalLabel = item.icon ? `${item.icon} ${item.labelStates.states[currentState]}` : item.labelStates.states[currentState];
        }
      } else if (item.dynamicLabel && appState) {
        // ¡NUEVA LÓGICA para etiquetas complejas!
        let tempLabel = item.dynamicLabel.template;
        // Reemplazar cada placeholder con el valor del estado
        for (const placeholder in item.dynamicLabel.keys) {
          const stateKey = item.dynamicLabel.keys[placeholder];
          const value = appState[stateKey] || '';
          tempLabel = tempLabel.replace(`{${placeholder}}`, value);
        }
        finalLabel = tempLabel;
      }

      if (item.subItems) {
        // 3. ANTES de crear el submenú, verificar si tendrá contenido.
        const visibleSubItems = item.subItems.filter(subItem =>
          subItem.roles.includes(userRole as any)
        );

        // 4. SOLO si hay sub-ítems visibles para este rol, crear y poblar el submenú.
        if (visibleSubItems.length > 0) {
          const subMenu = this.ui.createMenu(finalLabel);
          // Llamar a la recursión solo con los ítems visibles.
          this.buildMenu(subMenu, visibleSubItems, userRole, appState);
          parentMenu.addSubMenu(subMenu);
        }
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
    // const userEmail = Session.getActiveUser().getEmail();
    const userEmail = PropertiesService.getScriptProperties().getProperty(appConfig.properties.USER_EMAIL_KEY) || '';;
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
