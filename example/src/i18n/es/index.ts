import type { BaseTranslation } from '../i18n-types'

const es = {
  app: {
    title: 'Foxic',
    description: 'Generador de fuentes de iconos',
  },
  nav: {
    home: 'Inicio',
    projects: 'Proyectos',
    logout: 'Cerrar sesión',
    userMenu: 'Menú de usuario',
  },
  auth: {
    loginWithGoogle: 'Iniciar sesión con Google',
    logout: 'Cerrar sesión',
    currentUser: 'Usuario actual: {user}',
    signOut: 'Cerrar sesión de la cuenta',
  },
  projects: {
    title: 'Mis Proyectos',
    count: '{count} proyectos' as any,
    empty: {
      title: 'Aún no tienes proyectos',
      description: 'Crea tu primer proyecto para trabajar con iconos',
      createFirst: 'Crear primer proyecto',
    },
    loading: 'Cargando proyectos...',
    create: 'Crear proyecto',
    open: 'Abrir proyecto',
    pin: 'Fijar',
    unpin: 'Desfijar',
    pinned: 'Proyecto fijado',
    delete: 'Eliminar proyecto',
    leave: 'Abandonar proyecto',
    menu: 'Menú del proyecto',
    role: {
      owner: 'Propietario',
      admin: 'Administrador',
      editor: 'Editor',
      viewer: 'Observador',
    },
    notifications: '{count} notificaciones no leídas',
  },
  actions: {
    delete: {
      title: 'Eliminar proyecto',
      message: '¿Estás seguro de que quieres eliminar el proyecto "{name}"? Esta acción no se puede deshacer.',
      confirm: 'Eliminar',
    },
    leave: {
      title: 'Abandonar proyecto',
      message: '¿Estás seguro de que quieres abandonar el proyecto "{name}"? Perderás el acceso al proyecto.',
      confirm: 'Abandonar',
    },
    cancel: 'Cancelar',
  },
  forms: {
    projectName: 'Nombre del proyecto',
    projectDescription: 'Descripción del proyecto',
    visibility: 'Visibilidad',
    tags: 'Etiquetas',
    create: 'Crear',
    save: 'Guardar',
    cancel: 'Cancelar',
  },
  icons: {
    upload: 'Subir iconos',
    delete: 'Eliminar icono',
    edit: 'Editar icono',
    download: 'Descargar',
    share: 'Compartir',
    copy: 'Copiar',
  },
  export: {
    title: 'Exportar',
    formats: 'Formatos de exportación',
    download: 'Descargar',
  },
  languages: {
    en: 'Inglés',
    es: 'Español',
    fr: 'Francés',
    de: 'Alemán',
    pt: 'Portugués',
    ru: 'Ruso',
  },
  settings: {
    title: 'Configuración',
    appearance: {
      title: 'Apariencia',
      language: {
        title: 'Idioma de la interfaz',
        description: 'Elige el idioma para mostrar la interfaz de la aplicación'
      }
    },
    account: {
      title: 'Cuenta',
      user: 'Usuario',
      signOut: {
        title: 'Cerrar sesión de la cuenta',
        description: 'Finalizar la sesión actual y volver a la pantalla de inicio de sesión',
        button: 'Cerrar sesión'
      }
    },
    about: {
      title: 'Acerca de',
      appName: 'Foxic',
      appDescription: 'Generador de fuentes de iconos para tus proyectos',
      version: 'Versión'
    }
  },

  common: {
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    warning: 'Advertencia',
    info: 'Información',
    close: 'Cerrar',
    back: 'Atrás',
    next: 'Siguiente',
    search: 'Buscar',
    filter: 'Filtrar',
    sort: 'Ordenar',
    settings: 'Configuración',
    help: 'Ayuda',
    more: 'Más',
    retry: 'Intentar de nuevo',
  },

  home: {
    appTitle: 'Foxic',
    appDescription: 'Generador de fuentes de iconos',
    myProjects: 'Mis Proyectos',
    projectsCount: '{count} proyecto',
    projectsCountMany: '{count} proyectos',
    userMenu: 'Menú de usuario',
    currentUser: 'Usuario actual: {user}',
    openSettings: 'Abrir configuración',
  },
  pwa: {
    info: 'Mostrar información de Progressive Web App',
    status: 'Estado PWA',
    installed: 'PWA instalado',
    serviceWorker: 'Service Worker',
    online: 'En línea',
    cache: 'Caché',
    statusAlert: 'Estado PWA:',
  },

  tooltips: {
    // User actions
    userAvatar: 'Perfil de usuario',
    signOut: 'Cerrar sesión de la cuenta',

    // Project actions
    createProject: 'Crear nuevo proyecto',
    openProject: 'Abrir proyecto',
    pinProject: 'Fijar proyecto',
    unpinProject: 'Desfijar proyecto',
    deleteProject: 'Eliminar proyecto',
    leaveProject: 'Abandonar proyecto',
    projectMenu: 'Menú del proyecto',

    // Icon actions
    uploadIcons: 'Subir nuevos iconos',
    deleteIcon: 'Eliminar icono',
    editIcon: 'Editar icono',
    downloadIcon: 'Descargar icono',
    copyIcon: 'Copiar icono',

    // Export actions
    exportProject: 'Exportar proyecto',
    downloadFont: 'Descargar fuente',
    copyCSS: 'Copiar código CSS',

    // Navigation
    goHome: 'Ir a la página de inicio',
    goBack: 'Volver atrás',
    openSettings: 'Abrir configuración',
    toggleTheme: 'Cambiar tema',

    // Common UI
    search: 'Buscar proyectos e iconos',
    filter: 'Filtrar resultados',
    sort: 'Ordenar',
    close: 'Cerrar',
    help: 'Ayuda y soporte',
    more: 'Más acciones',
  },
  a11y: {
    skipToContent: 'Saltar al contenido',
    mainContent: 'Contenido principal',
    navigation: 'Navegación',
    applicationLandmark: 'Foxic - Generador de fuentes de iconos',
    projectGrid: 'Cuadrícula de proyectos',
    projectRole: 'Tu rol en el proyecto: {role}',
    loadingProjects: 'Cargando proyectos',
    emptyProjects: 'No hay proyectos disponibles',
    menuExpanded: 'Menú expandido',
    menuCollapsed: 'Menú contraído',
  },
  footer: {
    madeBy: 'Creado por',
    version: 'Versión',
  },

  errors: {
    generic: 'Ocurrió un error',
    network: 'Error de red',
    unauthorized: 'No autorizado',
    notFound: 'No encontrado',
    projectNotFound: 'Proyecto no encontrado',
    insufficientPermissions: 'Permisos insuficientes',
    onlyOwnerCanDelete: 'Solo el propietario puede eliminar el proyecto',
  },
} satisfies BaseTranslation

export default es