import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CategoriesPage } from './categories.page';
import { ColorPickerComponent } from 'src/app/components/color-picker/color-picker.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  declarations: [CategoriesPage, ColorPickerComponent]
})
export class CategoriesPageModule {}
