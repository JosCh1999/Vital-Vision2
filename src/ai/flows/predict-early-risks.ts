
// src/ai/flows/predict-early-risks.ts
'use server';

/**
 * @fileOverview Predicts early health risks based on real-time vital signs, environmental data, and patient profile using AI.
 *
 * - predictEarlyRisks - A function that handles the prediction of early health risks.
 * - PredictEarlyRisksInput - The input type for the predictEarlyRisks function.
 * - PredictEarlyRisksOutput - The return type for the predictEarlyRisks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {getLatestVitalSigns, VitalSigns} from '@/services/vitals'; // This import might be unused if always fetching from firebaseService

const EnvironmentalDataSchema = z.object({
  latitude: z.number().optional().describe('Current latitude of the patient.'),
  longitude: z.number().optional().describe('Current longitude of the patient.'),
  altitude: z.number().optional().describe('Current altitude in meters above sea level.'),
  stepsToday: z.number().optional().describe('Number of steps taken by the patient today.'),
});

const PredictEarlyRisksInputSchema = z.object({
  vitalSigns: z.object({
    heartRate: z.number().describe('Heart rate in beats per minute.'),
    systolicPressure: z.number().describe('Systolic blood pressure in mmHg.'),
    oxygenSaturation: z.number().describe('Oxygen saturation percentage.'),
    temperature: z.number().describe('Body temperature in Celsius.'),
  }).optional(),
  patientDescription: z.string().describe('Description of the patient and their medical history.').optional(),
  environmentalData: EnvironmentalDataSchema.optional().describe('Environmental context like altitude and steps taken.'),
});

export type PredictEarlyRisksInput = z.infer<typeof PredictEarlyRisksInputSchema>;

const PredictEarlyRisksOutputSchema = z.object({
  riskAssessment: z.string().describe('An assessment of potential health risks based on the provided vital signs, patient description, and environmental data. This should explicitly mention risks like fatigue or altitude sickness if detected.'),
  recommendations: z.string().describe('Recommendations for proactive measures based on the risk assessment. If altitude sickness or extreme fatigue is suspected, recommend to stop physical activity and rest.'),
});

export type PredictEarlyRisksOutput = z.infer<typeof PredictEarlyRisksOutputSchema>;

export async function predictEarlyRisks(input: PredictEarlyRisksInput): Promise<PredictEarlyRisksOutput> {
  return predictEarlyRisksFlow(input);
}

const predictEarlyRisksPrompt = ai.definePrompt({
  name: 'predictEarlyRisksPrompt',
  input: {schema: PredictEarlyRisksInputSchema},
  output: {schema: PredictEarlyRisksOutputSchema},
  prompt: `You are an AI health assistant that analyzes patient vital signs, medical history, and environmental context to predict early health risks and suggest proactive measures.
  Your analysis should be particularly sensitive to risks related to high altitude (e.g., Huancayo, Peru at approx. 3250m) and extreme fatigue.

  Analyze the following information:

  {{#if vitalSigns}}
  Vital Signs:
  Heart Rate: {{vitalSigns.heartRate}} bpm
  Systolic Blood Pressure: {{vitalSigns.systolicPressure}} mmHg
  Oxygen Saturation: {{vitalSigns.oxygenSaturation}} %
  Temperature: {{vitalSigns.temperature}} °C
  {{else}}
  No current vital signs provided. Base your assessment on patient description and environmental data.
  {{/if}}

  Patient Description: {{patientDescription}}

  {{#if environmentalData}}
  Environmental Context:
  {{#if environmentalData.latitude}}Latitude: {{environmentalData.latitude}}{{/if}}
  {{#if environmentalData.longitude}}Longitude: {{environmentalData.longitude}}{{/if}}
  {{#if environmentalData.altitude}}Current Altitude: {{environmentalData.altitude}} meters above sea level. (Consider this for altitude sickness if high, e.g., >2500m).{{/if}}
  {{#if environmentalData.stepsToday}}Steps Today: {{environmentalData.stepsToday}} steps. (Consider this for fatigue if very high or combined with other symptoms).{{/if}}
  {{/if}}

  Based on ALL available information, provide:
  1. riskAssessment: A concise assessment of potential health risks. Explicitly mention risks like "fatiga extrema" or "descompensación por altitud" / "mal de altura" if patterns suggest them.
  2. recommendations: Actionable recommendations. If altitude sickness or extreme fatigue is suspected, a key recommendation MUST be: "Detener actividad física y descansar inmediatamente." Also include other relevant advice.
  If no specific risks are identified, provide general wellness advice.
`,
});

const predictEarlyRisksFlow = ai.defineFlow(
  {
    name: 'predictEarlyRisksFlow',
    inputSchema: PredictEarlyRisksInputSchema,
    outputSchema: PredictEarlyRisksOutputSchema,
  },
  async (inputWithoutProfileVitals) => {
    // The firebaseService.predictEarlyRisks function will now be responsible for fetching latest vitals if not provided in currentVitals.
    // This flow will just use what's passed in `inputWithoutProfileVitals.vitalSigns`.
    // Or, if getLatestVitalSigns was to be used here, ensure it's compatible with user context if needed.
    // For this iteration, we assume `inputWithoutProfileVitals` contains all necessary data prepared by the caller.

    const {output} = await predictEarlyRisksPrompt(inputWithoutProfileVitals);
    return output!;
  }
);
