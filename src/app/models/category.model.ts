export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface CategoryCreate {
  name: string;
  color: string;
}

export interface CategoryUpdate {
  name?: string;
  color?: string;
}

export const DEFAULT_CATEGORY: Category = {
  id: 'uncategorized',
  name: 'Sin categoría',
  color: '#95a5a6',
  createdAt: new Date()
};

export const PREDEFINED_COLORS = [
  '#e74c3c', // Rojo
  '#3498db', // Azul
  '#2ecc71', // Verde
  '#f39c12', // Naranja
  '#9b59b6', // Morado
  '#1abc9c', // Turquesa
  '#e67e22', // Naranja oscuro
  '#34495e', // Gris oscuro
  '#16a085', // Verde azulado
  '#c0392b', // Rojo oscuro
  '#27ae60', // Verde oscuro
  '#2980b9'  // Azul oscuro
];
