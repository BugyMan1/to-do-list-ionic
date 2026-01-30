import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { FirebaseService } from './services/firebase.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(
    private readonly platform: Platform,
    private readonly firebaseService: FirebaseService
  ) {
    this.initializeApp();
  }

  ngOnInit() {
    this.firebaseService.featureFlags$.subscribe(flags => {
      if (flags.enableDarkMode) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    });
  }

  initializeApp() {
    this.platform.ready().then(async () => {
      if (this.platform.is('capacitor')) {
        try {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#3880ff' });
        } catch (error) {
          console.error('Error configurando StatusBar:', error);
        }

        try {
          await SplashScreen.hide();
        } catch (error) {
          console.error('Error ocultando SplashScreen:', error);
        }
      }

      try {
        await this.firebaseService.fetchConfig();
      } catch (error) {
        console.error('Error cargando configuración inicial:', error);
      }
    });
  }
}
