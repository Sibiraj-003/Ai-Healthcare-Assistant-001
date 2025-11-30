import { Component, ChangeDetectionStrategy, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Medication } from '../../models/medication.model';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-add-medication-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-medication-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddMedicationModalComponent {
  close = output<void>();
  save = output<Omit<Medication, 'id'>>();
  languageService = inject(LanguageService);

  newMedication = {
    name: '',
    dosage: '',
    frequency: '',
    time: '',
    tabletCount: null as number | null
  };

  saveMedication(event: Event): void {
    event.preventDefault();
    if (this.newMedication.name && this.newMedication.dosage && this.newMedication.time) {
      const { name, dosage, time, tabletCount, frequency } = this.newMedication;
      const medicationToSave: Omit<Medication, 'id'> = { name, dosage, time };
      if (frequency && frequency.trim()) {
        medicationToSave.frequency = frequency.trim();
      }
      if (tabletCount && tabletCount > 0) {
        medicationToSave.tabletCount = tabletCount;
      }
      this.save.emit(medicationToSave);
      this.close.emit();
    }
  }
}
