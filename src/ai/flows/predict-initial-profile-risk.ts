
'use server';
/**
 * @fileOverview Predicts an initial health risk level based purely on patient profile data.
 *
 * - predictInitialProfileRiskFlow - A function that handles the initial profile risk assessment.
 * - PredictInitialProfileRiskInput - The input type for the flow.
 * - PredictInitialProfileRiskOutput - The return type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { PredictInitialProfileRiskInput, PredictInitialProfileRiskOutput } from '@/types';

const PredictInitialProfileRiskInputSchema = z.object({
  patientDescription: z.string().describe('Detailed description of the patient including age, sex, medical diagnosis, and current medications.'),
});

const PredictInitialProfileRiskOutputSchema = z.object({
  riskLevel: z.enum(['Bajo', 'Medio', 'Alto']).describe('The assessed initial risk level based on the profile (Bajo, Medio, Alto).'),
  justification: z.string().describe('A brief justification for the assessed risk level, highlighting key factors from the profile.'),
});

// Exported wrapper function
export async function assessInitialProfileRisk(input: PredictInitialProfileRiskInput): Promise<PredictInitialProfileRiskOutput> {
  return predictInitialProfileRiskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictInitialProfileRiskPrompt',
  input: {schema: PredictInitialProfileRiskInputSchema},
  output: {schema: PredictInitialProfileRiskOutputSchema},
  prompt: `Eres un evaluador de riesgos de salud. Tu tarea es analizar el siguiente perfil de paciente y determinar un nivel de riesgo de salud inicial (Bajo, Medio o Alto).
No consideres signos vitales actuales ni datos ambientales para esta evaluación, solo la información del perfil.

Perfil del Paciente:
{{{patientDescription}}}

Basado únicamente en este perfil (edad, sexo, diagnósticos médicos, medicamentos), determina:
1.  riskLevel: El nivel de riesgo de salud inicial (Bajo, Medio o Alto).
2.  justification: Una justificación concisa (1-2 frases) para este nivel de riesgo, mencionando los factores clave del perfil que influyen en esta determinación. Por ejemplo, si un paciente tiene múltiples condiciones crónicas o es de edad avanzada, su riesgo podría ser Medio o Alto. Un paciente joven sin condiciones preexistentes podría tener un riesgo Bajo.
`,
});

const predictInitialProfileRiskFlow = ai.defineFlow(
  {
    name: 'predictInitialProfileRiskFlow',
    inputSchema: PredictInitialProfileRiskInputSchema,
    outputSchema: PredictInitialProfileRiskOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
