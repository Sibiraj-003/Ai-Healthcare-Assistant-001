import { Component, ChangeDetectionStrategy, output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../services/language.service';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileModalComponent implements OnInit {
  close = output<void>();
  languageService = inject(LanguageService);
  userService = inject(UserService);

  whatsappNumber = signal('');

  ngOnInit(): void {
    this.whatsappNumber.set(this.userService.whatsappNumber());
  }

  saveSettings(): void {
    this.userService.setWhatsappNumber(this.whatsappNumber());
    this.close.emit();
  }
}
