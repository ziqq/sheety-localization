import type { BaseTranslation } from '../i18n-types'

const pt = {
  app: {
    title: 'Foxic',
    description: 'Gerador de fontes de ícones',
  },
  nav: {
    home: 'Início',
    projects: 'Projetos',
    logout: 'Sair',
    userMenu: 'Menu do usuário',
  },
  auth: {
    loginWithGoogle: 'Entrar com Google',
    logout: 'Sair',
    currentUser: 'Usuário atual: {user}',
    signOut: 'Sair da conta',
  },
  projects: {
    title: 'Meus Projetos',
    count: '{count} projetos' as any,
    empty: {
      title: 'Você ainda não tem projetos',
      description: 'Crie seu primeiro projeto para trabalhar com ícones',
      createFirst: 'Criar primeiro projeto',
    },
    loading: 'Carregando projetos...',
    create: 'Criar projeto',
    open: 'Abrir projeto',
    pin: 'Fixar',
    unpin: 'Desfixar',
    pinned: 'Projeto fixado',
    delete: 'Excluir projeto',
    leave: 'Sair do projeto',
    menu: 'Menu do projeto',
    role: {
      owner: 'Proprietário',
      admin: 'Administrador',
      editor: 'Editor',
      viewer: 'Visualizador',
    },
    notifications: '{count} notificações não lidas',
  },
  actions: {
    delete: {
      title: 'Excluir projeto',
      message: 'Tem certeza de que deseja excluir o projeto "{name}"? Esta ação não pode ser desfeita.',
      confirm: 'Excluir',
    },
    leave: {
      title: 'Sair do projeto',
      message: 'Tem certeza de que deseja sair do projeto "{name}"? Você perderá o acesso ao projeto.',
      confirm: 'Sair',
    },
    cancel: 'Cancelar',
  },
  forms: {
    projectName: 'Nome do projeto',
    projectDescription: 'Descrição do projeto',
    visibility: 'Visibilidade',
    tags: 'Tags',
    create: 'Criar',
    save: 'Salvar',
    cancel: 'Cancelar',
  },
  icons: {
    upload: 'Enviar ícones',
    delete: 'Excluir ícone',
    edit: 'Editar ícone',
    download: 'Baixar',
    share: 'Compartilhar',
    copy: 'Copiar',
  },
  export: {
    title: 'Exportar',
    formats: 'Formatos de exportação',
    download: 'Baixar',
  },
  languages: {
    en: 'Inglês',
    es: 'Espanhol',
    fr: 'Francês',
    de: 'Alemão',
    pt: 'Português',
    ru: 'Russo',
  },
  settings: {
    title: 'Configurações',
    appearance: {
      title: 'Aparência',
      language: {
        title: 'Idioma da interface',
        description: 'Escolha o idioma para exibir a interface da aplicação'
      }
    },
    account: {
      title: 'Conta',
      user: 'Usuário',
      signOut: {
        title: 'Sair da conta',
        description: 'Encerrar a sessão atual e retornar à tela de login',
        button: 'Sair'
      }
    },
    about: {
      title: 'Sobre',
      appName: 'Foxic',
      appDescription: 'Gerador de fontes de ícones para seus projetos',
      version: 'Versão'
    }
  },

  common: {
    loading: 'Carregando...',
    error: 'Erro',
    success: 'Sucesso',
    warning: 'Aviso',
    info: 'Informação',
    close: 'Fechar',
    back: 'Voltar',
    next: 'Próximo',
    search: 'Pesquisar',
    filter: 'Filtrar',
    sort: 'Classificar',
    settings: 'Configurações',
    help: 'Ajuda',
    more: 'Mais',
    retry: 'Tentar novamente',
  },

  home: {
    appTitle: 'Foxic',
    appDescription: 'Gerador de fontes de ícones',
    myProjects: 'Meus Projetos',
    projectsCount: '{count} projeto',
    projectsCountMany: '{count} projetos',
    userMenu: 'Menu do usuário',
    currentUser: 'Usuário atual: {user}',
    openSettings: 'Abrir configurações',
  },
  pwa: {
    info: 'Mostrar informações do Progressive Web App',
    status: 'Status PWA',
    installed: 'PWA instalado',
    serviceWorker: 'Service Worker',
    online: 'Online',
    cache: 'Cache',
    statusAlert: 'Status PWA:',
  },
  a11y: {
    skipToContent: 'Pular para o conteúdo',
    mainContent: 'Conteúdo principal',
    navigation: 'Navegação',
    applicationLandmark: 'Foxic - Gerador de fontes de ícones',
    projectGrid: 'Grade de projetos',
    projectRole: 'Seu papel no projeto: {role}',
    loadingProjects: 'Carregando projetos',
    emptyProjects: 'Nenhum projeto disponível',
    menuExpanded: 'Menu expandido',
    menuCollapsed: 'Menu recolhido',
  },
  tooltips: {
    // User actions
    userAvatar: 'Perfil do usuário',
    signOut: 'Sair da conta',

    // Project actions
    createProject: 'Criar novo projeto',
    openProject: 'Abrir projeto',
    pinProject: 'Fixar projeto',
    unpinProject: 'Desfixar projeto',
    deleteProject: 'Excluir projeto',
    leaveProject: 'Sair do projeto',
    projectMenu: 'Menu do projeto',

    // Icon actions
    uploadIcons: 'Enviar novos ícones',
    deleteIcon: 'Excluir ícone',
    editIcon: 'Editar ícone',
    downloadIcon: 'Baixar ícone',
    copyIcon: 'Copiar ícone',

    // Export actions
    exportProject: 'Exportar projeto',
    downloadFont: 'Baixar fonte',
    copyCSS: 'Copiar código CSS',

    // Navigation
    goHome: 'Ir para página inicial',
    goBack: 'Voltar',
    openSettings: 'Abrir configurações',
    toggleTheme: 'Alternar tema',

    // Common UI
    search: 'Pesquisar projetos e ícones',
    filter: 'Filtrar resultados',
    sort: 'Ordenar',
    close: 'Fechar',
    help: 'Ajuda e suporte',
    more: 'Mais ações',
  },

  footer: {
    madeBy: 'Criado por',
    version: 'Versão',
  },

  errors: {
    generic: 'Ocorreu um erro',
    network: 'Erro de rede',
    unauthorized: 'Não autorizado',
    notFound: 'Não encontrado',
    projectNotFound: 'Projeto não encontrado',
    insufficientPermissions: 'Permissões insuficientes',
    onlyOwnerCanDelete: 'Apenas o proprietário pode excluir o projeto',
  },
} satisfies BaseTranslation

export default pt