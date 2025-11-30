import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Medication } from '../../models/medication.model';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-alarm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alarm-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlarmModalComponent {
  medication = input.required<Medication>();
  dismiss = output<void>();
  languageService = inject(LanguageService);
}
