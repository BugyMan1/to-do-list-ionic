import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getRemoteConfig, 
  RemoteConfig, 
  fetchAndActivate, 
  getValue, 
  Value 
} from 'firebase/remote-config';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

export interface FeatureFlags {
  enableCategories: boolean;
  enableDarkMode: boolean;
}

const API_KEY = 'AIzaSyC3uhDwaAmvi5BRpxl6IMV34VpFPoBQyxk';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp | null = null;
  private remoteConfig: RemoteConfig | null = null;
  private initialized = false;
  
  // BehaviorSubject for feature flags (reactive values)
  private readonly featureFlagsSubject = new BehaviorSubject<FeatureFlags>({
    enableCategories: true,
    enableDarkMode: false
  });
  
  public featureFlags$: Observable<FeatureFlags> = this.featureFlagsSubject.asObservable();

  constructor() {
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase and Remote Config
   */
  private async initializeFirebase(): Promise<void> {
    try {
      if (!environment.firebase.apiKey || environment.firebase.apiKey === 'API_KEY') {
        console.warn('Firebase no configurado. Usando valores por defecto.');
        this.initialized = false;
        return;
      }

      this.app = initializeApp(environment.firebase);
      
      this.remoteConfig = getRemoteConfig(this.app);
      
      this.remoteConfig.settings.minimumFetchIntervalMillis = environment.production ? 43200000 : 60000; // 12 horas en prod, 1 min en dev
      this.remoteConfig.settings.fetchTimeoutMillis = 60000;

      this.remoteConfig.defaultConfig = {
        'enable_categories': true,
        'enable_dark_mode': false
      };

      this.initialized = true;
      
      await this.fetchConfig();
      
      console.log('Firebase Remote Config inicializado correctamente');
    } catch (error) {
      console.error('Error inicializando Firebase:', error);
      this.initialized = false;
    }
  }

  /**
   * Fetch and activate the remote configuration
   */
  async fetchConfig(): Promise<void> {
    if (!this.initialized || !this.remoteConfig) {
      console.warn('Remote Config no inicializado. Usando valores por defecto.');
      return;
    }

    try {
      const activated = await fetchAndActivate(this.remoteConfig);
      
      if (activated) {
        console.log('Configuración remota activada');
      } else {
        console.log('Usando configuración remota en caché');
      }

      this.updateFeatureFlags();
    } catch (error) {
      console.error('Error obteniendo configuración remota:', error);
    }
  }

  /**
   * Update feature flags from Remote Config
   */
  private updateFeatureFlags(): void {
    if (!this.remoteConfig) {
      return;
    }

    try {
      const enableCategories = getValue(this.remoteConfig, 'enable_categories').asBoolean();
      const enableDarkMode = getValue(this.remoteConfig, 'enable_dark_mode').asBoolean();

      const newFlags: FeatureFlags = {
        enableCategories,
        enableDarkMode
      };

      this.featureFlagsSubject.next(newFlags);
      
      console.log('Feature flags actualizados:', newFlags);
    } catch (error) {
      console.error('Error actualizando feature flags:', error);
    }
  }

  /**
   * Get a Remote Config value
   * @param key Key of the value
   * @returns Firebase Remote Config Value object
   */
  getConfigValue(key: string): Value | null {
    if (!this.remoteConfig) {
      return null;
    }

    try {
      return getValue(this.remoteConfig, key);
    } catch (error) {
      console.error(`Error obteniendo valor de configuración: ${key}`, error);
      return null;
    }
  }

  /**
   * Get the current state of feature flags
   */
  getCurrentFeatureFlags(): FeatureFlags {
    return this.featureFlagsSubject.value;
  }

  /**
   * Check if Firebase is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Apply dark mode according to configuration
   */
  applyDarkModeConfig(): void {
    const flags = this.getCurrentFeatureFlags();
    
    if (flags.enableDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }
}
