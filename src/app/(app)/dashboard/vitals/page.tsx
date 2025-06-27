
// src/app/(app)/dashboard/vitals/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { addVitalSign, getLatestVitalSign, predictEarlyRisks, logVitalAlert, fetchEnvironmentalData } from '@/lib/firebaseService';
import type { VitalSign, VitalSignFormData, PredictEarlyRisksOutput, AlertLog, VitalSignTypeKey, EnvironmentalData } from '@/types';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { HeartPulse, Activity, Wind, Thermometer, ShieldCheck, Info, AlertTriangle, Siren } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { VITAL_RANGES } from '@/lib/constants';
import { VoiceInputButton } from '@/components/ui/voice-input-button';

const vitalSignSchema = z.object({
  heartRate: z.coerce.number().positive({ message: "La frecuencia cardíaca debe ser positiva." }).max(300, "La frecuencia cardíaca parece demasiado alta."),
  systolicPressure: z.coerce.number().positive({ message: "La presión sistólica debe ser positiva." }).max(300, "La presión sistólica parece demasiado alta."),
  oxygenSaturation: z.coerce.number().min(70, "La saturación de oxígeno parece demasiado baja.").max(100, { message: "La saturación de oxígeno no puede exceder el 100%." }),
  temperature: z.coerce.number().min(30, "La temperatura parece demasiado baja.").max(45, { message: "La temperatura parece demasiado alta." }),
});

type VitalSignFormValues = z.infer<typeof vitalSignSchema>;

export default function VitalsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [latestVitals, setLatestVitals] = useState<VitalSign | null>(null);
  const [riskPrediction, setRiskPrediction] = useState<PredictEarlyRisksOutput | null>(null);
  const [showLivePrediction, setShowLivePrediction] = useState(false);
  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalData | null>(null);
  const [loadingEnvData, setLoadingEnvData] = useState(false); // For env data on submit

  const form = useForm<VitalSignFormValues>({
    resolver: zodResolver(vitalSignSchema),
    defaultValues: {
      heartRate: undefined,
      systolicPressure: undefined,
      oxygenSaturation: undefined,
      temperature: undefined,
    },
  });
  
  useEffect(() => {
    if (currentUser?.id) {
      setLoadingLatest(true);
      getLatestVitalSign(currentUser.id)
        .then(vitals => {
          setLatestVitals(vitals);
          if (vitals) {
            form.reset({ // Pre-fill form with latest vitals
              heartRate: vitals.heartRate,
              systolicPressure: vitals.systolicPressure,
              oxygenSaturation: vitals.oxygenSaturation,
              temperature: vitals.temperature,
            });
          } else {
             form.reset({ // Clear form if no vitals
              heartRate: undefined,
              systolicPressure: undefined,
              oxygenSaturation: undefined,
              temperature: undefined,
            });
          }
        })
        .catch(err => {
          console.error("Error al obtener los últimos signos vitales:", err);
          toast({ title: "Error", description: "No se pudieron cargar los últimos signos vitales.", variant: "destructive" });
        })
        .finally(() => setLoadingLatest(false));
    }
  }, [currentUser?.id, form, toast]);

  const onSubmit = async (data: VitalSignFormValues) => {
    if (!currentUser?.id) {
      toast({ title: "Error", description: "Usuario no encontrado.", variant: "destructive" });
      return;
    }
    setLoadingSubmit(true);
    setLoadingEnvData(true);
    setRiskPrediction(null); 
    setShowLivePrediction(false);

    try {
      // Fetch environmental data
      let fetchedEnvData: EnvironmentalData | null = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => 
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          fetchedEnvData = await fetchEnvironmentalData(position.coords.latitude, position.coords.longitude);
        } catch (geoErr: any) {
          console.warn("VitalsPage: Error obteniendo geolocalización en submit:", geoErr.message);
          toast({ title: "Aviso de Ubicación", description: "No se pudo obtener ubicación para altitud. Usando valores por defecto.", variant: "default" });
          fetchedEnvData = await fetchEnvironmentalData(); // Fetch with no coords
        }
      } else {
         toast({ title: "Aviso de Ubicación", description: "Geolocalización no soportada. Usando valores por defecto para altitud.", variant: "default" });
        fetchedEnvData = await fetchEnvironmentalData();
      }
      setEnvironmentalData(fetchedEnvData);
      setLoadingEnvData(false);

      const newVitalSign = await addVitalSign(currentUser.id, data as VitalSignFormData);
      setLatestVitals(newVitalSign); 
      toast({
        title: "Signos Vitales Registrados",
        description: "Sus últimos signos vitales han sido guardados.",
      });
      
      const prediction = await predictEarlyRisks(currentUser.id, data, fetchedEnvData || undefined);
      setRiskPrediction(prediction);
      setShowLivePrediction(true);

      // Standard vital alerts
      const alertsToLog: Array<Omit<AlertLog, 'id' | 'userId' | 'timestamp' | 'status'>> = [];
      (Object.keys(data) as Array<VitalSignTypeKey>).forEach(key => {
        const vitalInfo = VITAL_RANGES[key];
        const value = data[key];
        if (vitalInfo && value !== undefined && (value < vitalInfo.min || value > vitalInfo.max)) {
          const isLow = value < vitalInfo.min;
          const alertMessage = `${vitalInfo.name} ${isLow ? 'está por debajo' : 'está por encima'} del rango normal. Valor: ${value} ${vitalInfo.unit} (Rango: ${vitalInfo.min} - ${vitalInfo.max} ${vitalInfo.unit})`;
          toast({
            title: "¡ALERTA DE SIGNO VITAL!",
            description: alertMessage,
            variant: "destructive",
            duration: 10000, 
            className: "border-red-500 dark:border-red-700",
          });
          alertsToLog.push({
            vitalSignType: key,
            value: value,
            normalRange: `${vitalInfo.min} - ${vitalInfo.max} ${vitalInfo.unit}`,
            message: alertMessage,
          });
        }
      });

      if (alertsToLog.length > 0 && currentUser?.id) {
        for (const alertData of alertsToLog) {
          await logVitalAlert(currentUser.id, alertData);
        }
      }
      
      // AI-driven contextual alerts (fatigue, altitude)
      if (prediction) {
        const riskText = prediction.riskAssessment.toLowerCase();
        const recText = prediction.recommendations.toLowerCase();
        const highRiskKeywords = ["alto riesgo", "riesgo elevado", "fatiga extrema", "mal de altura", "descompensación por altitud"];
        const actionKeywords = ["detener actividad", "descansar inmediatamente"];

        const isHighRisk = highRiskKeywords.some(keyword => riskText.includes(keyword));
        const suggestsUrgentAction = actionKeywords.some(keyword => recText.includes(keyword));

        if (isHighRisk || suggestsUrgentAction) {
          toast({
            title: "ALERTA DE IA: Riesgo Detectado",
            description: `${prediction.riskAssessment} Recomendación: ${prediction.recommendations}`,
            variant: "destructive",
            duration: 15000,
            className: "border-orange-500 dark:border-orange-700 bg-orange-50 text-orange-800",
            action: <Siren className="h-6 w-6 text-orange-600" />,
          });
        }
      }

    } catch (error: any) {
      toast({
        title: "Envío Fallido",
        description: error.message || "No se pudieron guardar los signos vitales o procesar la predicción.",
        variant: "destructive",
      });
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleVoiceTranscript = (fieldName: keyof VitalSignFormValues, transcript: string) => {
    console.log(`VitalsPage - handleVoiceTranscript para ${fieldName}, transcripción: "${transcript}"`);
    const cleanedTranscript = transcript.replace(/[^0-9.,-]/g, '').replace(',', '.');
    const numericValue = parseFloat(cleanedTranscript);
    console.log(`VitalsPage - Transcripción limpiada: "${cleanedTranscript}", Valor numérico parseado: ${numericValue}`);

    if (!isNaN(numericValue)) {
      form.setValue(fieldName, numericValue, { shouldValidate: true });
      toast({
        title: "Valor Actualizado por Voz",
        description: `Campo '${VITAL_RANGES[fieldName]?.name || fieldName}' actualizado a: ${numericValue}`,
      });
    } else {
      console.warn(`VitalsPage - Fallo al parsear: "${transcript}" (limpiado: "${cleanedTranscript}") a número para ${fieldName}`);
      toast({
        title: "Entrada de Voz No Reconocida",
        description: `No pudimos convertir "${transcript}" en un número para ${VITAL_RANGES[fieldName]?.name || fieldName}. Por favor, intente decir claramente solo el número (por ejemplo, "setenta y cinco" o "treinta y seis punto cinco").`,
        variant: "destructive",
        duration: 7000, 
      });
    }
  };

  return (
    <div className="container mx-auto py-2 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Registrar y Ver Signos Vitales</h1>
        <p className="text-muted-foreground">Ingrese sus signos vitales actuales. Sus últimos datos registrados se muestran a continuación.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar Nuevos Signos Vitales</CardTitle>
          <CardDescription>Todos los campos son obligatorios. Asegúrese de que los datos sean precisos. Puede usar el micrófono para dictar valores.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <FormField control={form.control} name="heartRate" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="heartRate" className="flex items-center"><HeartPulse className="mr-2 h-4 w-4 text-primary" />Frecuencia Cardíaca (lpm)</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl><Input id="heartRate" type="number" placeholder="Ej: 72" {...field} value={field.value ?? ""} /></FormControl>
                    <VoiceInputButton
                      onTranscript={(text) => handleVoiceTranscript('heartRate', text)}
                      targetInputName="Frecuencia Cardíaca"
                      disabled={loadingSubmit}
                      aria-label="Dictar frecuencia cardíaca"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="systolicPressure" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="systolicPressure" className="flex items-center"><Activity className="mr-2 h-4 w-4 text-primary" />Presión Sistólica (mmHg)</FormLabel>
                   <div className="flex items-center gap-2">
                    <FormControl><Input id="systolicPressure" type="number" placeholder="Ej: 120" {...field} value={field.value ?? ""} /></FormControl>
                    <VoiceInputButton
                      onTranscript={(text) => handleVoiceTranscript('systolicPressure', text)}
                      targetInputName="Presión Sistólica"
                      disabled={loadingSubmit}
                      aria-label="Dictar presión sistólica"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="oxygenSaturation" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="oxygenSaturation" className="flex items-center"><Wind className="mr-2 h-4 w-4 text-primary" />Saturación de Oxígeno (%)</FormLabel>
                   <div className="flex items-center gap-2">
                    <FormControl><Input id="oxygenSaturation" type="number" placeholder="Ej: 98" {...field} value={field.value ?? ""} /></FormControl>
                    <VoiceInputButton
                      onTranscript={(text) => handleVoiceTranscript('oxygenSaturation', text)}
                      targetInputName="Saturación de Oxígeno"
                      disabled={loadingSubmit}
                      aria-label="Dictar saturación de oxígeno"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="temperature" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="temperature" className="flex items-center"><Thermometer className="mr-2 h-4 w-4 text-primary" />Temperatura (°C)</FormLabel>
                   <div className="flex items-center gap-2">
                    <FormControl><Input id="temperature" type="number" step="0.1" placeholder="Ej: 37.0" {...field} value={field.value ?? ""} /></FormControl>
                    <VoiceInputButton
                      onTranscript={(text) => handleVoiceTranscript('temperature', text)}
                      targetInputName="Temperatura"
                      disabled={loadingSubmit}
                      aria-label="Dictar temperatura"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="md:col-span-2 mt-4">
                <Button type="submit" className="w-full md:w-auto" disabled={loadingSubmit || loadingEnvData}>
                  {(loadingSubmit || loadingEnvData) && <Spinner className="mr-2 h-4 w-4" />}
                  Registrar y Evaluar Riesgos
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {showLivePrediction && riskPrediction && (
        <Alert variant="default" className="border-accent bg-accent/10">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <AlertTitle className="text-accent font-semibold">
            Evaluación de Riesgos IA (con datos actuales {environmentalData?.altitude ? `y altitud ${environmentalData.altitude}m` : ''})
          </AlertTitle>
          <AlertDescription>
            <p className="font-medium">{riskPrediction.riskAssessment}</p>
            <p className="text-sm">{riskPrediction.recommendations}</p>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Últimos Signos Vitales Registrados</CardTitle>
          {loadingLatest && <Skeleton className="h-4 w-48 mt-1" />}
          {!loadingLatest && latestVitals && (
            <CardDescription>
              Registrado el: {format(new Date(latestVitals.timestamp), "PPPp", { locale: es })}
            </CardDescription>
          )}
          {!loadingLatest && !latestVitals && (
            <CardDescription>Aún no se han registrado signos vitales.</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingLatest ? (
            <>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </>
          ) : latestVitals ? (
            <>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center"><HeartPulse className="mr-3 h-5 w-5 text-primary" /> <span className="font-medium">Frecuencia Cardíaca:</span></div>
                <span className="text-lg font-semibold">{latestVitals.heartRate} lpm</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center"><Activity className="mr-3 h-5 w-5 text-primary" /> <span className="font-medium">Presión Sistólica:</span></div>
                <span className="text-lg font-semibold">{latestVitals.systolicPressure} mmHg</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center"><Wind className="mr-3 h-5 w-5 text-primary" /> <span className="font-medium">Saturación de Oxígeno:</span></div>
                <span className="text-lg font-semibold">{latestVitals.oxygenSaturation} %</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center"><Thermometer className="mr-3 h-5 w-5 text-primary" /> <span className="font-medium">Temperatura:</span></div>
                <span className="text-lg font-semibold">{latestVitals.temperature} °C</span>
              </div>
            </>
          ) : (
            <div className="flex items-center text-muted-foreground p-3">
              <Info className="mr-2 h-5 w-5" /> No hay datos disponibles. Registre sus signos vitales usando el formulario de arriba.
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
