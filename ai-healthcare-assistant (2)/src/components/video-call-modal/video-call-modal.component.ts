import { Component, ChangeDetectionStrategy, output, inject, signal, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-video-call-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-call-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoCallModalComponent implements AfterViewInit, OnDestroy {
  close = output<void>();
  languageService = inject(LanguageService);

  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  stream: MediaStream | null = null;
  isMuted = signal(false);
  isVideoOff = signal(false);
  callStatus = signal<'connecting' | 'connected' | 'error'>('connecting');
  errorMessage = signal('');

  ngAfterViewInit(): void {
    // Defer execution slightly to ensure view is fully initialized and the element is available.
    setTimeout(async () => {
      try {
        if (!this.videoPlayer || !this.videoPlayer.nativeElement) {
            console.error('Video player element not found after timeout.');
            this.callStatus.set('error');
            this.errorMessage.set('Could not initialize video component.');
            return;
        }

        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        this.videoPlayer.nativeElement.srcObject = this.stream;
        this.callStatus.set('connected');
      } catch (err) {
        console.error('Error accessing media devices.', err);
        this.callStatus.set('error');
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') {
            this.errorMessage.set('Camera and microphone access was denied. Please enable it in your browser settings.');
          } else if (err.name === 'NotFoundError') {
            this.errorMessage.set('No camera or microphone found on this device.');
          } else {
            this.errorMessage.set(`Could not start video source. Error: ${err.name}`);
          }
        } else {
          this.errorMessage.set('An unknown error occurred while accessing media devices.');
        }
      }
    }, 0);
  }

  ngOnDestroy(): void {
    this.endCall();
  }

  toggleAudio(): void {
    if (!this.stream) return;
    this.isMuted.update(v => !v);
    this.stream.getAudioTracks().forEach(track => track.enabled = !this.isMuted());
  }

  toggleVideo(): void {
    if (!this.stream) return;
    this.isVideoOff.update(v => !v);
    this.stream.getVideoTracks().forEach(track => track.enabled = !this.isVideoOff());
  }

  endCall(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.close.emit();
  }
}
