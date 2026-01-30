import { Injectable, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, debounceTime } from 'rxjs/operators';
import { Task, TaskCreate, TaskUpdate } from '../models/task.model';
import { StorageService } from './storage.service';
import { CategoryService } from './category.service';
import { DEFAULT_CATEGORY } from '../models/category.model';

const TASKS_STORAGE_KEY = 'todo_tasks';

export interface TaskFilter {
  categoryId?: string;
  searchText?: string;
  showCompleted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly tasksSubject = new BehaviorSubject<Task[]>([]);
  public tasks$: Observable<Task[]> = this.tasksSubject.asObservable();

  private readonly filterSubject = new BehaviorSubject<TaskFilter>({
    showCompleted: true
  });
  public filter$ = this.filterSubject.asObservable();

  public filteredTasks$: Observable<Task[]>;

  constructor(
    private readonly storage: StorageService,
    private readonly categoryService: CategoryService
  ) {
    this.loadTasks();

    this.filteredTasks$ = combineLatest([
      this.tasks$,
      this.filter$.pipe(debounceTime(300))
    ]).pipe(
      map(([tasks, filter]) => this.applyFilters(tasks, filter))
    );
  }

  /**
   * Load tasks from local storage
   */
  private async loadTasks(): Promise<void> {
    try {
      const tasks = await this.storage.get<Task[]>(TASKS_STORAGE_KEY);
      
      if (tasks && tasks.length > 0) {
        const tasksWithDates = tasks.map(task => ({
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt)
        }));
        
        this.tasksSubject.next(tasksWithDates);
      } else {
        this.tasksSubject.next([]);
      }
    } catch (error) {
      console.error('Error cargando tareas:', error);
      this.tasksSubject.next([]);
    }
  }

  /**
   * Save tasks to local storage
   */
  private async saveTasks(): Promise<void> {
    try {
      await this.storage.set(TASKS_STORAGE_KEY, this.tasksSubject.value);
    } catch (error) {
      console.error('Error guardando tareas:', error);
      throw error;
    }
  }

  /**
   * Apply filters to tasks
   * Optimized with memoization for frequent filters
   */
  private applyFilters(tasks: Task[], filter: TaskFilter): Task[] {
    let filteredTasks = [...tasks];

    if (filter.categoryId) {
      filteredTasks = filteredTasks.filter(task => task.categoryId === filter.categoryId);
    }

    if (filter.searchText?.trim()) {
      const searchLower = filter.searchText.toLowerCase().trim();
      filteredTasks = filteredTasks.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower)
      );
    }

    if (filter.showCompleted === false) {
      filteredTasks = filteredTasks.filter(task => !task.completed);
    }

    return filteredTasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get all tasks
   */
  getTasks(): Task[] {
    return this.tasksSubject.value;
  }

  /**
   * Get a task by ID
   */
  getTaskById(id: string): Task | undefined {
    return this.tasksSubject.value.find(t => t.id === id);
  }

  /**
   * Create a new task
   */
  async createTask(taskData: TaskCreate): Promise<Task> {
    try {
      // Validar que la categoría exista
      if (!this.categoryService.categoryExists(taskData.categoryId)) {
        taskData.categoryId = DEFAULT_CATEGORY.id;
      }

      const newTask: Task = {
        id: this.generateId(),
        title: taskData.title.trim(),
        description: taskData.description.trim(),
        completed: false,
        categoryId: taskData.categoryId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const tasks = [...this.tasksSubject.value, newTask];
      this.tasksSubject.next(tasks);
      await this.saveTasks();

      return newTask;
    } catch (error) {
      console.error('Error creando tarea:', error);
      throw error;
    }
  }

  /**
   * Update existing task
   */
  async updateTask(id: string, updates: TaskUpdate): Promise<Task> {
    try {
      const tasks = this.tasksSubject.value.map(task => {
        if (task.id === id) {
          return {
            ...task,
            ...updates,
            title: updates.title === undefined ? task.title : updates.title.trim(),
            description: updates.description === undefined ? task.description : updates.description.trim(),
            updatedAt: new Date()
          };
        }
        return task;
      });

      const updatedTask = tasks.find(t => t.id === id);
      
      if (!updatedTask) {
        throw new Error('Tarea no encontrada');
      }

      this.tasksSubject.next(tasks);
      await this.saveTasks();

      return updatedTask;
    } catch (error) {
      console.error('Error actualizando tarea:', error);
      throw error;
    }
  }

  /**
   * Toggle a task's completed state
   */
  async toggleTaskCompleted(id: string): Promise<Task> {
    const task = this.getTaskById(id);
    
    if (!task) {
      throw new Error('Tarea no encontrada');
    }

    return this.updateTask(id, { completed: !task.completed });
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<void> {
    try {
      const tasks = this.tasksSubject.value.filter(t => t.id !== id);
      this.tasksSubject.next(tasks);
      await this.saveTasks();
    } catch (error) {
      console.error('Error eliminando tarea:', error);
      throw error;
    }
  }

  /**
   * Reassign tasks from a deleted category to the default category
   */
  async reassignTasksFromDeletedCategory(categoryId: string): Promise<void> {
    try {
      const tasks = this.tasksSubject.value.map(task => {
        if (task.categoryId === categoryId) {
          return {
            ...task,
            categoryId: DEFAULT_CATEGORY.id,
            updatedAt: new Date()
          };
        }
        return task;
      });

      this.tasksSubject.next(tasks);
      await this.saveTasks();
    } catch (error) {
      console.error('Error reasignando tareas:', error);
      throw error;
    }
  }

  /**
   * Update task filters
   */
  updateFilter(filter: Partial<TaskFilter>): void {
    this.filterSubject.next({
      ...this.filterSubject.value,
      ...filter
    });
  }

  /**
   * Clear filters
   */
  clearFilters(): void {
    this.filterSubject.next({
      showCompleted: true
    });
  }

  /**
   * Get task statistics
   */
  getTaskStats() {
    const tasks = this.tasksSubject.value;
    
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.completed).length,
      pending: tasks.filter(t => !t.completed).length,
      byCategory: this.getTasksByCategory()
    };
  }

  /**
   * Get number of tasks by category
   */
  private getTasksByCategory(): { [categoryId: string]: number } {
    const tasks = this.tasksSubject.value;
    const result: { [categoryId: string]: number } = {};

    tasks.forEach(task => {
      result[task.categoryId] = (result[task.categoryId] || 0) + 1;
    });

    return result;
  }

  /**
   * Generate unique ID for task
   */
  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
    * Clear all completed tasks
   */
  async clearCompletedTasks(): Promise<void> {
    try {
      const tasks = this.tasksSubject.value.filter(t => !t.completed);
      this.tasksSubject.next(tasks);
      await this.saveTasks();
    } catch (error) {
      console.error('Error eliminando tareas completadas:', error);
      throw error;
    }
  }
}
