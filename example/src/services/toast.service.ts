import { createSignal } from 'solid-js';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  actions?: ToastAction[];
  persistent?: boolean;
}

export interface ToastAction {
  label: string;
  handler: () => void;
  style?: 'primary' | 'secondary';
}

class ToastService {
  private toastsSignal = createSignal<Toast[]>([]);
  private toasts = this.toastsSignal[0];
  private setToasts = this.toastsSignal[1];
  private nextId = 1;

  public getToasts = () => this.toasts();

  public show(toast: Omit<Toast, 'id'>): string {
    const id = `toast-${this.nextId++}`;
    const duration = toast.duration ?? (toast.persistent ? 0 : this.getDefaultDuration(toast.type));

    const newToast: Toast = {
      ...toast,
      id,
      duration
    };

    this.setToasts(prev => [...prev, newToast]);

    // Track toast display could be added to analytics events if needed

    // Auto-dismiss if not persistent
    if (!toast.persistent && duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  public success(title: string, message?: string, options?: Partial<Toast>): string {
    return this.show({
      type: 'success',
      title,
      message,
      ...options
    });
  }

  public error(title: string, message?: string, options?: Partial<Toast>): string {
    return this.show({
      type: 'error',
      title,
      message,
      duration: 8000, // Longer duration for errors
      ...options
    });
  }

  public warning(title: string, message?: string, options?: Partial<Toast>): string {
    return this.show({
      type: 'warning',
      title,
      message,
      duration: 6000,
      ...options
    });
  }

  public info(title: string, message?: string, options?: Partial<Toast>): string {
    return this.show({
      type: 'info',
      title,
      message,
      ...options
    });
  }

  public dismiss(id: string): void {
    this.setToasts(prev => prev.filter(toast => toast.id !== id));

  }

  public dismissAll(): void {
    const count = this.toasts().length;
    this.setToasts([]);

  }

  public dismissByType(type: ToastType): void {
    const toastsToDismiss = this.toasts().filter(toast => toast.type === type);
    this.setToasts(prev => prev.filter(toast => toast.type !== type));

  }

  private getDefaultDuration(type: ToastType): number {
    switch (type) {
      case 'success':
        return 4000;
      case 'info':
        return 5000;
      case 'warning':
        return 6000;
      case 'error':
        return 8000;
      default:
        return 5000;
    }
  }

  // Utility methods for common scenarios
  public showProjectCreated(projectName: string): string {
    return this.success(
      'Проект создан',
      `Проект "${projectName}" успешно создан`,
      {
        actions: [{
          label: 'Открыть',
          handler: () => {
            // Navigation will be handled by the caller
          }
        }]
      }
    );
  }

  public showProjectDeleted(projectName: string): string {
    return this.success(
      'Проект удален',
      `Проект "${projectName}" успешно удален`
    );
  }

  public showProjectError(action: string, error?: string): string {
    return this.error(
      `Ошибка ${action}`,
      error || 'Произошла неожиданная ошибка. Попробуйте еще раз.',
      {
        actions: [{
          label: 'Повторить',
          handler: () => {
            // Retry logic will be handled by the caller
          }
        }]
      }
    );
  }

  public showNetworkError(): string {
    return this.error(
      'Проблемы с подключением',
      'Проверьте интернет-соединение и попробуйте снова',
      {
        persistent: true,
        actions: [{
          label: 'Повторить',
          handler: () => window.location.reload()
        }]
      }
    );
  }

  public showMaintenanceMode(): string {
    return this.warning(
      'Технические работы',
      'Некоторые функции могут быть временно недоступны',
      {
        persistent: true
      }
    );
  }
}

export const toastService = new ToastService();
export default toastService;