import type { BaseTranslation } from '../i18n-types'

const de = {
  app: {
    title: 'Foxic',
    description: 'Icon-Schriftart-Generator',
  },
  nav: {
    home: 'Startseite',
    projects: 'Projekte',
    logout: 'Abmelden',
    userMenu: 'Benutzermenü',
  },
  auth: {
    loginWithGoogle: 'Mit Google anmelden',
    logout: 'Abmelden',
    currentUser: 'Aktueller Benutzer: {user}',
    signOut: 'Vom Konto abmelden',
  },
  projects: {
    title: 'Meine Projekte',
    count: '{count} Projekte' as any,
    empty: {
      title: 'Sie haben noch keine Projekte',
      description: 'Erstellen Sie Ihr erstes Projekt, um mit Icons zu arbeiten',
      createFirst: 'Erstes Projekt erstellen',
    },
    loading: 'Projekte laden...',
    create: 'Projekt erstellen',
    open: 'Projekt öffnen',
    pin: 'Anheften',
    unpin: 'Lösen',
    pinned: 'Projekt angeheftet',
    delete: 'Projekt löschen',
    leave: 'Projekt verlassen',
    menu: 'Projektmenü',
    role: {
      owner: 'Eigentümer',
      admin: 'Administrator',
      editor: 'Bearbeiter',
      viewer: 'Betrachter',
    },
    notifications: '{count} ungelesene Benachrichtigungen',
  },
  actions: {
    delete: {
      title: 'Projekt löschen',
      message: 'Sind Sie sicher, dass Sie das Projekt "{name}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
      confirm: 'Löschen',
    },
    leave: {
      title: 'Projekt verlassen',
      message: 'Sind Sie sicher, dass Sie das Projekt "{name}" verlassen möchten? Sie verlieren den Zugang zum Projekt.',
      confirm: 'Verlassen',
    },
    cancel: 'Abbrechen',
  },
  forms: {
    projectName: 'Projektname',
    projectDescription: 'Projektbeschreibung',
    visibility: 'Sichtbarkeit',
    tags: 'Tags',
    create: 'Erstellen',
    save: 'Speichern',
    cancel: 'Abbrechen',
  },
  icons: {
    upload: 'Icons hochladen',
    delete: 'Icon löschen',
    edit: 'Icon bearbeiten',
    download: 'Herunterladen',
    share: 'Teilen',
    copy: 'Kopieren',
  },
  export: {
    title: 'Exportieren',
    formats: 'Exportformate',
    download: 'Herunterladen',
  },
  languages: {
    en: 'Englisch',
    es: 'Spanisch',
    fr: 'Französisch',
    de: 'Deutsch',
    pt: 'Portugiesisch',
    ru: 'Russisch',
  },
  settings: {
    title: 'Einstellungen',
    appearance: {
      title: 'Aussehen',
      language: {
        title: 'Sprache der Benutzeroberfläche',
        description: 'Wählen Sie die Sprache für die Anzeige der Anwendungsoberfläche'
      }
    },
    account: {
      title: 'Konto',
      user: 'Benutzer',
      signOut: {
        title: 'Vom Konto abmelden',
        description: 'Aktuelle Sitzung beenden und zum Anmeldebildschirm zurückkehren',
        button: 'Abmelden'
      }
    },
    about: {
      title: 'Über',
      appName: 'Foxic',
      appDescription: 'Icon-Schriftart-Generator für Ihre Projekte',
      version: 'Version'
    }
  },

  common: {
    loading: 'Lädt...',
    error: 'Fehler',
    success: 'Erfolg',
    warning: 'Warnung',
    info: 'Information',
    close: 'Schließen',
    back: 'Zurück',
    next: 'Weiter',
    search: 'Suchen',
    filter: 'Filtern',
    sort: 'Sortieren',
    settings: 'Einstellungen',
    help: 'Hilfe',
    more: 'Mehr',
    retry: 'Erneut versuchen',
  },

  home: {
    appTitle: 'Foxic',
    appDescription: 'Icon-Schriftart-Generator',
    myProjects: 'Meine Projekte',
    projectsCount: '{count} Projekt',
    projectsCountMany: '{count} Projekte',
    userMenu: 'Benutzermenü',
    currentUser: 'Aktueller Benutzer: {user}',
    openSettings: 'Einstellungen öffnen',
  },
  pwa: {
    info: 'Progressive Web App-Informationen anzeigen',
    status: 'PWA-Status',
    installed: 'PWA installiert',
    serviceWorker: 'Service Worker',
    online: 'Online',
    cache: 'Cache',
    statusAlert: 'PWA-Status:',
  },
  a11y: {
    skipToContent: 'Zum Inhalt springen',
    mainContent: 'Hauptinhalt',
    navigation: 'Navigation',
    applicationLandmark: 'Foxic - Icon-Schriftart-Generator',
    projectGrid: 'Projektraster',
    projectRole: 'Ihre Rolle im Projekt: {role}',
    loadingProjects: 'Projekte laden',
    emptyProjects: 'Keine Projekte verfügbar',
    menuExpanded: 'Menü erweitert',
    menuCollapsed: 'Menü eingeklappt',
  },
  tooltips: {
    // User actions
    userAvatar: 'Benutzerprofil',
    signOut: 'Vom Konto abmelden',

    // Project actions
    createProject: 'Neues Projekt erstellen',
    openProject: 'Projekt öffnen',
    pinProject: 'Projekt anheften',
    unpinProject: 'Projekt lösen',
    deleteProject: 'Projekt löschen',
    leaveProject: 'Projekt verlassen',
    projectMenu: 'Projektmenü',

    // Icon actions
    uploadIcons: 'Neue Icons hochladen',
    deleteIcon: 'Icon löschen',
    editIcon: 'Icon bearbeiten',
    downloadIcon: 'Icon herunterladen',
    copyIcon: 'Icon kopieren',

    // Export actions
    exportProject: 'Projekt exportieren',
    downloadFont: 'Schriftart herunterladen',
    copyCSS: 'CSS-Code kopieren',

    // Navigation
    goHome: 'Zur Startseite gehen',
    goBack: 'Zurück gehen',
    openSettings: 'Einstellungen öffnen',
    toggleTheme: 'Design wechseln',

    // Common UI
    search: 'Projekte und Icons durchsuchen',
    filter: 'Ergebnisse filtern',
    sort: 'Sortieren',
    close: 'Schließen',
    help: 'Hilfe und Support',
    more: 'Weitere Aktionen',
  },

  footer: {
    madeBy: 'Erstellt von',
    version: 'Version',
  },

  errors: {
    generic: 'Ein Fehler ist aufgetreten',
    network: 'Netzwerkfehler',
    unauthorized: 'Nicht autorisiert',
    notFound: 'Nicht gefunden',
    projectNotFound: 'Projekt nicht gefunden',
    insufficientPermissions: 'Unzureichende Berechtigungen',
    onlyOwnerCanDelete: 'Nur der Eigentümer kann das Projekt löschen',
  },
} satisfies BaseTranslation

export default de