import { Injectable, signal } from '@angular/core';

// Declare the ResponsiveVoice global object to be accessible in TypeScript
declare var responsiveVoice: any;

@Injectable({
  providedIn: 'root',
})
export class TtsService {
  readonly isSupported = signal(false);
  readonly isPlaying = signal(false);
  readonly currentlyPlayingMessageId = signal<string | null>(null);

  constructor() {
    // Check if the ResponsiveVoice library has loaded
    this.isSupported.set(typeof responsiveVoice !== 'undefined');
  }

  play(text: string, messageId: string, lang: string): void {
    if (!this.isSupported()) {
      console.error('ResponsiveVoice not supported.');
      return;
    }

    // Cancel any ongoing speech before starting a new one
    this.cancel();

    const voice = this.mapLangToVoice(lang);
    
    this.isPlaying.set(true);
    this.currentlyPlayingMessageId.set(messageId);

    responsiveVoice.speak(text, voice, {
      onend: () => {
        // This callback fires when speech ends naturally or is cancelled.
        // We only reset the state if the message that just ended is the one we are tracking.
        if (this.currentlyPlayingMessageId() === messageId) {
          this.resetState();
        }
      },
      onerror: (err: any) => {
        console.error('ResponsiveVoice error:', err);
        this.resetState();
      }
    });
  }

  cancel(): void {
    if (this.isSupported() && responsiveVoice.isPlaying()) {
      responsiveVoice.cancel();
    }
    // Force reset state for better UI responsiveness, as onend might not be immediate
    if (this.isPlaying()) {
      this.resetState();
    }
  }

  private resetState(): void {
    this.isPlaying.set(false);
    this.currentlyPlayingMessageId.set(null);
  }

  private mapLangToVoice(lang: string): string {
    const baseLang = lang.split('-')[0];
    switch (baseLang) {
      case 'en': return 'US English Female';
      case 'hi': return 'Hindi Female';
      case 'ta': return 'Tamil Male';
      case 'es': return 'Spanish Female';
      case 'fr': return 'French Female';
      case 'zh': return 'Chinese Female';
      case 'pt': return 'Portuguese Female';
      default: return 'US English Female'; // Default fallback voice
    }
  }
}