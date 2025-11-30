import { Injectable, signal, effect, computed } from '@angular/core';
import { MedicalFolder, MedicalDocument } from '../models/medical-records.model';

@Injectable({
  providedIn: 'root',
})
export class RecordsService {
  private readonly FOLDERS_KEY = 'ai_healthcare_records_folders';
  private readonly DOCS_KEY = 'ai_healthcare_records_documents';

  readonly folders = signal<MedicalFolder[]>([]);
  readonly documents = signal<MedicalDocument[]>([]);

  constructor() {
    this.loadFromStorage();

    if (this.folders().length === 0) {
      this.initializeDefaultFolders();
    }

    effect(() => {
      this.saveToStorage();
    });
  }

  private initializeDefaultFolders(): void {
    const defaultFolders = ['Prescriptions', 'Scan Reports', 'X-Rays'];
    defaultFolders.forEach(name => this.createFolder(name));
  }

  // --- Folder Methods ---
  createFolder(name: string): void {
    if (!name.trim()) return;
    const newFolder: MedicalFolder = {
      id: Date.now().toString() + Math.random().toString(36).substring(2),
      name: name.trim(),
      createdAt: Date.now(),
    };
    this.folders.update(f => [...f, newFolder]);
  }

  renameFolder(id: string, newName: string): void {
    if (!newName.trim()) return;
    this.folders.update(f =>
      f.map(folder => (folder.id === id ? { ...folder, name: newName.trim() } : folder))
    );
  }

  deleteFolder(id: string): void {
    this.folders.update(f => f.filter(folder => folder.id !== id));
    this.documents.update(d => d.filter(doc => doc.folderId !== id));
  }

  getDocumentsByFolderId(folderId: string) {
    return computed(() => this.documents().filter(doc => doc.folderId === folderId));
  }
  
  getFolderById(folderId: string) {
    return computed(() => this.folders().find(f => f.id === folderId));
  }

  // --- Document Methods ---
  async uploadDocument(folderId: string, file: File): Promise<void> {
    const dataUrl = await this.readFileAsDataURL(file);
    const newDocument: MedicalDocument = {
      id: Date.now().toString() + Math.random().toString(36).substring(2),
      folderId,
      name: file.name,
      fileType: file.type,
      dataUrl,
      createdAt: Date.now(),
    };
    this.documents.update(d => [...d, newDocument]);
  }

  renameDocument(id: string, newName: string): void {
    if (!newName.trim()) return;
    this.documents.update(d =>
      d.map(doc => (doc.id === id ? { ...doc, name: newName.trim() } : doc))
    );
  }

  deleteDocument(id: string): void {
    this.documents.update(d => d.filter(doc => doc.id !== id));
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  // --- Persistence ---
  private loadFromStorage(): void {
    try {
      const storedFolders = localStorage.getItem(this.FOLDERS_KEY);
      if (storedFolders) {
        this.folders.set(JSON.parse(storedFolders));
      }
      const storedDocs = localStorage.getItem(this.DOCS_KEY);
      if (storedDocs) {
        this.documents.set(JSON.parse(storedDocs));
      }
    } catch (e) {
      console.error('Failed to load records from localStorage', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.FOLDERS_KEY, JSON.stringify(this.folders()));
      localStorage.setItem(this.DOCS_KEY, JSON.stringify(this.documents()));
    } catch (e) {
      console.error('Failed to save records to localStorage', e);
    }
  }
}
