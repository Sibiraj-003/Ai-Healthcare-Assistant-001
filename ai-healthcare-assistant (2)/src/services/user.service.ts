import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly WHATSAPP_KEY = 'ai_healthcare_whatsapp_number';

  readonly whatsappNumber = signal<string>('');

  constructor() {
    this.loadFromStorage();
    effect(() => {
      this.saveToStorage(this.whatsappNumber());
    });
  }

  setWhatsappNumber(number: string): void {
    this.whatsappNumber.set(number);
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.WHATSAPP_KEY);
      if (stored) {
        this.whatsappNumber.set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load user settings from localStorage', e);
    }
  }

  private saveToStorage(number: string): void {
    try {
      localStorage.setItem(this.WHATSAPP_KEY, JSON.stringify(number));
    } catch (e) {
      console.error('Failed to save user settings to localStorage', e);
    }
  }
}
