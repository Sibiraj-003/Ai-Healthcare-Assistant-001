import { Injectable, signal, inject } from '@angular/core';
import { GeminiService } from './gemini.service';
import { HistoryService } from './history.service';
import { LanguageService } from './language.service';

export interface ChatMessage {
  id: string;
  originalContent: string;
  originalLang: string; // BCP-47 tag
  sender: 'user' | 'bot';
  isActionable?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private geminiService = inject(GeminiService);
  private historyService = inject(HistoryService);
  private languageService = inject(LanguageService);

  readonly isLoading = signal(false);
  private readonly actionableRegex = /\[(option|action):.*]/;

  async sendMessage(userInput: string): Promise<void> {
    this.isLoading.set(true);
    
    // Find the last bot message that had actionable options and disable it.
    const messages = this.historyService.activeSessionMessages();
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.sender === 'bot' && msg.isActionable) {
            this.historyService.disableMessageActions(msg.id);
            break; // only disable the last one
        }
    }

    // Add user message to the active session. Use current UI language for now.
    this.historyService.addMessageToActiveSession({ 
      sender: 'user', 
      originalContent: userInput,
      originalLang: this.languageService.currentLanguage()
    });

    const isNewChat = this.historyService.activeSession()?.isGeneratingTitle ?? false;
    const currentHistory = this.historyService.activeSessionMessages();

    try {
      const aiResponse = await this.geminiService.generateResponse(currentHistory);
      
      // Update language based on AI detection
      this.languageService.setLanguage(aiResponse.detectedLanguage);

      // Update title if it's a new chat and a title was generated
      if (isNewChat && aiResponse.chatTitle) {
          this.historyService.updateActiveSessionTitle(aiResponse.chatTitle);
      } else if (isNewChat) {
          // Fallback title if AI fails to provide one
          this.historyService.updateActiveSessionTitle('Untitled Chat');
      }

      console.log('Structured data from AI:', aiResponse.jsonData); // For debugging
      const isActionable = this.actionableRegex.test(aiResponse.displayText);
      
      this.historyService.addMessageToActiveSession({ 
        sender: 'bot', 
        originalContent: aiResponse.displayText,
        originalLang: aiResponse.detectedLanguage, // Use the detected language for the bot message
        isActionable: isActionable 
      });

    } catch (error) {
      console.error('Failed to get response from bot:', error);
      this.historyService.addMessageToActiveSession({ 
        sender: 'bot', 
        originalContent: 'Sorry, I am having trouble connecting. Please try again.',
        originalLang: 'en'
      });
    } finally {
      this.isLoading.set(false);
    }
  }
}
