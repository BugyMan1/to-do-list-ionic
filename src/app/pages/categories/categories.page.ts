import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AlertController, ModalController, PopoverController, ToastController } from '@ionic/angular';
import { Category, DEFAULT_CATEGORY } from '../../models/category.model';
import { CategoryService } from '../../services/category.service';
import { TaskService } from '../../services/task.service';
import { ColorPickerComponent } from 'src/app/components/color-picker/color-picker.component';

@Component({
  selector: 'app-categories',
  standalone: false,
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
})
export class CategoriesPage implements OnInit {
  categories: Category[] = [];
  totalCategories = 0;
  totalTasks = 0;
  tasksByCategory: { [categoryId: string]: number } = {};

  constructor(
    private readonly categoryService: CategoryService,
    private readonly taskService: TaskService,
    private readonly modalController: ModalController,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly popoverController: PopoverController,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadTaskStats();
  }

  /**
   * Load categories
   */
  loadCategories() {
    this.categoryService.categories$.subscribe(categories => {
      this.categories = categories;
      this.totalCategories = categories.filter(c => c.id !== DEFAULT_CATEGORY.id).length;
    });
  }

  /**
   * Load task statistics
   */
  loadTaskStats() {
    this.taskService.tasks$.subscribe(() => {
      const stats = this.taskService.getTaskStats();
      this.totalTasks = stats.total;
      this.tasksByCategory = stats.byCategory;
    });
  }

  /**
   * TrackBy to optimize rendering
   */
  trackByCategory(category: Category): string {
    return category.id;
  }

  /**
   * Get number of tasks by category
   */
  getTaskCount(categoryId: string): number {
    return this.tasksByCategory[categoryId] || 0;
  }

  /**
   * Close modal
   */
  closeModal() {
    this.modalController.dismiss();
  }

  /**
   * Add new category
   */
  async addCategory() {
    const alert = await this.alertController.create({
      header: 'Nueva Categoría',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nombre de la categoría',
          attributes: {
            maxlength: 30
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Siguiente',
          handler: async (data) => {
            if (!data.name?.trim()) {
              this.showToast('El nombre es requerido', 'warning');
              return false;
            }

            // Select color
            const color = await this.selectColor();
            if (color) {
              try {
                await this.categoryService.createCategory({
                  name: data.name,
                  color: color
                });
                this.showToast('Categoría creada exitosamente', 'success');
              } catch {
                this.showToast('Error al crear la categoría', 'danger');
              }
            }
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Select color for category
   */
  private async selectColor(): Promise<string | null> {
    const popover = await this.popoverController.create({
      component: ColorPickerComponent,
      cssClass: 'color-picker-popover',
      translucent: true
    });

    await popover.present();

    const { data } = await popover.onDidDismiss();
    return data || null;
  }

  /**
   * Edit existing category
   */
  async editCategory(category: Category) {
    const alert = await this.alertController.create({
      header: 'Editar Categoría',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nombre de la categoría',
          value: category.name,
          attributes: {
            maxlength: 30
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cambiar Color',
          handler: async () => {
            const color = await this.selectColor();
            if (color) {
              try {
                await this.categoryService.updateCategory(category.id, { color });
                this.changeDetectorRef.detectChanges();
                this.showToast('Color actualizado', 'success');
              } catch {
                this.showToast('Error al actualizar el color', 'danger');
              }
            }
            return false;
          }
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.name?.trim()) {
              this.showToast('El nombre es requerido', 'warning');
              return false;
            }

            try {
              await this.categoryService.updateCategory(category.id, {
                name: data.name
              });
              this.changeDetectorRef.detectChanges();
              this.showToast('Categoría actualizada exitosamente', 'success');
            } catch {
              this.showToast('Error al actualizar la categoría', 'danger');
            }
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Delete category
   */
  async deleteCategory(category: Category) {
    const taskCount = this.getTaskCount(category.id);
    
    const message = taskCount > 0
      ? `¿Eliminar "${category.name}"? Las ${taskCount} tarea(s) se moverán a "Sin categoría".`
      : `¿Eliminar "${category.name}"?`;

    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: message,
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
              if (taskCount > 0) {
                await this.taskService.reassignTasksFromDeletedCategory(category.id);
              }
              
              await this.categoryService.deleteCategory(category.id);
              
              this.showToast('Categoría eliminada', 'success');
            } catch {
              this.showToast('Error al eliminar la categoría', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
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
