import { Component, ChangeDetectionStrategy, inject, signal, computed, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecordsService } from '../../services/records.service';
import { LanguageService } from '../../services/language.service';
import { MedicalFolder, MedicalDocument } from '../../models/medical-records.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type ModalType = 'createFolder' | 'uploadDocument' | 'renameFolder' | 'renameDocument' | 'viewDocument' | 'deleteFolderConfirm' | 'deleteDocumentConfirm' | null;

@Component({
  selector: 'app-records-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './records-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  }
})
export class RecordsPanelComponent {
  recordsService = inject(RecordsService);
  languageService = inject(LanguageService);
  private sanitizer = inject(DomSanitizer);

  @ViewChildren('menuContainer') menuContainers!: QueryList<ElementRef>;

  // UI State
  view = signal<'folders' | 'documents'>('folders');
  selectedFolderId = signal<string | null>(null);
  activeModal = signal<ModalType>(null);
  openMenuId = signal<string | null>(null);
  isShareFallbackModalOpen = signal(false);

  // Data for Modals
  newFolderName = signal('');
  documentToUpload: { file: File | null, folderId: string } = { file: null, folderId: '' };
  itemToRename = signal<{ id: string, name: string } | null>(null);
  itemToDelete = signal<{ id: string, name: string } | null>(null);
  documentToView = signal<MedicalDocument | null>(null);
  documentToShare = signal<MedicalDocument | null>(null);

  // Computed Signals
  folders = this.recordsService.folders;
  selectedFolder = computed(() => {
    const id = this.selectedFolderId();
    return id ? this.folders().find(f => f.id === id) : null;
  });
  documentsInSelectedFolder = computed(() => {
    const folderId = this.selectedFolderId();
    if (!folderId) return [];
    return this.recordsService.documents().filter(d => d.folderId === folderId);
  });

  getDocumentCount(folderId: string): number {
    return this.recordsService.documents().filter(doc => doc.folderId === folderId).length;
  }

  // --- View Management ---
  selectFolder(folder: MedicalFolder): void {
    this.selectedFolderId.set(folder.id);
    this.view.set('documents');
    this.openMenuId.set(null);
  }

  goBackToFolders(): void {
    this.selectedFolderId.set(null);
    this.view.set('folders');
  }

  // --- Menu Management ---
  toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuId.update(currentId => (currentId === id ? null : id));
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.openMenuId()) return;
    const clickedInside = this.menuContainers.some(
      (container) => container.nativeElement.contains(event.target)
    );
    if (!clickedInside) {
      this.openMenuId.set(null);
    }
  }

  // --- Modal Management ---
  openModal(modalType: ModalType, data?: any): void {
    this.activeModal.set(modalType);
    this.openMenuId.set(null); // Close any open menus
    if (data) {
      if (modalType === 'renameFolder' || modalType === 'renameDocument') this.itemToRename.set(data);
      if (modalType === 'deleteFolderConfirm' || modalType === 'deleteDocumentConfirm') this.itemToDelete.set(data);
      if (modalType === 'viewDocument') this.documentToView.set(data);
    }
  }

  closeModal(): void {
    this.activeModal.set(null);
    // Reset modal-specific data
    this.newFolderName.set('');
    this.documentToUpload = { file: null, folderId: '' };
    this.itemToRename.set(null);
    this.itemToDelete.set(null);
    this.documentToView.set(null);
  }

  closeShareFallbackModal(): void {
    this.isShareFallbackModalOpen.set(false);
    this.documentToShare.set(null);
  }

  // --- Action Handlers ---
  handleCreateFolder(): void {
    this.recordsService.createFolder(this.newFolderName());
    this.closeModal();
  }
  
  handleFileSelected(event: Event): void {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files[0]) {
          this.documentToUpload.file = input.files[0];
      }
  }

  async handleUploadDocument(): Promise<void> {
    const { file, folderId } = this.documentToUpload;
    const targetFolderId = folderId || this.selectedFolderId();
    if (file && targetFolderId) {
      try {
        await this.recordsService.uploadDocument(targetFolderId, file);
      } catch (error) {
        console.error('Upload failed', error);
        alert('File could not be uploaded. It might be too large.');
      } finally {
        this.closeModal();
      }
    }
  }

  handleRename(): void {
    const item = this.itemToRename();
    if (!item) return;

    if (this.activeModal() === 'renameFolder') {
      this.recordsService.renameFolder(item.id, item.name);
    } else if (this.activeModal() === 'renameDocument') {
      this.recordsService.renameDocument(item.id, item.name);
    }
    this.closeModal();
  }

  handleDelete(): void {
    const item = this.itemToDelete();
    if (!item) return;

    if (this.activeModal() === 'deleteFolderConfirm') {
      this.recordsService.deleteFolder(item.id);
    } else if (this.activeModal() === 'deleteDocumentConfirm') {
      this.recordsService.deleteDocument(item.id);
    }
    this.closeModal();
  }

  shareDocument(doc: MedicalDocument): void {
    this.openMenuId.set(null); // Close any open menus
    // Directly open the fallback modal to provide a consistent and error-free experience.
    // The native Web Share API for files can be unreliable in different browser contexts.
    this.documentToShare.set(doc);
    this.isShareFallbackModalOpen.set(true);
  }

  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
