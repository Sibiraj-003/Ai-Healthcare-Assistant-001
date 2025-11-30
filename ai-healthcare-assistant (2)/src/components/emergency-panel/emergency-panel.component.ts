import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmergencyService } from '../../services/emergency.service';
import { LanguageService } from '../../services/language.service';
import { GeolocationService } from '../../services/geolocation.service';
import { DoctorDirectoryModalComponent } from '../doctor-directory-modal/doctor-directory-modal.component';
import { VideoCallModalComponent } from '../video-call-modal/video-call-modal.component';

@Component({
  selector: 'app-emergency-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DoctorDirectoryModalComponent, VideoCallModalComponent],
  templateUrl: './emergency-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmergencyPanelComponent {
  emergencyService = inject(EmergencyService);
  languageService = inject(LanguageService);
  geolocationService = inject(GeolocationService);

  isAddingContact = signal(false);
  isDoctorDirectoryOpen = signal(false);
  isVideoCallOpen = signal(false);
  
  newContact = {
    name: '',
    phone: '',
    relation: ''
  };

  // State for fallback modal
  isCopyLocationModalOpen = signal(false);
  locationToCopy = signal('');
  copyStatus = signal<'idle' | 'copied'>('idle');


  toggleAddContact(): void {
    this.isAddingContact.update(v => !v);
    if (!this.isAddingContact()) {
      this.resetForm();
    }
  }

  saveContact(): void {
    if (this.newContact.name && this.newContact.phone) {
      this.emergencyService.addContact({
        name: this.newContact.name,
        phone: this.newContact.phone,
        relation: this.newContact.relation
      });
      this.toggleAddContact();
      this.resetForm();
    }
  }

  deleteContact(id: string): void {
    this.emergencyService.deleteContact(id);
  }

  resetForm(): void {
    this.newContact = { name: '', phone: '', relation: '' };
  }

  callNumber(phone: string): void {
    window.open(`tel:${phone}`, '_self');
  }

  async callWithLocation(phone: string): Promise<void> {
    try {
      const coords = await this.geolocationService.getCurrentPosition();
      const locationString = `My location is: Latitude ${coords.latitude.toFixed(5)}, Longitude ${coords.longitude.toFixed(5)}.`;
      alert(`Please share your location with the operator:\n\n${locationString}`);
      this.callNumber(phone);
    } catch (error) {
      alert(`Could not get location. ${error}. Calling without location.`);
      this.callNumber(phone);
    }
  }

  findNearby(type: 'hospital' | 'pharmacy'): void {
    window.open(`https://www.google.com/maps/search/?api=1&query=${type}`, '_blank');
  }

  async shareLocation(): Promise<void> {
    try {
      const coords = await this.geolocationService.getCurrentPosition();
      const mapUrl = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
      
      // Directly open our custom fallback modal instead of trying native share.
      // This provides a consistent experience and avoids the native browser error UI.
      this.locationToCopy.set(mapUrl);
      this.isCopyLocationModalOpen.set(true);

    } catch (error) {
      alert(`Could not get your location. Please check device permissions. Error: ${error}`);
    }
  }

  shareLocationVia(platform: 'whatsapp' | 'twitter' | 'email' | 'facebook'): void {
    const text = `I'm in an emergency. Here is my current location: ${this.locationToCopy()}`;
    const encodedText = encodeURIComponent(text);
    const urlToShare = encodeURIComponent(this.locationToCopy());
    let url = '';

    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodedText}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedText}`;
        break;
      case 'email':
        url = `mailto:?subject=Emergency%20Location&body=${encodedText}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${urlToShare}&quote=${encodedText}`;
        break;
    }
    
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async alertAllContacts(): Promise<void> {
    const contacts = this.emergencyService.contacts();
    if (contacts.length === 0) {
      alert('Please add emergency contacts first.');
      return;
    }
    
    try {
      const coords = await this.geolocationService.getCurrentPosition();
      const mapUrl = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
      const message = `Emergency! I need help. My current location is: ${mapUrl}`;
      const phoneNumbers = contacts.map(c => c.phone.replace(/\s+/g, '')).join(',');
      
      window.open(`sms:${phoneNumbers}?&body=${encodeURIComponent(message)}`, '_self');

    } catch (error) {
       alert(`Could not get location. ${error}.`);
    }
  }

  // --- Fallback Modal Methods ---
  closeCopyLocationModal(): void {
    this.isCopyLocationModalOpen.set(false);
    this.locationToCopy.set('');
    this.copyStatus.set('idle');
  }

  copyLocationToClipboard(): void {
    if(!this.locationToCopy()) return;
    navigator.clipboard.writeText(this.locationToCopy()).then(() => {
      this.copyStatus.set('copied');
      setTimeout(() => {
        this.copyStatus.set('idle');
      }, 2000); // Reset after 2 seconds
    }).catch(err => {
      console.error('Failed to copy text:', err);
      alert('Could not copy link. Please copy it manually.');
    });
  }
}
