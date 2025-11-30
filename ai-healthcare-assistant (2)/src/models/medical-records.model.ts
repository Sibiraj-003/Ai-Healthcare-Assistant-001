export interface MedicalFolder {
  id: string;
  name: string;
  createdAt: number;
}

export interface MedicalDocument {
  id: string;
  folderId: string;
  name: string;
  fileType: string; // MIME type
  dataUrl: string; // base64 encoded
  createdAt: number;
}
