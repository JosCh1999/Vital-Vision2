// src/lib/constants.ts
import type { VitalSignTypeKey } from '@/types';

export interface VitalRangeInfo {
  min: number;
  max: number;
  unit: string;
  name: string; // User-friendly name in Spanish for display
  label: string; // Shorter label, potentially for alerts
}

export const VITAL_RANGES: Record<VitalSignTypeKey, VitalRangeInfo> = {
  heartRate: { 
    min: 60, 
    max: 100, 
    unit: 'lpm', 
    name: 'Frecuencia Cardíaca', 
    label: 'Frecuencia Cardíaca' 
  },
  systolicPressure: { 
    min: 90, 
    max: 140, // General alert threshold, can be stricter for specific conditions
    unit: 'mmHg', 
    name: 'Presión Arterial Sistólica', 
    label: 'Presión Sistólica' 
  },
  oxygenSaturation: { 
    min: 94, 
    max: 100, 
    unit: '%', 
    name: 'Saturación de Oxígeno', 
    label: 'Saturación O₂' 
  },
  temperature: { 
    min: 36.1, 
    max: 37.2, // Common normal range, fevers often start above 38°C
    unit: '°C', 
    name: 'Temperatura Corporal', 
    label: 'Temperatura' 
  },
};
