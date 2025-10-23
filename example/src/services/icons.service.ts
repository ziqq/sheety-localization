import { SHA256 } from 'crypto-js';
import { unzip, zip } from 'fflate';
import { Bytes, doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';

// Интерфейсы согласно FIRESTORE.md
export interface IconMetadata {
  size: number;
  hash: string;
  tags: string[];
}

export interface ArchiveManifest {
  rev: number;
  hash: string;
  count: number;
  totalSize: number;
  compression: number;
  icons: Record<string, IconMetadata>;
  createdAt: string;
}

export interface IconsArchive {
  archive: Bytes;
  updatedBy: string;
  updatedAt: Date;
}

export interface IconData {
  name: string;
  content: string;
  hash: string;
  size: number;
  tags: string[];
}

interface ArchiveContents {
  manifest: ArchiveManifest;
  icons: Record<string, string>; // name -> svg content
}

class IconsService {
  private static readonly MAX_ARCHIVE_SIZE = 1_000_000; // 1MB limit согласно FIRESTORE.md

  /**
   * Создает хеш для SVG контента
   */
  private createIconHash(content: string): string {
    return SHA256(content).toString();
  }

  /**
   * Создает хеш для всех иконок (отсортированных по имени для детерминированности)
   */
  private createIconsHash(icons: Record<string, IconData>): string {
    const sortedIcons = Object.keys(icons)
      .sort()
      .map(name => `${name}:${icons[name].hash}`)
      .join('|');
    return SHA256(sortedIcons).toString();
  }

  /**
   * Проверяет размер архива
   */
  private validateArchiveSize(compressedData: Uint8Array): void {
    if (compressedData.length > IconsService.MAX_ARCHIVE_SIZE) {
      throw new Error(
        `Размер архива ${compressedData.length} байт превышает лимит Firestore в ${IconsService.MAX_ARCHIVE_SIZE} байт`
      );
    }
  }

  /**
   * Сжимает иконки в архив с манифестом
   */
  async compressIcons(icons: Record<string, IconData>): Promise<Uint8Array> {
    const manifest: ArchiveManifest = {
      rev: 1,
      hash: this.createIconsHash(icons),
      count: Object.keys(icons).length,
      totalSize: Object.values(icons).reduce((sum, icon) => sum + icon.size, 0),
      compression: 0, // будет рассчитан после сжатия
      icons: Object.fromEntries(
        Object.entries(icons).map(([name, icon]) => [
          name,
          {
            size: icon.size,
            hash: icon.hash,
            tags: icon.tags
          }
        ])
      ),
      createdAt: new Date().toISOString()
    };

    // Создаем файлы для архива
    const files: Record<string, Uint8Array> = {};

    // Добавляем манифест
    files['manifest.json'] = new TextEncoder().encode(JSON.stringify(manifest, null, 2));

    // Добавляем SVG файлы
    Object.entries(icons).forEach(([name, icon]) => {
      files[`icons/${name}.svg`] = new TextEncoder().encode(icon.content);
    });

    return new Promise((resolve, reject) => {
      zip(files, { level: 9 }, (err: Error | null, data: Uint8Array) => {
        if (err) {
          reject(new Error(`Ошибка сжатия архива: ${err.message}`));
          return;
        }

        try {
          // Проверяем размер сжатого архива
          this.validateArchiveSize(data);

          // Обновляем коэффициент сжатия в архиве
          const compressionRatio = data.length / manifest.totalSize;

          // Пересоздаем манифест с правильным коэффициентом сжатия
          const updatedManifest = { ...manifest, compression: compressionRatio };
          const newFiles = { ...files };
          newFiles['manifest.json'] = new TextEncoder().encode(JSON.stringify(updatedManifest, null, 2));

          // Сжимаем повторно с обновленным манифестом
          zip(newFiles, { level: 9 }, (err2: Error | null, finalData: Uint8Array) => {
            if (err2) {
              reject(new Error(`Ошибка пересжатия архива: ${err2.message}`));
              return;
            }

            this.validateArchiveSize(finalData);
            resolve(finalData);
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Распаковывает архив иконок
   */
  async decompressIcons(compressedData: Uint8Array): Promise<ArchiveContents> {
    return new Promise((resolve, reject) => {
      unzip(compressedData, (err: Error | null, data: Record<string, Uint8Array>) => {
        if (err) {
          reject(new Error(`Ошибка распаковки архива: ${err.message}`));
          return;
        }

        try {
          // Читаем манифест
          const manifestData = data['manifest.json'];
          if (!manifestData) {
            throw new Error('Манифест не найден в архиве');
          }

          const manifest: ArchiveManifest = JSON.parse(new TextDecoder().decode(manifestData));

          // Читаем иконки
          const icons: Record<string, string> = {};
          Object.keys(manifest.icons).forEach(iconName => {
            const iconData = data[`icons/${iconName}.svg`];
            if (iconData) {
              icons[iconName] = new TextDecoder().decode(iconData);
            }
          });

          resolve({ manifest, icons });
        } catch (error) {
          reject(new Error(`Ошибка обработки архива: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });
    });
  }

  /**
   * Создает данные иконки из SVG контента
   */
  createIconData(name: string, content: string, tags: string[] = []): IconData {
    // Очищаем имя от расширения если оно есть
    const cleanName = name.replace(/\.svg$/i, '');

    return {
      name: cleanName,
      content: content.trim(),
      hash: this.createIconHash(content),
      size: new TextEncoder().encode(content).length,
      tags
    };
  }

  /**
   * Загружает архив иконок из Firestore
   */
  async loadProjectIcons(projectId: string): Promise<ArchiveContents | null> {
    try {
      const archiveRef = doc(firestore, 'projects', projectId, 'data', 'icons');
      const archiveDoc = await getDoc(archiveRef);

      if (!archiveDoc.exists()) {
        return null;
      }

      const archiveData = archiveDoc.data() as IconsArchive;
      const uint8Array = archiveData.archive.toUint8Array();
      return await this.decompressIcons(uint8Array);
    } catch (error) {
      console.error('Ошибка загрузки архива иконок:', error);
      throw new Error(`Не удалось загрузить иконки: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Сохраняет архив иконок в Firestore
   */
  async saveProjectIcons(
    projectId: string,
    icons: Record<string, IconData>,
    userId: string
  ): Promise<void> {
    try {
      const compressedArchive = await this.compressIcons(icons);

      const archiveData: IconsArchive = {
        archive: Bytes.fromUint8Array(compressedArchive),
        updatedBy: userId,
        updatedAt: new Date()
      };

      const archiveRef = doc(firestore, 'projects', projectId, 'data', 'icons');
      await setDoc(archiveRef, archiveData);
    } catch (error) {
      console.error('Ошибка сохранения архива иконок:', error);
      throw new Error(`Не удалось сохранить иконки: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  /**
   * Читает SVG файлы из input элемента
   */
  async readSvgFiles(files: FileList): Promise<IconData[]> {
    const icons: IconData[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Проверяем тип файла
      if (!file.type.includes('svg') && !file.name.toLowerCase().endsWith('.svg')) {
        console.warn(`Пропущен файл ${file.name}: не является SVG`);
        continue;
      }

      try {
        const content = await this.readFileAsText(file);

        // Базовая валидация SVG
        if (!content.trim().includes('<svg')) {
          console.warn(`Пропущен файл ${file.name}: не содержит валидный SVG`);
          continue;
        }

        const iconData = this.createIconData(file.name, content);
        icons.push(iconData);
      } catch (error) {
        console.error(`Ошибка чтения файла ${file.name}:`, error);
      }
    }

    return icons;
  }

  /**
   * Читает файл как текст
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(`Ошибка чтения файла ${file.name}`));
      reader.readAsText(file);
    });
  }

  /**
   * Проверяет, изменились ли иконки по сравнению с сохраненным хешем
   */
  hasIconsChanged(currentIcons: Record<string, IconData>, savedHash: string): boolean {
    const currentHash = this.createIconsHash(currentIcons);
    return currentHash !== savedHash;
  }

  /**
   * Получает текущий хеш иконок
   */
  getIconsHash(icons: Record<string, IconData>): string {
    return this.createIconsHash(icons);
  }
}

// Экспортируем singleton
export const iconsService = new IconsService();