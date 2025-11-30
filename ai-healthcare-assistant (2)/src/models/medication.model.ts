export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency?: string;
  time: string;
  tabletCount?: number;
}