import { Injectable, signal, effect } from '@angular/core';
import { EmergencyContact } from '../models/emergency-contact.model';

@Injectable({
  providedIn: 'root',
})
export class EmergencyService {
  private readonly STORAGE_KEY = 'ai_healthcare_emergency_contacts';
  
  readonly contacts = signal<EmergencyContact[]>([]);

  constructor() {
    this.loadFromStorage();

    effect(() => {
      this.saveToStorage(this.contacts());
    });
  }

  addContact(contact: Omit<EmergencyContact, 'id'>): void {
    const newContact: EmergencyContact = {
      ...contact,
      id: Date.now().toString() + Math.random().toString(36).substring(2),
    };
    this.contacts.update(c => [...c, newContact]);
  }

  deleteContact(id: string): void {
    this.contacts.update(c => c.filter(contact => contact.id !== id));
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.contacts.set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load emergency contacts from localStorage', e);
    }
  }

  private saveToStorage(contacts: EmergencyContact[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(contacts));
    } catch (e) {
      console.error('Failed to save emergency contacts to localStorage', e);
    }
  }
}
