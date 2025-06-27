'use server';
/**
 * @fileOverview Summarizes health trends from vital signs data.
 *
 * - summarizeHealthTrends - A function that summarizes health trends.
 * - SummarizeHealthTrendsInput - The input type for the summarizeHealthTrends function.
 * - SummarizeHealthTrendsOutput - The return type for the summarizeHealthTrends function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeHealthTrendsInputSchema = z.array(
  z.object({
    timestamp: z.number().describe('The unix timestamp of the reading.'),
    heartRate: z.number().describe('Heart rate in beats per minute.'),
    systolicPressure: z.number().describe('Systolic blood pressure in mmHg.'),
    oxygenSaturation: z.number().describe('Oxygen saturation percentage.'),
    temperature: z.number().describe('Body temperature in Celsius.'),
  })
);

export type SummarizeHealthTrendsInput = z.infer<
  typeof SummarizeHealthTrendsInputSchema
>;

const SummarizeHealthTrendsOutputSchema = z.object({
  summary: z.string().describe('A technical summary of health trends, patterns, and anomalies found in the provided time-series data. Mention specific periods of high/low readings and potential correlations.'),
  keyObservations: z.array(z.string()).describe('A list of 3-5 key bullet points highlighting the most important observations from the data.'),
});

export type SummarizeHealthTrendsOutput = z.infer<
  typeof SummarizeHealthTrendsOutputSchema
>;

export async function summarizeHealthTrends(
  input: SummarizeHealthTrendsInput
): Promise<SummarizeHealthTrendsOutput> {
  return summarizeHealthTrendsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeHealthTrendsPrompt',
  input: {schema: SummarizeHealthTrendsInputSchema},
  output: {schema: SummarizeHealthTrendsOutputSchema},
  prompt: `You are an expert health data analyst. Your task is to provide a technical summary of a patient's vital signs history for a caregiver or doctor.

  Analyze the provided series of vital signs data. The data is sorted from most recent to oldest.

  Based on the data, provide:
  1.  summary: A concise technical summary (2-3 paragraphs) of the health trends. Identify any significant patterns, periods of stability, notable fluctuations, or potential anomalies. Correlate any unusual readings if possible (e.g., "a drop in oxygen saturation was observed around the same time as an elevated heart rate").
  2.  keyObservations: A list of 3 to 5 bullet points that are the most critical takeaways from the data analysis.

  Vital Signs Data (most recent first):
  {{#each this}}
  - Timestamp: {{timestamp}}, Heart Rate: {{heartRate}}bpm, Systolic Pressure: {{systolicPressure}}mmHg, O2 Saturation: {{oxygenSaturation}}%, Temp: {{temperature}}°C
  {{/each}}
  `,
});

const summarizeHealthTrendsFlow = ai.defineFlow(
  {
    name: 'summarizeHealthTrendsFlow',
    inputSchema: SummarizeHealthTrendsInputSchema,
    outputSchema: SummarizeHealthTrendsOutputSchema,
  },
  async input => {
    // Ensure the data is not empty
    if (input.length === 0) {
        return {
            summary: "No vital signs data was provided for analysis. Unable to generate a summary.",
            keyObservations: ["No data available."]
        }
    }
    const {output} = await prompt(input);
    return output!;
  }
);
