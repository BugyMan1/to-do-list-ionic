import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Task } from '../../models/task.model';
import { Category, DEFAULT_CATEGORY } from '../../models/category.model';
import { TaskService } from '../../services/task.service';
import { CategoryService } from '../../services/category.service';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class HomePage implements OnInit, OnDestroy {
  filteredTasks$: Observable<Task[]>;
  categories: Category[] = [];
  selectedCategoryId: string = 'all';
  searchText: string = '';
  showCompleted: boolean = true;
  categoriesEnabled: boolean = true;
  
  taskStats = {
    total: 0,
    completed: 0,
    pending: 0
  };

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly taskService: TaskService,
    private readonly categoryService: CategoryService,
    private readonly firebaseService: FirebaseService,
    private readonly alertController: AlertController,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {
    this.filteredTasks$ = this.taskService.filteredTasks$;
  }

  ngOnInit() {
    this.categoryService.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe(categories => {
        this.categories = categories;
        this.changeDetectorRef.detectChanges();
      });

    this.taskService.tasks$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateStats();
        this.changeDetectorRef.detectChanges();
      });

    this.firebaseService.featureFlags$
      .pipe(takeUntil(this.destroy$))
      .subscribe(flags => {
        this.categoriesEnabled = flags.enableCategories;
        
        this.firebaseService.applyDarkModeConfig();
        this.changeDetectorRef.detectChanges();
      });

    this.updateStats();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * TrackBy function to optimize list rendering
   */
  trackByTaskId(task: Task): string {
    return task.id;
  }

  /**
   * Update task statistics
   */
  private updateStats() {
    this.taskStats = this.taskService.getTaskStats();
  }

  /**
   * Get category name by ID
   */
  getCategoryName(categoryId: string): string {
    const category = this.categoryService.getCategoryById(categoryId);
    return category ? category.name : 'Sin categoría';
  }

  /**
   * Get category color by ID
   */
  getCategoryColor(categoryId: string): string {
    const category = this.categoryService.getCategoryById(categoryId);
    return category ? category.color : DEFAULT_CATEGORY.color;
  }

  /**
   * Handle category filter change
   */
  onCategoryFilterChange() {
    if (this.selectedCategoryId === 'all') {
      this.taskService.updateFilter({ categoryId: undefined });
    } else {
      this.taskService.updateFilter({ categoryId: this.selectedCategoryId });
    }
  }

  /**
   * Handle search change
   */
  onSearchChange() {
    this.taskService.updateFilter({ searchText: this.searchText });
  }

  /**
   * Handle change in show completed
   */
  onShowCompletedChange() {
    this.taskService.updateFilter({ showCompleted: this.showCompleted });
  }

  /**
   * Add new task
   */
  async addTask() {
    const alert = await this.alertController.create({
      header: 'Nueva Tarea',
      inputs: [
        {
          name: 'title',
          type: 'text',
          placeholder: 'Título de la tarea',
          attributes: {
            maxlength: 100
          }
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Descripción (opcional)',
          attributes: {
            rows: 3,
            maxlength: 500
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.title?.trim()) {
              this.showToast('El título es requerido', 'warning');
              return false;
            }

            try {
              let categoryId = DEFAULT_CATEGORY.id;
              
              if (this.categoriesEnabled && this.categories.length > 1) {
                categoryId = await this.selectCategory();
              }

              await this.taskService.createTask({
                title: data.title,
                description: data.description || '',
                categoryId: categoryId
              });

              this.showToast('Tarea creada exitosamente', 'success');
              return true;
            } catch {
              this.showToast('Error al crear la tarea', 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Select category for the task
   */
  private async selectCategory(): Promise<string> {
    return new Promise((resolve) => {
      this.alertController.create({
        header: 'Seleccionar Categoría',
        inputs: this.categories.map(category => ({
          name: category.id,
          type: 'radio' as const,
          label: category.name,
          value: category.id,
          checked: category.id === DEFAULT_CATEGORY.id
        })),
        buttons: [
          {
            text: 'Aceptar',
            handler: (categoryId) => {
              resolve(categoryId || DEFAULT_CATEGORY.id);
            }
          }
        ]
      }).then(alert => alert.present());
    });
  }

  /**
   * Edit existing task
   */
  async editTask(task: Task) {
    const alert = await this.alertController.create({
      header: 'Editar Tarea',
      inputs: [
        {
          name: 'title',
          type: 'text',
          placeholder: 'Título de la tarea',
          value: task.title,
          attributes: {
            maxlength: 100
          }
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Descripción',
          value: task.description,
          attributes: {
            rows: 3,
            maxlength: 500
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cambiar Categoría',
          handler: async () => {
            if (this.categoriesEnabled) {
              const categoryId = await this.selectCategory();
              await this.taskService.updateTask(task.id, { categoryId });
              this.showToast('Categoría actualizada', 'success');
            }
            return false;
          }
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.title?.trim()) {
              this.showToast('El título es requerido', 'warning');
              return false;
            }

            try {
              await this.taskService.updateTask(task.id, {
                title: data.title,
                description: data.description || ''
              });

              this.showToast('Tarea actualizada exitosamente', 'success');
              return true;
            } catch {
              this.showToast('Error al actualizar la tarea', 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Toggle a task's completed state
   */
  async toggleTaskCompleted(task: Task) {
    try {
      await this.taskService.toggleTaskCompleted(task.id);
    } catch {
      this.showToast('Error al actualizar la tarea', 'danger');
    }
  }

  /**
   * Delete task
   */
  async deleteTask(task: Task) {
    const alert = await this.alertController.create({
      header: 'Confirmar',
      message: `¿Estás seguro de que deseas eliminar "${task.title}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.taskService.deleteTask(task.id);
              this.showToast('Tarea eliminada', 'success');
            } catch {
              this.showToast('Error al eliminar la tarea', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Clear all completed tasks
   */
  async clearCompletedTasks() {
    const alert = await this.alertController.create({
      header: 'Confirmar',
      message: `¿Eliminar todas las tareas completadas (${this.taskStats.completed})?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.taskService.clearCompletedTasks();
              this.showToast('Tareas completadas eliminadas', 'success');
            } catch {
              this.showToast('Error al eliminar tareas', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Open categories management modal
   */
  async presentCategoryModal() {
    const { CategoriesPage } = await import('../categories/categories.page');
    
    const modal = await this.modalController.create({
      component: CategoriesPage
    });

    await modal.present();

    await modal.onDidDismiss();
    this.changeDetectorRef.detectChanges();
  }

  /**
   * Refresh Firebase Remote Config configuration
   */
  async refreshConfig() {
    try {
      await this.firebaseService.fetchConfig();
      this.showToast('Configuración actualizada', 'success');
    } catch {
      this.showToast('Error al actualizar configuración', 'danger');
    }
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });

    await toast.present();
  }
}
