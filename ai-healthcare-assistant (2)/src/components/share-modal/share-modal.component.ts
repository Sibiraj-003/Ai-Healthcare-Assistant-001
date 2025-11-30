import { Component, ChangeDetectionStrategy, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatSession } from '../../services/history.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-share-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './share-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareModalComponent implements OnInit {
  session = input.required<ChatSession>();
  close = output<void>();

  private languageService = inject(LanguageService);
  copyStatus = signal<'idle' | 'copied'>('idle');
  shareText = signal<string>('');
  isTranslating = signal<boolean>(true);

  ngOnInit(): void {
    this.generateShareableText();
  }

  async generateShareableText(): Promise<void> {
    this.isTranslating.set(true);
    
    const translationPromises = this.session().messages.map(m => 
      this.languageService.translateText(m.originalContent, m.originalLang)
    );
    const translatedMessages = await Promise.all(translationPromises);

    const formattedText = this.session().messages.map((m, i) => 
      `${m.sender === 'user' ? 'You' : 'AI Assistant'}: ${translatedMessages[i]}`
    ).join('\n\n');

    this.shareText.set(formattedText);
    this.isTranslating.set(false);
  }

  share(platform: 'whatsapp' | 'twitter' | 'email' | 'facebook'): void {
    const text = this.shareText();
    const encodedText = encodeURIComponent(text);
    const title = encodeURIComponent(this.session().title);
    let url = '';

    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodedText}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedText}`;
        break;
      case 'email':
        url = `mailto:?subject=${title}&body=${encodedText}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=https://aistudio.google.com&quote=${encodedText}`;
        break;
    }
    
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  copyToClipboard(): void {
    const text = this.shareText();
    navigator.clipboard.writeText(text).then(() => {
      this.copyStatus.set('copied');
      setTimeout(() => this.copyStatus.set('idle'), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      alert('Could not copy text to clipboard.');
    });
  }
}