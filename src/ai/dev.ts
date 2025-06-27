
import { config } from 'dotenv';
config();

import '@/ai/flows/predict-early-risks.ts';
import '@/ai/flows/summarize-health-trends.ts';
import '@/ai/flows/predict-initial-profile-risk.ts';
import '@/ai/flows/generate-personalized-recommendations.ts'; // Added new flow
