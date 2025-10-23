import {
    collection,
    doc,
    FieldValue,
    getDoc,
    onSnapshot,
    serverTimestamp,
    setDoc,
    Timestamp,
    writeBatch
} from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { analyticsService } from './analytics.service';

// Типы данных согласно FIRESTORE.md
export interface ProjectInfo {
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  name: string;
  notifications: number;
  pinned: boolean;
}

export interface UserProjectsData {
  projects: Record<string, ProjectInfo>;
}

export interface ProjectMember {
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  added: Timestamp | FieldValue;
  invitedBy: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  owner: string;
  members: Record<string, ProjectMember>;
  visibility: 'private' | 'link' | 'public';
  tags: string[];
  createdAt: Timestamp | FieldValue;
}

export interface CreateProjectData {
  name: string;
  description: string;
  visibility?: 'private' | 'link' | 'public';
  tags?: string[];
}

class ProjectsService {
  // Подписка на изменения проектов пользователя
  subscribeToUserProjects(
    userId: string,
    callback: (projects: Record<string, ProjectInfo>) => void
  ): () => void {
    const userProjectsRef = doc(firestore, `users/${userId}/data/projects`);

    return onSnapshot(userProjectsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProjectsData;
        callback(data.projects || {});
      } else {
        callback({});
      }
    }, (error) => {
      console.error('Ошибка подписки на проекты пользователя:', error);
      callback({});
    });
  }

  // Создание нового проекта
  async createProject(
    userId: string,
    projectData: CreateProjectData
  ): Promise<string> {
    const batch = writeBatch(firestore);
    const projectId = doc(collection(firestore, 'projects')).id;

    const now = serverTimestamp();

    // Создаем проект
    const projectRef = doc(firestore, `projects/${projectId}`);
    const project: Omit<Project, 'id'> = {
      name: projectData.name,
      description: projectData.description,
      owner: userId,
      members: {
        [userId]: {
          role: 'owner',
          added: now,
          invitedBy: userId
        }
      },
      visibility: projectData.visibility || 'private',
      tags: projectData.tags || [],
      createdAt: now
    };

    batch.set(projectRef, project);

    // Обновляем список проектов пользователя
    const userProjectsRef = doc(firestore, `users/${userId}/data/projects`);
    const userProjectsSnapshot = await getDoc(userProjectsRef);

    let userProjects: Record<string, ProjectInfo> = {};
    if (userProjectsSnapshot.exists()) {
      const data = userProjectsSnapshot.data() as UserProjectsData;
      userProjects = data.projects || {};
    }

    userProjects[projectId] = {
      role: 'owner',
      name: projectData.name,
      notifications: 0,
      pinned: false
    };

    batch.set(userProjectsRef, {
      projects: userProjects
    });

    await batch.commit();

    // Track project creation
    analyticsService.track('project_created', { project_id: projectId });

    return projectId;
  }

  // Удаление проекта (только владелец)
  async deleteProject(userId: string, projectId: string): Promise<void> {
    const batch = writeBatch(firestore);

    // Получаем проект для проверки прав
    const projectRef = doc(firestore, `projects/${projectId}`);
    const projectSnapshot = await getDoc(projectRef);

    if (!projectSnapshot.exists()) {
      throw new Error('Проект не найден');
    }

    const project = projectSnapshot.data() as Omit<Project, 'id'>;

    // Проверяем права на удаление (только owner)
    if (project.owner !== userId) {
      throw new Error('Только владелец может удалить проект');
    }

    // Удаляем проект
    batch.delete(projectRef);

    // Удаляем проект из списков всех участников
    for (const memberId of Object.keys(project.members)) {
      const memberProjectsRef = doc(firestore, `users/${memberId}/data/projects`);
      const memberProjectsSnapshot = await getDoc(memberProjectsRef);

      if (memberProjectsSnapshot.exists()) {
        const memberData = memberProjectsSnapshot.data() as UserProjectsData;
        const memberProjects = { ...memberData.projects };
        delete memberProjects[projectId];

        batch.set(memberProjectsRef, {
          projects: memberProjects
        });
      }
    }

    await batch.commit();

    // Track project deletion
    analyticsService.track('project_deleted', { project_id: projectId });
  }

  // Покинуть проект (для не-владельцев)
  async leaveProject(userId: string, projectId: string): Promise<void> {
    const batch = writeBatch(firestore);

    // Получаем проект для проверки
    const projectRef = doc(firestore, `projects/${projectId}`);
    const projectSnapshot = await getDoc(projectRef);

    if (!projectSnapshot.exists()) {
      throw new Error('Проект не найден');
    }

    const project = projectSnapshot.data() as Omit<Project, 'id'>;

    // Владелец не может покинуть проект, только удалить его
    if (project.owner === userId) {
      throw new Error('Владелец не может покинуть проект. Удалите проект или передайте права владения.');
    }

    // Проверяем, что пользователь является участником проекта
    if (!project.members[userId]) {
      throw new Error('Вы не являетесь участником этого проекта');
    }

    // Удаляем пользователя из участников проекта
    const updatedMembers = { ...project.members };
    delete updatedMembers[userId];

    batch.set(projectRef, {
      ...project,
      members: updatedMembers
    });

    // Удаляем проект из списка проектов пользователя
    const userProjectsRef = doc(firestore, `users/${userId}/data/projects`);
    const userProjectsSnapshot = await getDoc(userProjectsRef);

    if (userProjectsSnapshot.exists()) {
      const userData = userProjectsSnapshot.data() as UserProjectsData;
      const userProjects = { ...userData.projects };
      delete userProjects[projectId];

      batch.set(userProjectsRef, {
        projects: userProjects
      });
    }

    await batch.commit();
  }

  // Получение данных проекта
  async getProject(projectId: string): Promise<Project | null> {
    const projectRef = doc(firestore, `projects/${projectId}`);
    const snapshot = await getDoc(projectRef);

    if (snapshot.exists()) {
      return {
        id: projectId,
        ...snapshot.data()
      } as Project;
    }

    return null;
  }

  // Переключение закрепления проекта
  async toggleProjectPin(userId: string, projectId: string): Promise<void> {
    const userProjectsRef = doc(firestore, `users/${userId}/data/projects`);
    const snapshot = await getDoc(userProjectsRef);

    if (snapshot.exists()) {
      const data = snapshot.data() as UserProjectsData;
      const projects = { ...data.projects };

      if (projects[projectId]) {
        projects[projectId].pinned = !projects[projectId].pinned;

        await setDoc(userProjectsRef, {
          projects
        });

        // Track project pin toggle
        analyticsService.track('project_pinned', {
          project_id: projectId,
          pinned: projects[projectId].pinned
        });
      }
    }
  }

  // Helper method to get user details when needed (for member management UI)
  async getUserDetails(userId: string): Promise<{email: string, name: string, avatar?: string} | null> {
    const userRef = doc(firestore, `users/${userId}`);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      const userData = snapshot.data();
      return {
        email: userData.email || '',
        name: userData.name || '',
        avatar: userData.avatar || undefined
      };
    }

    return null;
  }

  // Helper method to get multiple user details efficiently
  async getMultipleUserDetails(userIds: string[]): Promise<Record<string, {email: string, name: string, avatar?: string}>> {
    const userDetails: Record<string, {email: string, name: string, avatar?: string}> = {};

    // Batch read user documents
    const promises = userIds.map(async (userId) => {
      const details = await this.getUserDetails(userId);
      if (details) {
        userDetails[userId] = details;
      }
    });

    await Promise.all(promises);
    return userDetails;
  }
}

export const projectsService = new ProjectsService();