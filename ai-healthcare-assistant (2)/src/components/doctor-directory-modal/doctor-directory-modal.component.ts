import { Component, ChangeDetectionStrategy, output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorService } from '../../services/doctor.service';
import { LanguageService } from '../../services/language.service';
import { Doctor } from '../../models/doctor.model';

@Component({
  selector: 'app-doctor-directory-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-directory-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorDirectoryModalComponent {
  close = output<void>();
  doctorService = inject(DoctorService);
  languageService = inject(LanguageService);

  searchTerm = signal('');

  filteredDoctors = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const allDoctors = this.doctorService.doctors();
    if (!term) {
      return allDoctors;
    }
    return allDoctors.filter(doc =>
      doc.name.toLowerCase().includes(term) ||
      doc.hospital.toLowerCase().includes(term) ||
      doc.district.toLowerCase().includes(term) ||
      doc.role.toLowerCase().includes(term)
    );
  });

  callDoctor(phone: string): void {
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    }
  }
}
