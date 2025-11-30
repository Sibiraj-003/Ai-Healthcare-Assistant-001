import { Injectable, signal } from '@angular/core';
import { Doctor } from '../models/doctor.model';
import { DOCTORS } from '../data/doctors';

@Injectable({
  providedIn: 'root',
})
export class DoctorService {
  readonly doctors = signal<Doctor[]>([]);

  constructor() {
    // Sort doctors by name initially
    const sortedDoctors = [...DOCTORS].sort((a, b) => a.name.localeCompare(b.name));
    this.doctors.set(sortedDoctors);
  }
}
