import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicationService } from '../../services/medication.service';
import { Medication } from '../../models/medication.model';
import { AddMedicationModalComponent } from '../add-medication-modal/add-medication-modal.component';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-medications-panel',
  standalone: true,
  imports: [CommonModule, AddMedicationModalComponent],
  templateUrl: './medications-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MedicationsPanelComponent {
  medicationService = inject(MedicationService);
  languageService = inject(LanguageService);

  isAddModalOpen = signal(false);

  addMedication(med: Omit<Medication, 'id'>): void {
    this.medicationService.addMedication(med);
  }

  deleteMedication(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.medicationService.deleteMedication(id);
  }
}
