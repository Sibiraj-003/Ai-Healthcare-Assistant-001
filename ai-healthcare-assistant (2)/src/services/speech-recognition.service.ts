import { Injectable, signal, inject } from '@angular/core';
import { LanguageService } from './language.service';

// Extend the global Window interface to include webkitSpeechRecognition
declare global {
  interface Window {
    // FIX: Added SpeechRecognition to the Window interface to resolve a TypeScript error.
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

@Injectable({
  providedIn: 'root',
})
export class SpeechRecognitionService {
  private recognition: any | null = null;
  private languageService = inject(LanguageService);
  
  readonly isSupported = signal(false);
  readonly isListening = signal(false);
  readonly transcript = signal('');
  readonly speechError = signal<string | null>(null);

  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.isSupported.set(true);
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onstart = () => {
        this.isListening.set(true);
      };

      this.recognition.onend = () => {
        this.isListening.set(false);
      };

      this.recognition.onresult = (event: any) => {
        // This logic is designed to handle continuous speech recognition more robustly.
        // It correctly pieces together final results and the current interim result.
        const finalParts: string[] = [];
        let interimPart = '';

        // Iterate through all the results from the browser's speech recognition
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptChunk = result[0].transcript;
          
          if (result.isFinal) {
            // If a result is final, add its transcript to our list of final parts.
            finalParts.push(transcriptChunk);
          } else {
            // If it's not final, it's the current interim transcript.
            // We only care about the last one.
            interimPart = transcriptChunk;
          }
        }

        // Join all the final parts with a space.
        const finalTranscript = finalParts.join(' ');

        // Combine the final transcript with the current interim transcript.
        let combined = finalTranscript;
        if (interimPart) {
          // Add a space before the interim part if there's a final part before it.
          if (combined) {
            combined += ' ';
          }
          combined += interimPart;
        }

        // Update the signal with the complete, correctly-spaced transcript.
        this.transcript.set(combined);
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        
        let errorKey = 'speechErrorGeneric';
        switch (event.error) {
          case 'no-speech':
            errorKey = 'speechErrorNoSpeech';
            break;
          case 'not-allowed':
          case 'service-not-allowed':
            errorKey = 'speechErrorNotAllowed';
            break;
          case 'network':
            errorKey = 'speechErrorNetwork';
            break;
        }

        this.speechError.set(this.languageService.translate(errorKey));
        this.isListening.set(false);
        
        // Hide the error after 5 seconds
        setTimeout(() => this.speechError.set(null), 5000);
      };
    } else {
      this.isSupported.set(false);
    }
  }

  startListening(lang: string = 'en-US'): void {
    if (this.isSupported() && this.recognition && !this.isListening()) {
      this.speechError.set(null); // Clear previous errors
      this.recognition.lang = this.mapLang(lang);
      this.transcript.set('');
      this.recognition.start();
    }
  }

  stopListening(): void {
    if (this.isSupported() && this.recognition && this.isListening()) {
      this.recognition.stop();
    }
  }

  private mapLang(lang: string): string {
    // If it's already a BCP-47 tag, use it.
    if (lang.includes('-')) {
      return lang;
    }
    // Otherwise, map from simple codes for backward compatibility or simple inputs.
    switch (lang) {
      case 'en': return 'en-US';
      case 'hi': return 'hi-IN';
      case 'ta': return 'ta-IN';
      case 'es': return 'es-ES';
      case 'fr': return 'fr-FR';
      case 'zh': return 'zh-CN';
      case 'pt': return 'pt-BR';
      default: return lang; // Pass through other simple codes, browser might support them.
    }
  }
}