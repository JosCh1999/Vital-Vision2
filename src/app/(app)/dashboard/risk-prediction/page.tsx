
// src/app/(app)/dashboard/risk-prediction/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { predictEarlyRisks, getLatestVitalSign, fetchEnvironmentalData } from '@/lib/firebaseService';
import type { PredictEarlyRisksOutput, VitalSign, EnvironmentalData } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, RefreshCw, Info, HeartPulse, Activity, Wind, Thermometer, Footprints, Mountain } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export default function RiskPredictionPage() {
  const { currentUser } = useAuth();
  const [prediction, setPrediction] = useState<PredictEarlyRisksOutput | null>(null);
  const [latestVitals, setLatestVitals] = useState<VitalSign | null>(null);
  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalData | null>(null);
  
  const [loading, setLoading] = useState(true); // Combined loading state for initial fetch
  const [refreshing, setRefreshing] = useState(false); // For refresh button
  const [error, setError] = useState<string | null>(null);
  const [envError, setEnvError] = useState<string | null>(null);


  const fetchPredictionData = async () => {
    if (!currentUser?.id) return;
    setLoading(true); // For initial load or full refresh
    if (!refreshing) setLoading(true); else setRefreshing(true);
    setError(null);
    setEnvError(null);
    
    try {
      const vitals = await getLatestVitalSign(currentUser.id);
      setLatestVitals(vitals);

      let fetchedEnvData: EnvironmentalData | null = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => 
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
          );
          const { latitude, longitude } = position.coords;
          fetchedEnvData = await fetchEnvironmentalData(latitude, longitude);
        } catch (geoErr: any) {
          console.warn("Error obteniendo geolocalización para predicción:", geoErr.message);
          setEnvError("No se pudo obtener la ubicación para datos de altitud. Usando valores por defecto.");
          fetchedEnvData = await fetchEnvironmentalData(); // Fetch with no coords
        }
      } else {
        setEnvError("Geolocalización no soportada. Usando valores por defecto para altitud.");
        fetchedEnvData = await fetchEnvironmentalData(); // Fetch with no coords
      }
      setEnvironmentalData(fetchedEnvData);

      const predictionInputVitals = vitals ? {
          heartRate: vitals.heartRate,
          systolicPressure: vitals.systolicPressure,
          oxygenSaturation: vitals.oxygenSaturation,
          temperature: vitals.temperature,
      } : undefined;

      const predictionResult = await predictEarlyRisks(currentUser.id, predictionInputVitals, fetchedEnvData || undefined);
      setPrediction(predictionResult);

    } catch (e) {
      console.error("Risk prediction page error:", e);
      setError("Error al obtener la predicción de riesgos. Por favor, inténtelo de nuevo.");
      setPrediction(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPredictionData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const cardDescription = () => {
    let desc = "Basado en los datos más recientes.";
    if (latestVitals) {
      desc += ` Signos vitales de ${format(new Date(latestVitals.timestamp), "PPp", { locale: es })}.`;
    } else {
      desc += " No hay signos vitales recientes. Para una evaluación más precisa, registre sus signos vitales.";
    }
    if (environmentalData?.altitude) desc += ` Altitud: ${environmentalData.altitude}m.`;
    if (environmentalData?.stepsToday) desc += ` Pasos: ${environmentalData.stepsToday}.`;
    return desc;
  };


  return (
    <div className="container mx-auto py-2 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Predicción de Riesgos de Salud por IA</h1>
        <p className="text-muted-foreground">
          Vea información impulsada por IA basada en sus últimos signos vitales, perfil y contexto ambiental.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error de Predicción</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
       {envError && (
        <Alert variant="warning" className="mb-6">
          <AlertTitle>Aviso de Datos Ambientales</AlertTitle>
          <AlertDescription>{envError}</AlertDescription>
        </Alert>
      )}


      <Card>
        <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center">
              <ShieldAlert className="mr-2 h-6 w-6 text-primary" />
              Su Evaluación de Riesgos Actual
            </CardTitle>
            {!loading && <CardDescription>{cardDescription()}</CardDescription>}
            {loading && <Skeleton className="h-4 w-3/4 mt-1" />}
          </div>
          <Button onClick={fetchPredictionData} disabled={loading || refreshing} variant="outline" size="icon" aria-label="Refrescar predicción">
            {(loading && !refreshing) || refreshing ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          {loading && !refreshing ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full mt-4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : prediction ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Evaluación:</h3>
                <p className="text-md" aria-live="polite">{prediction.riskAssessment}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Recomendaciones:</h3>
                <p className="text-md text-muted-foreground" aria-live="polite">{prediction.recommendations}</p>
              </div>
            </div>
          ) : !error ? (
             <div className="flex flex-col items-center justify-center text-center py-8">
              <Info className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No hay datos de predicción disponibles.</p>
              <p className="text-muted-foreground">
                {latestVitals ? "Intente refrescar o vuelva más tarde." : <>Por favor <Link href="/dashboard/vitals" className="text-primary hover:underline">registre sus signos vitales</Link> para obtener una evaluación de riesgos.</> }
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {((latestVitals || environmentalData)) && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Datos Usados para esta Evaluación</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestVitals && (
              <>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center"><HeartPulse className="mr-2 h-4 w-4 text-primary" /> Frecuencia Cardíaca:</div>
                  <span className="font-semibold">{latestVitals.heartRate} lpm</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center"><Activity className="mr-2 h-4 w-4 text-primary" /> Presión Sistólica:</div>
                  <span className="font-semibold">{latestVitals.systolicPressure} mmHg</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center"><Wind className="mr-2 h-4 w-4 text-primary" /> Saturación de Oxígeno:</div>
                  <span className="font-semibold">{latestVitals.oxygenSaturation} %</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center"><Thermometer className="mr-2 h-4 w-4 text-primary" /> Temperatura:</div>
                  <span className="font-semibold">{latestVitals.temperature} °C</span>
                </div>
              </>
            )}
            {environmentalData?.stepsToday !== undefined && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center"><Footprints className="mr-2 h-4 w-4 text-primary" /> Pasos de Hoy:</div>
                <span className="font-semibold">{environmentalData.stepsToday}</span>
              </div>
            )}
            {environmentalData?.altitude !== undefined && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center"><Mountain className="mr-2 h-4 w-4 text-primary" /> Altitud Estimada:</div>
                <span className="font-semibold">{environmentalData.altitude} m</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
       {!latestVitals && !environmentalData && !loading && !error && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Sin Datos Completos</AlertTitle>
            <AlertDescription>
              La evaluación de riesgos actual puede ser limitada. Para una evaluación más personalizada y precisa, por favor <Link href="/dashboard/vitals" className="text-primary hover:underline font-medium">registre sus últimos signos vitales</Link> y asegúrese de que la aplicación tiene acceso a su ubicación para datos de altitud.
            </AlertDescription>
          </Alert>
        )}
    </div>
  );
}
