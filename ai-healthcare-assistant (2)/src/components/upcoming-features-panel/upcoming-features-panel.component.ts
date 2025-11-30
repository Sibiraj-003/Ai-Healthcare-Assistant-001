import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-upcoming-features-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upcoming-features-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingFeaturesPanelComponent {
  languageService = inject(LanguageService);
}
