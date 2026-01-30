import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { StorageService } from './services/storage.service';
import { TaskService } from './services/task.service';
import { CategoryService } from './services/category.service';
import { FirebaseService } from './services/firebase.service';
import { CategoriesPageModule } from './pages/categories/categories.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    CategoriesPageModule
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    StorageService,
    TaskService,
    CategoryService,
    FirebaseService
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
