import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Category, CategoryCreate, CategoryUpdate, DEFAULT_CATEGORY } from '../models/category.model';
import { StorageService } from './storage.service';

const CATEGORIES_STORAGE_KEY = 'todo_categories';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly categoriesSubject = new BehaviorSubject<Category[]>([DEFAULT_CATEGORY]);
  public categories$: Observable<Category[]> = this.categoriesSubject.asObservable();

  constructor(private readonly storage: StorageService) {
    this.loadCategories();
  }

  /**
   * Load categories from local storage
   */
  private async loadCategories(): Promise<void> {
    try {
      const categories = await this.storage.get<Category[]>(CATEGORIES_STORAGE_KEY);
      
      if (categories && categories.length > 0) {
        const hasDefault = categories.some(c => c.id === DEFAULT_CATEGORY.id);
        
        if (!hasDefault) {
          categories.unshift(DEFAULT_CATEGORY);
        }
        
        this.categoriesSubject.next(categories);
      } else {
        this.categoriesSubject.next([DEFAULT_CATEGORY]);
        await this.saveCategories();
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
      this.categoriesSubject.next([DEFAULT_CATEGORY]);
    }
  }

  /**
   * Save categories to local storage
   */
  private async saveCategories(): Promise<void> {
    try {
      await this.storage.set(CATEGORIES_STORAGE_KEY, this.categoriesSubject.value);
    } catch (error) {
      console.error('Error guardando categorías:', error);
      throw error;
    }
  }

  /**
   * Get all categories
   */
  getCategories(): Category[] {
    return this.categoriesSubject.value;
  }

  /**
   * Get a category by ID
   */
  getCategoryById(id: string): Category | undefined {
    return this.categoriesSubject.value.find(c => c.id === id);
  }

  /**
   * Create a new category
   */
  async createCategory(categoryData: CategoryCreate): Promise<Category> {
    try {
      const newCategory: Category = {
        id: this.generateId(),
        name: categoryData.name.trim(),
        color: categoryData.color,
        createdAt: new Date()
      };

      const categories = [...this.categoriesSubject.value, newCategory];
      this.categoriesSubject.next(categories);
      await this.saveCategories();

      return newCategory;
    } catch (error) {
      console.error('Error creando categoría:', error);
      throw error;
    }
  }

  /**
   * Update existing category
   */
  async updateCategory(id: string, updates: CategoryUpdate): Promise<Category> {
    try {
      if (id === DEFAULT_CATEGORY.id) {
        throw new Error('No se puede editar la categoría por defecto');
      }

      const categories = this.categoriesSubject.value.map(category => {
        if (category.id === id) {
          return {
            ...category,
            ...updates,
            name: updates.name ? updates.name.trim() : category.name
          };
        }
        return category;
      });

      const updatedCategory = categories.find(c => c.id === id);
      
      if (!updatedCategory) {
        throw new Error('Categoría no encontrada');
      }

      this.categoriesSubject.next(categories);
      await this.saveCategories();

      return updatedCategory;
    } catch (error) {
      console.error('Error actualizando categoría:', error);
      throw error;
    }
  }

  /**
   * Delete a category
   * Note: Tasks in this category will be reassigned to "Uncategorized"
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      if (id === DEFAULT_CATEGORY.id) {
        throw new Error('No se puede eliminar la categoría por defecto');
      }

      const categories = this.categoriesSubject.value.filter(c => c.id !== id);
      this.categoriesSubject.next(categories);
      await this.saveCategories();
    } catch (error) {
      console.error('Error eliminando categoría:', error);
      throw error;
    }
  }

  /**
   * Generate unique ID for category
   */
  private generateId(): string {
    return `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get number of categories (excluding the default category)
   */
  getCategoriesCount(): number {
    return this.categoriesSubject.value.filter(c => c.id !== DEFAULT_CATEGORY.id).length;
  }

  /**
   * Check if a category exists
   */
  categoryExists(id: string): boolean {
    return this.categoriesSubject.value.some(c => c.id === id);
  }
}
