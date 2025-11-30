export interface Doctor {
  id: string;
  name: string;
  role: 'Doctor' | 'Counsellor';
  hospital: string;
  district: string;
  phone: string;
}
