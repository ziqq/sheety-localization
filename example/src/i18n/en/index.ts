import type { BaseTranslation } from '../i18n-types';

const en = {
  // App
  app: {
    title: 'Aplication title',
    description: 'Example app with i18n support',
    language: 'Language',
  },

  // Navigation
  nav: {
    home: 'Home',
    projects: 'Projects',
    logout: 'Logout',
    userMenu: 'User menu',
  },

  // Authentication
  auth: {
    loginWithGoogle: 'Sign in with Google',
    logout: 'Sign out',
    currentUser: 'Current user: {user:string}',
    signOut: 'Sign out from account',
  },

  // Projects
  projects: {
    title: 'My Projects',
    count: '{count} projects',
    empty: {
      title: "You don't have any projects yet",
      description: 'Create your first project to work with icons',
      createFirst: 'Create first project',
    },
    loading: 'Loading projects...',
    loadError: 'Failed to load projects',
    create: 'Create project',
    created: 'Project created',
    createdMessage: 'Project "{name:string}" created successfully',
    createError: 'Error creating project',
    createErrorMessage: 'Failed to create project. Please try again.',
    open: 'Open project',
    pin: 'Pin',
    unpin: 'Unpin',
    pinned: 'Project pinned',
    delete: 'Delete project',
    leave: 'Leave project',
    menu: 'Project menu',
    role: {
      owner: 'Owner',
      admin: 'Administrator',
      editor: 'Editor',
      viewer: 'Viewer',
    },
    notifications: '{count:number} unread notifications',
  },

  // Project actions
  actions: {
    delete: {
      title: 'Delete project',
      message: 'Are you sure you want to delete the project "{name:string}"? This action cannot be undone.',
      confirm: 'Delete',
    },
    leave: {
      title: 'Leave project',
      message: 'Are you sure you want to leave the project "{name:string}"? You will lose access to the project.',
      confirm: 'Leave',
    },
    cancel: 'Cancel',
  },

  // Forms
  forms: {
    projectName: 'Project name',
    projectDescription: 'Project description',
    visibility: 'Visibility',
    tags: 'Tags',
    create: 'Create',
    save: 'Save',
    cancel: 'Cancel',
  },

  // Icons
  icons: {
    upload: 'Upload icons',
    delete: 'Delete icon',
    edit: 'Edit icon',
    download: 'Download',
    share: 'Share',
    copy: 'Copy',
  },

  // Export
  export: {
    title: 'Export',
    formats: 'Export formats',
    download: 'Download',
  },

  // Languages
  languages: {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    pt: 'Portuguese',
    ru: 'Russian',
  },

  // Settings
  settings: {
    title: 'Settings',
    appearance: {
      title: 'Appearance',
      language: {
        title: 'Interface Language',
        description: 'Choose the language for displaying the application interface',
      },
    },
    account: {
      title: 'Account',
      user: 'User',
      signOut: {
        title: 'Sign out from account',
        description: 'End current session and return to login screen',
        button: 'Sign out',
      },
    },
    about: {
      title: 'About',
      appName: 'Foxic',
      appDescription: 'Icon font generator for your projects',
      version: 'Version',
    },
  },

  // Common
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Information',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    settings: 'Settings',
    help: 'Help',
    more: 'More',
    retry: 'Try again',
  },

  // Home page
  home: {
    appTitle: 'Foxic',
    appDescription: 'Icon font generator',
    myProjects: 'My Projects',
    projectsCount: '{count:number} project',
    projectsCountMany: '{count:number} projects',
    userMenu: 'User menu',
    currentUser: 'Current user: {user:string}',
    openSettings: 'Open settings',
  },

  // PWA
  pwa: {
    info: 'Show Progressive Web App information',
    status: 'PWA Status',
    installed: 'PWA installed',
    serviceWorker: 'Service Worker',
    online: 'Online',
    cache: 'Cache',
    statusAlert: 'PWA Status:',
  },

  // Tooltips
  tooltips: {
    // User actions
    userAvatar: 'User profile',
    signOut: 'Sign out from account',

    // Project actions
    createProject: 'Create new project',
    openProject: 'Open project',
    pinProject: 'Pin project',
    unpinProject: 'Unpin project',
    deleteProject: 'Delete project',
    leaveProject: 'Leave project',
    projectMenu: 'Project menu',

    // Icon actions
    uploadIcons: 'Upload new icons',
    deleteIcon: 'Delete icon',
    editIcon: 'Edit icon',
    downloadIcon: 'Download icon',
    copyIcon: 'Copy icon',

    // Export actions
    exportProject: 'Export project',
    downloadFont: 'Download font',
    copyCSS: 'Copy CSS code',

    // Navigation
    goHome: 'Go to home page',
    goBack: 'Go back',
    openSettings: 'Open settings',
    toggleTheme: 'Toggle theme',

    // Common UI
    search: 'Search projects and icons',
    filter: 'Filter results',
    sort: 'Sort',
    close: 'Close',
    help: 'Help and support',
    more: 'More actions',
  },

  // Accessibility
  a11y: {
    skipToContent: 'Skip to content',
    mainContent: 'Main content',
    navigation: 'Navigation',
    applicationLandmark: 'Foxic - Icon font generator',
    projectGrid: 'Projects grid',
    projectRole: 'Your role in project: {role:string}',
    loadingProjects: 'Loading projects',
    emptyProjects: 'No projects available',
    menuExpanded: 'Menu expanded',
    menuCollapsed: 'Menu collapsed',
  },

  // Footer
  footer: {
    madeBy: 'Made by',
    version: 'Version',
  },

  // Errors
  errors: {
    generic: 'An error occurred',
    network: 'Network error',
    unauthorized: 'Unauthorized',
    notFound: 'Not found',
    projectNotFound: 'Project not found',
    insufficientPermissions: 'Insufficient permissions',
    onlyOwnerCanDelete: 'Only the owner can delete the project',
  },
} satisfies BaseTranslation;

export default en;
