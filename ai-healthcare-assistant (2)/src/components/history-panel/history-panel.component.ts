import { Component, ChangeDetectionStrategy, inject, signal, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryService, ChatSession } from '../../services/history.service';
import { ShareModalComponent } from '../share-modal/share-modal.component';
import { RenameChatModalComponent } from '../rename-chat-modal/rename-chat-modal.component';
import { DetailsModalComponent } from '../details-modal/details-modal.component';
import { ConfirmationModalComponent } from '../confirmation-modal/confirmation-modal.component';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-history-panel',
  standalone: true,
  imports: [CommonModule, ShareModalComponent, RenameChatModalComponent, DetailsModalComponent, ConfirmationModalComponent],
  templateUrl: './history-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  }
})
export class HistoryPanelComponent {
  historyService = inject(HistoryService);
  languageService = inject(LanguageService);
  openMenuId = signal<string | null>(null);
  sessionToRename = signal<ChatSession | null>(null);
  sessionPendingDeleteId = signal<string | null>(null);
  isClearAllConfirmVisible = signal(false);

  @ViewChildren('menuContainer') menuContainers!: QueryList<ElementRef>;

  onDocumentClick(event: MouseEvent): void {
    if (!this.openMenuId()) {
      return;
    }
    const clickedInside = this.menuContainers.some(
      (container) => container.nativeElement.contains(event.target)
    );
    if (!clickedInside) {
      this.openMenuId.set(null);
    }
  }

  startNewChat(): void {
    this.sessionToRename.set(null);
    this.historyService.startNewChat();
  }

  selectChat(sessionId: string): void {
    if (this.sessionPendingDeleteId() === sessionId) return;
    this.historyService.setActiveSession(sessionId);
    this.openMenuId.set(null);
  }

  toggleMenu(sessionId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuId.update(id => (id === sessionId ? null : sessionId));
  }

  startRename(session: ChatSession, event: MouseEvent): void {
    event.stopPropagation();
    this.sessionToRename.set(session);
    this.openMenuId.set(null);
  }

  saveNewTitle(newTitle: string): void {
    const session = this.sessionToRename();
    if (session) {
      this.historyService.updateSessionTitle(session.id, newTitle);
    }
    this.sessionToRename.set(null);
  }

  closeRenameModal(): void {
    this.sessionToRename.set(null);
  }

  promptDeleteChat(sessionId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.sessionPendingDeleteId.set(sessionId);
    this.openMenuId.set(null);
  }

  confirmDeleteChat(): void {
    const sessionId = this.sessionPendingDeleteId();
    if (sessionId) {
      this.historyService.deleteSession(sessionId);
    }
    this.sessionPendingDeleteId.set(null);
  }

  cancelDeleteChat(): void {
    this.sessionPendingDeleteId.set(null);
  }

  downloadChat(session: ChatSession, event: MouseEvent): void {
    event.stopPropagation();
    const formattedContent = session.messages
// FIX: Corrected property access from 'm.content' to 'm.originalContent' to align with the ChatMessage interface.
      .map(m => `${m.sender === 'user' ? 'You' : 'AI Assistant'}:\n${m.originalContent}\n`)
      .join('\n---\n\n');
    const blob = new Blob([formattedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/ /g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.openMenuId.set(null);
  }

  openShareModal(session: ChatSession, event: MouseEvent): void {
    event.stopPropagation();
    this.historyService.openShareModal(session);
    this.openMenuId.set(null);
  }

  openDetailsModal(session: ChatSession, event: MouseEvent): void {
    event.stopPropagation();
    this.historyService.openDetailsModal(session);
    this.openMenuId.set(null);
  }

  promptClearAllHistory(): void {
    this.isClearAllConfirmVisible.set(true);
  }

  confirmClearAllHistory(): void {
    this.historyService.clearAllSessions();
    this.isClearAllConfirmVisible.set(false);
  }

  cancelClearAllHistory(): void {
    this.isClearAllConfirmVisible.set(false);
  }
}
