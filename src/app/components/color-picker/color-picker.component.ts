import { Component } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { PREDEFINED_COLORS } from '../../models/category.model';

@Component({
  selector: 'app-color-picker',
  standalone: false,
  template: `
    <ion-list>
      <ion-list-header>
        <ion-label>Seleccionar Color</ion-label>
      </ion-list-header>
      
      <ion-item 
        *ngFor="let color of colors" 
        button 
        (click)="selectColor(color)"
        lines="none">
        <ion-icon 
          name="ellipse" 
          slot="start" 
          [style.color]="color"
          style="font-size: 32px;">
        </ion-icon>
        <ion-label>{{ getColorName(color) }}</ion-label>
      </ion-item>
    </ion-list>
  `,
  styles: [`
    ion-list {
      max-height: 400px;
      overflow-y: auto;
    }

    ion-item {
      --padding-start: 16px;
      cursor: pointer;
      
      &:hover {
        --background: var(--ion-color-light-shade);
      }
    }

    ion-icon {
      margin-right: 8px;
    }
  `]
})
export class ColorPickerComponent {
  colors = PREDEFINED_COLORS;

  constructor(private readonly popoverController: PopoverController) {}

  selectColor(color: string) {
    this.popoverController.dismiss(color);
  }

  getColorName(color: string): string {
    const colorNames: { [key: string]: string } = {
      '#e74c3c': 'Rojo',
      '#3498db': 'Azul',
      '#2ecc71': 'Verde',
      '#f39c12': 'Naranja',
      '#9b59b6': 'Morado',
      '#1abc9c': 'Turquesa',
      '#e67e22': 'Naranja Oscuro',
      '#34495e': 'Gris Oscuro',
      '#16a085': 'Verde Azulado',
      '#c0392b': 'Rojo Oscuro',
      '#27ae60': 'Verde Oscuro',
      '#2980b9': 'Azul Oscuro'
    };
    return colorNames[color] || color;
  }
}