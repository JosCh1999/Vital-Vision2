
'use server';
/**
 * @fileOverview Generates personalized health recommendations based on user profile and vital signs history.
 *
 * - generatePersonalizedRecommendations - A function that handles the recommendation generation process.
 * - GeneratePersonalizedRecommendationsInput - The input type for the function.
 * - GeneratePersonalizedRecommendationsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VitalHistoryItemSchema = z.object({
  timestamp: z.number().describe('The unix timestamp of the reading.'),
  heartRate: z.number().describe('Heart rate in beats per minute.'),
  systolicPressure: z.number().describe('Systolic blood pressure in mmHg.'),
  oxygenSaturation: z.number().describe('Oxygen saturation percentage.'),
  temperature: z.number().describe('Body temperature in Celsius.'),
});

const GeneratePersonalizedRecommendationsInputSchema = z.object({
  patientDescription: z.string().describe('Detailed description of the patient including age, sex, medical diagnosis, and current medications.'),
  vitalHistory: z.array(VitalHistoryItemSchema).describe('An array of recent vital sign readings, sorted from most recent to oldest.'),
});
export type GeneratePersonalizedRecommendationsInput = z.infer<typeof GeneratePersonalizedRecommendationsInputSchema>;

const GeneratePersonalizedRecommendationsOutputSchema = z.object({
  personalizedSummary: z.string().describe("A brief, easy-to-understand summary of the user's recent health trends. Should be encouraging and written in second person (tú)."),
  actionableRecommendations: z.array(z.string()).describe("A list of 3-4 clear, non-technical, actionable lifestyle recommendations."),
});
export type GeneratePersonalizedRecommendationsOutput = z.infer<typeof GeneratePersonalizedRecommendationsOutputSchema>;

export async function generatePersonalizedRecommendations(input: GeneratePersonalizedRecommendationsInput): Promise<GeneratePersonalizedRecommendationsOutput> {
  return generatePersonalizedRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePersonalizedRecommendationsPrompt',
  input: {schema: GeneratePersonalizedRecommendationsInputSchema},
  output: {schema: GeneratePersonalizedRecommendationsOutputSchema},
  prompt: `Eres un asistente de salud solidario y alentador para usuarios, algunos con discapacidad visual. Tu objetivo es proporcionar recomendaciones de salud claras, sencillas y prácticas, NO diagnósticos médicos.

Analiza el perfil del usuario y su historial reciente de signos vitales (ordenado del más reciente al más antiguo).

Basándote en los datos, proporciona:
1. personalizedSummary: Un resumen breve y fácil de entender de sus tendencias de salud recientes. Háblale directamente (de tú) y de forma alentadora. Por ejemplo, "He notado que tu frecuencia cardíaca ha estado muy estable esta semana, ¡sigue así!".
2. actionableRecommendations: Una lista de 3 a 4 recomendaciones claras, no técnicas y prácticas sobre su estilo de vida. Si observas tendencias preocupantes, tu recomendación DEBE ser "consultar a tu médico o profesional de la salud para una revisión". Ejemplos de buenas recomendaciones: "Considera una caminata ligera de 15 minutos por la mañana", "Asegúrate de tomarte un momento para descansar después del mediodía", "Parece que tus datos son estables, ¡un gran trabajo!".

Perfil del Usuario: {{{patientDescription}}}

{{#if vitalHistory}}
Historial de Signos Vitales (del más reciente al más antiguo):
{{#each vitalHistory}}
- Frecuencia Cardíaca: {{heartRate}}lpm, Presión Sistólica: {{systolicPressure}}mmHg, Saturación O₂: {{oxygenSaturation}}%, Temp: {{temperature}}°C
{{/each}}
{{else}}
No hay historial de signos vitales disponible para analizar.
{{/if}}

Recuerda ser alentador y evitar la jerga demasiado técnica.
`,
});

const generatePersonalizedRecommendationsFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedRecommendationsFlow',
    inputSchema: GeneratePersonalizedRecommendationsInputSchema,
    outputSchema: GeneratePersonalizedRecommendationsOutputSchema,
  },
  async (input) => {
    if (input.vitalHistory.length === 0) {
      return {
        personalizedSummary: "No he podido generar un resumen porque no tienes signos vitales registrados todavía.",
        actionableRecommendations: [
          "Registra tus signos vitales por primera vez para obtener recomendaciones personalizadas.",
          "Asegúrate de que tu perfil de salud esté completo y actualizado para recibir los mejores consejos."
        ]
      }
    }
    const {output} = await prompt(input);
    return output!;
  }
);
