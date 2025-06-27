

export interface User {
  id: string;
  email: string | null;
  name?: string;
  photoURL?: string;
}

export interface UserProfile extends User {
  age?: number;
  sex?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  medicalDiagnosis?: string;
  currentMedications?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  role?: 'patient' | 'caregiver'; // Added role
}

// For the predictEarlyRisks AI flow (detailed contextual risk)
export interface VitalSignsForAI {
  heartRate: number;
  systolicPressure: number;
  oxygenSaturation: number;
  temperature: number;
}

export interface EnvironmentalData {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  stepsToday?: number;
}

export interface PredictEarlyRisksInput {
  vitalSigns?: VitalSignsForAI;
  patientDescription?: string;
  environmentalData?: EnvironmentalData;
}

export interface PredictEarlyRisksOutput {
  riskAssessment: string;
  recommendations: string;
}

// For the new predictInitialProfileRisk AI flow (profile-based risk)
export interface PredictInitialProfileRiskInput {
  patientDescription: string;
}

export interface PredictInitialProfileRiskOutput {
  riskLevel: 'Bajo' | 'Medio' | 'Alto';
  justification: string;
}

// For Personalized Recommendations AI flow
export interface GeneratePersonalizedRecommendationsInput {
    patientDescription: string;
    vitalHistory: Array<Omit<VitalSign, 'id' | 'userId'>>;
}

export interface GeneratePersonalizedRecommendationsOutput {
    personalizedSummary: string;
    actionableRecommendations: string[];
}


// For forms
export interface UserProfileFormData extends Omit<UserProfile, 'id' | 'email' | 'photoURL'> {
  role?: 'patient' | 'caregiver'; // Ensure role is part of form data
}


export type VitalSignFormData = Omit<VitalSign, 'id' | 'userId' | 'timestamp'>;

// For Alerts and Notifications Feature (HU04)
export type VitalSignTypeKey = 'heartRate' | 'systolicPressure' | 'oxygenSaturation' | 'temperature';

export interface AlertLog {
  id: string; // Firestore document ID
  userId: string;
  timestamp: number; // Unix timestamp
  vitalSignType: VitalSignTypeKey;
  value: number; // The out-of-range value
  normalRange: string; // e.g., "60-100 lpm"
  message: string; // Detailed alert message, e.g., "Frecuencia Cardíaca Alta: 110 lpm (Rango Normal: 60-100 lpm)"
  status: 'active' | 'acknowledged'; // For future enhancements like acknowledging alerts
}

export interface VitalSign {
  id: string; // Firestore document ID
  userId: string;
  timestamp: number; // Unix timestamp (seconds or milliseconds)
  heartRate: number; // bpm
  systolicPressure: number; // mmHg
  oxygenSaturation: number; // %
  temperature: number; // Celsius
}

// For Accessible Schedule Feature
export interface Appointment {
  id: string;
  userId: string;
  date: number; // Store as timestamp for easy sorting/filtering
  time: string; // "HH:mm"
  type: string;
  professionalName?: string;
  createdAt: number;
}

export type AppointmentFormData = Omit<Appointment, 'id' | 'userId' | 'createdAt'>;

// For Medication Reminders
export interface Medication {
  id: string;
  userId: string;
  name: string;
  dose: string; // e.g., "1 pastilla", "10ml"
  frequency: 'daily' | 'twice_daily' | 'three_times_daily';
  times: string[]; // Array of "HH:mm" strings
  createdAt: number;
}

export type MedicationFormData = Omit<Medication, 'id' | 'userId' | 'createdAt'>;

export interface MedicationLog {
  id: string;
  userId: string;
  medicationId: string;
  medicationName: string;
  takenAt: number; // timestamp
}
