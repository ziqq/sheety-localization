// PWA Service - регистрация и управление сервис-воркером
export class PWAService {
  private static instance: PWAService;
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;

  private constructor() {}

  public static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService();
    }
    return PWAService.instance;
  }

  /**
   * Регистрация сервис-воркера
   */
  async register(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.log('🚫 Service Worker не поддерживается');
      return;
    }

    try {
      console.log('🔄 Регистрируем Service Worker...');

      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('✅ Service Worker зарегистрирован:', this.registration.scope);

      // Обработчики событий для обновлений
      this.setupUpdateHandlers();

      // Проверка на обновления
      this.checkForUpdates();

    } catch (error) {
      console.error('❌ Ошибка регистрации Service Worker:', error);
    }
  }

  /**
   * Настройка обработчиков обновлений
   */
  private setupUpdateHandlers(): void {
    if (!this.registration) return;

    // Новый SW установлен и ждет активации
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing;
      if (!newWorker) return;

      console.log('🔄 Найдено обновление Service Worker');

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Новая версия готова к использованию
          this.updateAvailable = true;
          this.notifyUpdateAvailable();
        }
      });
    });

    // Обработка сообщений от SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_UPDATE_READY') {
        this.updateAvailable = true;
        this.notifyUpdateAvailable();
      }
    });

    // Контроллер изменился (новый SW стал активным)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker обновлен, перезагружаем страницу');
      window.location.reload();
    });
  }

  /**
   * Проверка обновлений
   */
  private async checkForUpdates(): Promise<void> {
    if (!this.registration) return;

    try {
      await this.registration.update();
    } catch (error) {
      console.log('Проверка обновлений SW не удалась:', error);
    }
  }

  /**
   * Уведомление о доступном обновлении
   */
  private notifyUpdateAvailable(): void {
    console.log('📢 Доступно обновление приложения');

    // Можно показать уведомление пользователю
    if (window.confirm('Доступно обновление приложения. Обновить сейчас?')) {
      this.applyUpdate();
    }
  }

  /**
   * Применение обновления
   */
  public applyUpdate(): void {
    if (!this.registration || !this.updateAvailable) return;

    const waitingWorker = this.registration.waiting;
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  /**
   * Проверка поддержки PWA
   */
  public isPWASupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * Проверка установки PWA
   */
  public isPWAInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  /**
   * Очистка кэша (для разработки)
   */
  public async clearCache(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('🗑️ Кэш очищен');
    }
  }
}

// Экспорт экземпляра сервиса
export const pwaService = PWAService.getInstance();