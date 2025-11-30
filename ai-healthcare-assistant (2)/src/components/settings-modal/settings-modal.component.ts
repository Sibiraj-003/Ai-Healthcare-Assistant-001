import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsModalComponent {
  isDarkMode = input.required<boolean>();
  close = output<void>();
  toggleTheme = output<void>();
  languageService = inject(LanguageService);
}
