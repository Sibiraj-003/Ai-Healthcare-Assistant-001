import { Injectable, signal, effect, inject } from '@angular/core';
import { Medication } from '../models/medication.model';
import { UserService } from './user.service';
import { LanguageService } from './language.service';

@Injectable({
  providedIn: 'root',
})
export class MedicationService {
  private readonly STORAGE_KEY = 'ai_healthcare_medications';
  private userService = inject(UserService);
  private languageService = inject(LanguageService);
  
  readonly medications = signal<Medication[]>([]);
  
  // Alarm State
  readonly activeAlarm = signal<Medication | null>(null);
  
  private checkInterval: any;
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private triggeredMedications = new Set<string>(); // Format: "id-YYYY-MM-DD-HH-mm"

  constructor() {
    this.loadFromStorage();
    this.requestNotificationPermission();
    this.startMonitoring();

    effect(() => {
      this.saveToStorage(this.medications());
    });
  }

  addMedication(med: Omit<Medication, 'id'>): void {
    const newMedication: Medication = {
      ...med,
      id: Date.now().toString() + Math.random().toString(36).substring(2),
    };
    this.medications.update(meds => [...meds, newMedication].sort((a, b) => a.time.localeCompare(b.time)));
  }

  deleteMedication(id: string): void {
    this.medications.update(meds => meds.filter(m => m.id !== id));
  }

  dismissAlarm(): void {
    this.stopSound();
    this.activeAlarm.set(null);
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.medications.set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load medications from localStorage', e);
    }
  }

  private saveToStorage(medications: Medication[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(medications));
    } catch (e) {
      console.error('Failed to save medications to localStorage', e);
    }
  }

  // --- Alarm & Notification Logic ---

  private requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }

  private startMonitoring(): void {
    // Check every 10 seconds
    this.checkInterval = setInterval(() => {
      this.checkMedications();
    }, 10000);
  }

  private checkMedications(): void {
    const now = new Date();
    // Format current time as HH:mm to match input="time" format
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    
    // Unique key for today's specific time slot
    const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${currentTimeStr}`;

    this.medications().forEach(med => {
      if (med.time === currentTimeStr) {
        const triggerKey = `${med.id}-${dateKey}`;
        
        // If not triggered yet for this specific minute/day
        if (!this.triggeredMedications.has(triggerKey)) {
          this.triggerAlarm(med, triggerKey);
        }
      }
    });
  }

  private triggerAlarm(med: Medication, triggerKey: string): void {
    // 1. Mark as triggered so it doesn't loop infinitely in this minute
    this.triggeredMedications.add(triggerKey);
    
    // 2. Set Active Alarm (triggers UI Modal)
    this.activeAlarm.set(med);

    // 3. Play Sound (Web Audio API)
    this.playSound();

    // 4. Send System Notification
    this.sendSystemNotification(med);
    
    // 5. Send WhatsApp Reminder
    this.sendWhatsAppReminder(med);
  }

  private sendSystemNotification(med: Medication): void {
     if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(this.languageService.translate('medicationReminder'), {
          body: `${this.languageService.translate('timeToTakeMedication')} ${med.name} (${med.dosage})`,
          icon: '/favicon.ico',
          requireInteraction: true,
          tag: 'medication-alarm'
        });
      } catch (e) {
        console.error('Notification error:', e);
      }
    }
  }

  private sendWhatsAppReminder(med: Medication): void {
    const number = this.userService.whatsappNumber();
    if (!number || number.trim() === '') return;

    const messageTemplate = this.languageService.translate('whatsappReminderMessage');
    const message = `${messageTemplate} *${med.name}* (${med.dosage})`;
    const encodedMessage = encodeURIComponent(message);
    const cleanNumber = number.replace(/[^0-9]/g, '');

    const url = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private playSound(): void {
    try {
      // Create AudioContext only when needed (browsers suspend if created too early without interaction)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      // Create Oscillator (Sound generator)
      this.oscillator = this.audioContext.createOscillator();
      this.gainNode = this.audioContext.createGain();

      this.oscillator.type = 'sine'; // Beep sound
      this.oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime); // A5
      this.oscillator.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.5); // Drop pitch

      // Connect nodes
      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // Pulsing effect using gain
      const now = this.audioContext.currentTime;
      this.gainNode.gain.setValueAtTime(1, now);
      // Create a rhythmic beeping pattern
      for (let i = 0; i < 30; i++) { // Loop for 30 seconds
         const startTime = now + i;
         this.gainNode.gain.setValueAtTime(1, startTime);
         this.gainNode.gain.linearRampToValueAtTime(0, startTime + 0.5);
      }

      this.oscillator.start(now);
      // Automatically stop after 30 seconds if user doesn't dismiss
      this.oscillator.stop(now + 30); 
    } catch (e) {
      console.error('Audio play failed', e);
    }
  }

  private stopSound(): void {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch (e) {} // Ignore if already stopped
      this.oscillator = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
