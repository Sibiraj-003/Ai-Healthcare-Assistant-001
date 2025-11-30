import { Component, ChangeDetectionStrategy, input, computed, inject, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../services/chat.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TtsService } from '../../services/tts.service';
import { LanguageService } from '../../services/language.service';

interface HtmlBlock {
  type: 'html';
  content: SafeHtml;
}
interface OptionsBlock {
  type: 'options';
  content: string[];
}
interface ActionsBlock {
  type: 'actions';
  content: string[];
}
type ContentBlock = HtmlBlock | OptionsBlock | ActionsBlock;

@Component({
  selector: 'app-chat-bubble',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-bubble.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatBubbleComponent {
  message = input.required<ChatMessage>();
  selectionChange = output<string>();
  actionClick = output<string>();

  private sanitizer = inject(DomSanitizer);
  private ttsService = inject(TtsService);
  private languageService = inject(LanguageService);
  private readonly actionableRegex = /\[(option|action):\s*(.*?)\]/g;
  
  readonly displayedContent = signal<string>('...');
  readonly selectedOptions = signal<string[]>([]);
  readonly copyStatus = signal<'idle' | 'copied'>('idle');
  readonly ttsSupported = this.ttsService.isSupported;

  constructor() {
    effect(async (onCleanup) => {
      const msg = this.message();
      // By reading the signal here, the effect will re-run when the language changes.
      const targetLang = this.languageService.currentLanguage(); 
      
      let isStale = false;
      onCleanup(() => {
        isStale = true;
      });

      // Set a loading state immediately, indicating translation is in progress.
      this.displayedContent.set('...');
      
      // The language service handles caching and queuing, so we just await the result.
      const translated = await this.languageService.translateText(msg.originalContent, msg.originalLang);

      // If the effect has been re-run (e.g., language changed again) before this 
      // async operation finished, don't update the content to avoid race conditions.
      if (!isStale) {
        this.displayedContent.set(translated);
      }
    });
  }

  isUser(): boolean {
    return this.message().sender === 'user';
  }

  readonly hasOptionsOrActions = computed<boolean>(() => {
    return !this.isUser() && /\[(option|action):/.test(this.displayedContent());
  });

  readonly isCurrentlyPlaying = computed(() => {
    return this.ttsService.isPlaying() && this.ttsService.currentlyPlayingMessageId() === this.message().id;
  });

  readonly plainTextContent = computed(() => {
    return this.displayedContent()
      .replace(/\[(option|action):.*?\]/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/^\s*\*\s/gm, '')
      .trim();
  });

  readonly renderedBlocks = computed<ContentBlock[]>(() => {
    const content = this.displayedContent();
    if (content === '...') {
      return [{
        type: 'html',
        content: this.sanitizer.bypassSecurityTrustHtml('<div class="h-4 w-24 bg-slate-300 dark:bg-slate-600 rounded animate-pulse"></div>')
      }];
    }
    
    if (this.isUser()) {
      const sanitizedContent = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return [{
        type: 'html',
        content: this.sanitizer.bypassSecurityTrustHtml(`<p class="whitespace-pre-wrap">${sanitizedContent}</p>`)
      }];
    }

    const blocks: ContentBlock[] = [];
    let lastIndex = 0;
    let match;
    let currentOptions: string[] = [];
    let currentActions: string[] = [];
    
    const localActionableRegex = new RegExp(this.actionableRegex);

    while ((match = localActionableRegex.exec(content)) !== null) {
        const textBefore = content.substring(lastIndex, match.index).trim();
        if (textBefore) {
            if (currentOptions.length > 0) { blocks.push({ type: 'options', content: currentOptions }); currentOptions = []; }
            if (currentActions.length > 0) { blocks.push({ type: 'actions', content: currentActions }); currentActions = []; }
            blocks.push({ type: 'html', content: this.formatTextToHtml(textBefore) });
        }
        
        const type = match[1]; // 'option' or 'action'
        const value = match[2].trim();

        if (type === 'option') {
          if (currentActions.length > 0) { blocks.push({ type: 'actions', content: currentActions }); currentActions = []; }
          currentOptions.push(value);
        } else if (type === 'action') {
          if (currentOptions.length > 0) { blocks.push({ type: 'options', content: currentOptions }); currentOptions = []; }
          currentActions.push(value);
        }

        lastIndex = localActionableRegex.lastIndex;
    }

    if (currentOptions.length > 0) { blocks.push({ type: 'options', content: currentOptions }); }
    if (currentActions.length > 0) { blocks.push({ type: 'actions', content: currentActions }); }

    const textAfter = content.substring(lastIndex).trim();
    if (textAfter) {
        blocks.push({ type: 'html', content: this.formatTextToHtml(textAfter) });
    }
    
    return blocks;
  });

  private formatTextToHtml(text: string): SafeHtml {
    let processedContent = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const lines = processedContent.split('\n');
    let html = '';
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('* ')) {
        if (!inList) {
          html += '<ul class="list-disc list-inside my-2 space-y-1">';
          inList = true;
        }
        html += `<li>${trimmedLine.substring(2)}</li>`;
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        if (trimmedLine) {
           html += `<p class="mb-2 last:mb-0">${trimmedLine}</p>`;
        }
      }
    }

    if (inList) {
      html += '</ul>';
    }
    
    if (html === '' && text.trim() !== '') {
        html = `<p>${text}</p>`;
    }

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  isSelected(option: string): boolean {
    return this.selectedOptions().includes(option);
  }

  toggleOption(option: string): void {
    this.selectedOptions.update(current => {
      if (current.includes(option)) {
        return current.filter(o => o !== option);
      } else {
        return [...current, option];
      }
    });
    this.selectionChange.emit(this.selectedOptions().join(', '));
  }

  togglePlayPause(): void {
    if (this.isCurrentlyPlaying()) {
      this.ttsService.cancel();
    } else {
      const currentLang = this.languageService.currentLanguage();
      this.ttsService.play(this.plainTextContent(), this.message().id, currentLang);
    }
  }

  copyContent(): void {
    navigator.clipboard.writeText(this.plainTextContent()).then(() => {
      this.copyStatus.set('copied');
      setTimeout(() => this.copyStatus.set('idle'), 2000);
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  }
}