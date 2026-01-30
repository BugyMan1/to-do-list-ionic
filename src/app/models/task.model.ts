export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskCreate {
  title: string;
  description: string;
  categoryId: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  completed?: boolean;
  categoryId?: string;
}
