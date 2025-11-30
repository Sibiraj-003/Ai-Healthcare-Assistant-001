

import { Component, ChangeDetectionStrategy, signal, effect, inject, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from './services/chat.service';
import { LanguageService } from './services/language.service';
import { SpeechRecognitionService } from './services/speech-recognition.service';
import { HistoryService } from './services/history.service';
import { MedicationService } from './services/medication.service';
import { ChatBubbleComponent } from './components/chat-bubble/chat-bubble.component';
import { HistoryPanelComponent } from './components/history-panel/history-panel.component';
import { ShareModalComponent } from './components/share-modal/share-modal.component';
import { MedicationsPanelComponent } from './components/medications-panel/medications-panel.component';
import { EmergencyPanelComponent } from './components/emergency-panel/emergency-panel.component';
import { DetailsModalComponent } from './components/details-modal/details-modal.component';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';
import { AlarmModalComponent } from './components/alarm-modal/alarm-modal.component';
import { RecordsPanelComponent } from './components/records-panel/records-panel.component';
import { ProfileModalComponent } from './components/profile-modal/profile-modal.component';
import { UpcomingFeaturesPanelComponent } from './components/upcoming-features-panel/upcoming-features-panel.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, ChatBubbleComponent, HistoryPanelComponent, ShareModalComponent, MedicationsPanelComponent, EmergencyPanelComponent, DetailsModalComponent, SettingsModalComponent, AlarmModalComponent, RecordsPanelComponent, ProfileModalComponent, UpcomingFeaturesPanelComponent],
  host: {
    '(document:click)': 'onDocumentClick($event)',
  }
})
export class AppComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  @ViewChild('languageMenuContainer') private languageMenuContainer?: ElementRef;

  chatService = inject(ChatService);
  languageService = inject(LanguageService);
  speechService = inject(SpeechRecognitionService);
  historyService = inject(HistoryService);
  medicationService = inject(MedicationService);

  isDarkMode = signal(false);
  isHistoryPanelOpen = signal(true);
  isSettingsModalOpen = signal(false);
  isProfileModalOpen = signal(false);
  isLanguageMenuOpen = signal(false);
  userInput = signal('');
  activeView = signal<'chat' | 'medications' | 'emergency' | 'records' | 'upcoming'>('chat');

  constructor() {
    effect(() => {
      if (this.isDarkMode()) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });

    effect(() => {
      const transcript = this.speechService.transcript();
      if (transcript) {
        this.userInput.set(transcript);
      }
    });
  }

  ngOnInit() {
    this.scrollToBottom();
  }
  
  ngAfterViewChecked() {
    if(this.activeView() === 'chat') {
      this.scrollToBottom();
    }
  }
  
  onDocumentClick(event: MouseEvent): void {
    if (this.isLanguageMenuOpen() && this.languageMenuContainer && !this.languageMenuContainer.nativeElement.contains(event.target)) {
      this.isLanguageMenuOpen.set(false);
    }
  }

  toggleDarkMode(): void {
    this.isDarkMode.update(value => !value);
  }

  openSettingsModal(): void {
    this.isSettingsModalOpen.set(true);
  }

  closeSettingsModal(): void {
    this.isSettingsModalOpen.set(false);
  }
  
  openProfileModal(): void {
    this.isProfileModalOpen.set(true);
  }

  closeProfileModal(): void {
    this.isProfileModalOpen.set(false);
  }

  toggleHistoryPanel(): void {
    this.isHistoryPanelOpen.update(value => !value);
  }

  sendMessage(): void {
    const message = this.userInput().trim();
    if (message) {
      this.chatService.sendMessage(message);
      this.userInput.set('');
    }
  }

  handleAction(text: string): void {
    this.userInput.set(text);
  }

  toggleListening(): void {
    if (this.speechService.isListening()) {
      this.speechService.stopListening();
    } else {
      this.speechService.startListening(this.languageService.currentLanguage());
    }
  }
  
  setView(view: 'chat' | 'medications' | 'emergency' | 'records' | 'upcoming'): void {
    this.activeView.set(view);
  }

  toggleLanguageMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isLanguageMenuOpen.update(value => !value);
  }

  setLanguage(langCode: string): void {
    this.languageService.setLanguage(langCode);
    this.isLanguageMenuOpen.set(false);
  }

  private scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Could not scroll to bottom:', err);
    }
  }
}
