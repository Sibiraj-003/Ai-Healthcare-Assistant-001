import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { ChatMessage } from './chat.service';
import { LanguageService } from './language.service';

export interface ChatOpenLog {
  openedAt: number;
  closedAt?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  isGeneratingTitle?: boolean;
  // New properties
  updatedAt?: number;
  openCount: number;
  openLog: ChatOpenLog[];
}

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private readonly STORAGE_KEY = 'ai_healthcare_history';
  private languageService = inject(LanguageService);

  readonly sessions = signal<ChatSession[]>([]);
  readonly activeSessionId = signal<string | null>(null);
  readonly sessionToShare = signal<ChatSession | null>(null);
  readonly sessionForDetails = signal<ChatSession | null>(null);

  readonly activeSession = computed(() => {
    const id = this.activeSessionId();
    return this.sessions().find(s => s.id === id) ?? null;
  });

  readonly activeSessionMessages = computed(() => {
    return this.activeSession()?.messages ?? [];
  });

  constructor() {
    this.loadHistoryFromStorage();
    if (this.sessions().length === 0) {
      this.startNewChat();
    } else {
      this.setActiveSession(this.sessions()[0].id);
    }

    // Effect to save to localStorage whenever sessions change
    effect(() => {
      this.saveHistoryToStorage(this.sessions());
    });
  }

  startNewChat(): void {
    const now = Date.now();
    const newSession: ChatSession = {
      id: now.toString() + Math.random().toString(36).substring(2),
      title: 'newChat', // Use key instead of resolved text
      messages: [
        { 
          id: 'initial-bot-message',
          sender: 'bot', 
          originalContent: 'Hello! How can I help you with your health questions today?',
          originalLang: 'en'
        }
      ],
      createdAt: now,
      updatedAt: now,
      isGeneratingTitle: true,
      openCount: 0, // will be set to 1 by setActiveSession
      openLog: [] // will be populated by setActiveSession
    };
    this.sessions.update(s => [newSession, ...s]);
    this.setActiveSession(newSession.id);
  }

  setActiveSession(sessionId: string): void {
    const previousSessionId = this.activeSessionId();
    if (previousSessionId === sessionId) {
      return;
    }

    const now = Date.now();

    this.sessions.update(sessions => {
      const newSessions = [...sessions];
      
      // Close previous session
      const prevIndex = newSessions.findIndex(s => s.id === previousSessionId);
      if (prevIndex !== -1) {
        const sessionToClose = { ...newSessions[prevIndex] };
        if (sessionToClose.openLog && sessionToClose.openLog.length > 0) {
          const lastLog = sessionToClose.openLog[sessionToClose.openLog.length - 1];
          if (lastLog && !lastLog.closedAt) {
            const updatedLogs = [...sessionToClose.openLog];
            updatedLogs[updatedLogs.length - 1] = { ...lastLog, closedAt: now };
            sessionToClose.openLog = updatedLogs;
            sessionToClose.updatedAt = now;
            newSessions[prevIndex] = sessionToClose;
          }
        }
      }

      // Open new session
      const nextIndex = newSessions.findIndex(s => s.id === sessionId);
      if (nextIndex !== -1) {
        const sessionToOpen = { ...newSessions[nextIndex] };
        sessionToOpen.openCount = (sessionToOpen.openCount || 0) + 1;
        sessionToOpen.openLog = [...(sessionToOpen.openLog || []), { openedAt: now }];
        sessionToOpen.updatedAt = now;
        newSessions[nextIndex] = sessionToOpen;
      }
      
      return newSessions;
    });

    this.activeSessionId.set(sessionId);
  }

  deleteSession(sessionId: string): void {
    this.sessions.update(s => s.filter(session => session.id !== sessionId));
    if (this.activeSessionId() === sessionId) {
      if (this.sessions().length > 0) {
        this.setActiveSession(this.sessions()[0].id);
      } else {
        this.startNewChat();
      }
    }
  }

  addMessageToActiveSession(message: Omit<ChatMessage, 'id'>): void {
    const id = this.activeSessionId();
    if (!id) return;

    const messageWithId: ChatMessage = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substring(2),
    };

    this.sessions.update(sessions => 
      sessions.map(s => 
        s.id === id 
          ? { ...s, messages: [...s.messages, messageWithId], updatedAt: Date.now() } 
          : s
      )
    );
  }

  updateActiveSessionTitle(title: string): void {
    const id = this.activeSessionId();
    if (!id) return;
    this.sessions.update(sessions => 
      sessions.map(s => 
        s.id === id 
          ? { ...s, title, isGeneratingTitle: false } 
          : s
      )
    );
  }

  setActiveSessionTitle(title: string): void {
    const id = this.activeSessionId();
    if (!id) return;
    this.sessions.update(sessions => 
      sessions.map(s => 
        s.id === id 
          ? { ...s, title } 
          : s
      )
    );
  }

  endActiveSessionTitleGeneration(): void {
    const id = this.activeSessionId();
    if (!id) return;
    this.sessions.update(sessions => 
      sessions.map(s => 
        s.id === id 
          ? { ...s, isGeneratingTitle: false } 
          : s
      )
    );
  }

  updateSessionTitle(sessionId: string, newTitle: string): void {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    this.sessions.update(sessions =>
      sessions.map(s =>
        s.id === sessionId
          ? { ...s, title: trimmedTitle }
          : s
      )
    );
  }

  disableMessageActions(messageId: string): void {
    const sessionId = this.activeSessionId();
    if (!sessionId) return;

    this.sessions.update(sessions =>
        sessions.map(s => {
            if (s.id === sessionId) {
                return {
                    ...s,
                    messages: s.messages.map(m =>
                        m.id === messageId ? { ...m, isActionable: false } : m
                    )
                };
            }
            return s;
        })
    );
  }

  clearAllSessions(): void {
    this.sessions.set([]);
    this.startNewChat();
  }
  
  openShareModal(session: ChatSession): void {
    this.sessionToShare.set(session);
  }

  closeShareModal(): void {
    this.sessionToShare.set(null);
  }
  
  openDetailsModal(session: ChatSession): void {
    this.sessionForDetails.set(session);
  }

  closeDetailsModal(): void {
    this.sessionForDetails.set(null);
  }

  private loadHistoryFromStorage(): void {
    try {
      const storedHistory = localStorage.getItem(this.STORAGE_KEY);
      if (storedHistory) {
        const sessions: ChatSession[] = JSON.parse(storedHistory);
        // Ensure new fields exist and no sessions are stuck in a title-generating state on load
        const sanitizedSessions = sessions.map(s => ({ 
          ...s, 
          isGeneratingTitle: false,
          openCount: s.openCount || 0,
          openLog: s.openLog || [],
        }));
        this.sessions.set(sanitizedSessions);
      }
    } catch (e) {
      console.error('Failed to load chat history from localStorage', e);
    }
  }

  private saveHistoryToStorage(sessions: ChatSession[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save chat history to localStorage', e);
    }
  }
}