import type { BaseTranslation } from '../i18n-types'

const fr = {
  app: {
    title: 'Foxic',
    description: 'Générateur de polices d\'icônes',
  },
  nav: {
    home: 'Accueil',
    projects: 'Projets',
    logout: 'Se déconnecter',
    userMenu: 'Menu utilisateur',
  },
  auth: {
    loginWithGoogle: 'Se connecter avec Google',
    logout: 'Se déconnecter',
    currentUser: 'Utilisateur actuel : {user}',
    signOut: 'Se déconnecter du compte',
  },
  projects: {
    title: 'Mes Projets',
    count: '{count} projets' as any,
    empty: {
      title: 'Vous n\'avez pas encore de projets',
      description: 'Créez votre premier projet pour travailler avec des icônes',
      createFirst: 'Créer le premier projet',
    },
    loading: 'Chargement des projets...',
    create: 'Créer un projet',
    open: 'Ouvrir le projet',
    pin: 'Épingler',
    unpin: 'Désépingler',
    pinned: 'Projet épinglé',
    delete: 'Supprimer le projet',
    leave: 'Quitter le projet',
    menu: 'Menu du projet',
    role: {
      owner: 'Propriétaire',
      admin: 'Administrateur',
      editor: 'Éditeur',
      viewer: 'Observateur',
    },
    notifications: '{count} notifications non lues',
  },
  actions: {
    delete: {
      title: 'Supprimer le projet',
      message: 'Êtes-vous sûr de vouloir supprimer le projet "{name}" ? Cette action ne peut pas être annulée.',
      confirm: 'Supprimer',
    },
    leave: {
      title: 'Quitter le projet',
      message: 'Êtes-vous sûr de vouloir quitter le projet "{name}" ? Vous perdrez l\'accès au projet.',
      confirm: 'Quitter',
    },
    cancel: 'Annuler',
  },
  forms: {
    projectName: 'Nom du projet',
    projectDescription: 'Description du projet',
    visibility: 'Visibilité',
    tags: 'Tags',
    create: 'Créer',
    save: 'Enregistrer',
    cancel: 'Annuler',
  },
  icons: {
    upload: 'Télécharger des icônes',
    delete: 'Supprimer l\'icône',
    edit: 'Modifier l\'icône',
    download: 'Télécharger',
    share: 'Partager',
    copy: 'Copier',
  },
  export: {
    title: 'Exporter',
    formats: 'Formats d\'exportation',
    download: 'Télécharger',
  },
  languages: {
    en: 'Anglais',
    es: 'Espagnol',
    fr: 'Français',
    de: 'Allemand',
    pt: 'Portugais',
    ru: 'Russe',
  },
  settings: {
    title: 'Paramètres',
    appearance: {
      title: 'Apparence',
      language: {
        title: 'Langue de l\'interface',
        description: 'Choisissez la langue d\'affichage de l\'interface de l\'application'
      }
    },
    account: {
      title: 'Compte',
      user: 'Utilisateur',
      signOut: {
        title: 'Se déconnecter du compte',
        description: 'Terminer la session actuelle et retourner à l\'écran de connexion',
        button: 'Se déconnecter'
      }
    },
    about: {
      title: 'À propos',
      appName: 'Foxic',
      appDescription: 'Générateur de polices d\'icônes pour vos projets',
      version: 'Version'
    }
  },

  common: {
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    warning: 'Avertissement',
    info: 'Information',
    close: 'Fermer',
    back: 'Retour',
    next: 'Suivant',
    search: 'Rechercher',
    filter: 'Filtrer',
    sort: 'Trier',
    settings: 'Paramètres',
    help: 'Aide',
    more: 'Plus',
    retry: 'Réessayer',
  },

  home: {
    appTitle: 'Foxic',
    appDescription: 'Générateur de polices d\'icônes',
    myProjects: 'Mes Projets',
    projectsCount: '{count} projet',
    projectsCountMany: '{count} projets',
    userMenu: 'Menu utilisateur',
    currentUser: 'Utilisateur actuel : {user}',
    openSettings: 'Ouvrir les paramètres',
  },
  pwa: {
    info: 'Afficher les informations sur l\'application web progressive',
    status: 'Statut PWA',
    installed: 'PWA installé',
    serviceWorker: 'Service Worker',
    online: 'En ligne',
    cache: 'Cache',
    statusAlert: 'Statut PWA :',
  },
  a11y: {
    skipToContent: 'Aller au contenu',
    mainContent: 'Contenu principal',
    navigation: 'Navigation',
    applicationLandmark: 'Foxic - Générateur de polices d\'icônes',
    projectGrid: 'Grille de projets',
    projectRole: 'Votre rôle dans le projet : {role}',
    loadingProjects: 'Chargement des projets',
    emptyProjects: 'Aucun projet disponible',
    menuExpanded: 'Menu étendu',
    menuCollapsed: 'Menu réduit',
  },
  tooltips: {
    // User actions
    userAvatar: 'Profil utilisateur',
    signOut: 'Se déconnecter du compte',

    // Project actions
    createProject: 'Créer un nouveau projet',
    openProject: 'Ouvrir le projet',
    pinProject: 'Épingler le projet',
    unpinProject: 'Désépingler le projet',
    deleteProject: 'Supprimer le projet',
    leaveProject: 'Quitter le projet',
    projectMenu: 'Menu du projet',

    // Icon actions
    uploadIcons: 'Télécharger de nouvelles icônes',
    deleteIcon: 'Supprimer l\'icône',
    editIcon: 'Modifier l\'icône',
    downloadIcon: 'Télécharger l\'icône',
    copyIcon: 'Copier l\'icône',

    // Export actions
    exportProject: 'Exporter le projet',
    downloadFont: 'Télécharger la police',
    copyCSS: 'Copier le code CSS',

    // Navigation
    goHome: 'Aller à la page d\'accueil',
    goBack: 'Retour',
    openSettings: 'Ouvrir les paramètres',
    toggleTheme: 'Changer le thème',

    // Common UI
    search: 'Rechercher des projets et icônes',
    filter: 'Filtrer les résultats',
    sort: 'Trier',
    close: 'Fermer',
    help: 'Aide et support',
    more: 'Plus d\'actions',
  },

  footer: {
    madeBy: 'Créé par',
    version: 'Version',
  },

  errors: {
    generic: 'Une erreur s\'est produite',
    network: 'Erreur réseau',
    unauthorized: 'Non autorisé',
    notFound: 'Non trouvé',
    projectNotFound: 'Projet non trouvé',
    insufficientPermissions: 'Permissions insuffisantes',
    onlyOwnerCanDelete: 'Seul le propriétaire peut supprimer le projet',
  },
} satisfies BaseTranslation

export default fr