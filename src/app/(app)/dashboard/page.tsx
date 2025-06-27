
// src/app/(app)/dashboard/page.tsx
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import type { PredictEarlyRisksOutput, VitalSign, EnvironmentalData, PredictInitialProfileRiskOutput, UserProfile } from '@/types';
import { getLatestVitalSign, predictEarlyRisks, fetchEnvironmentalData, predictInitialProfileRisk } from '@/lib/firebaseService';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HeartPulse, ShieldCheck, Thermometer, Wind, Activity, FilePlus2, BarChartHorizontalBig, UserCog2, Footprints, Mountain, AlertCircle, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

function InfoCard({ title, value, unit, icon: Icon, time, dataTestId, loading, error, description }: { title: string, value?: string | number | null, unit?: string, icon: React.ElementType, time?: number, dataTestId?: string, loading?: boolean, error?: string | null, description?: string }) {
  return (
    <Card data-testid={dataTestId}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-20 inline-block" /> :
         error ? <p className="text-xs text-destructive pt-1 flex items-center"><AlertCircle className="h-3 w-3 mr-1"/>{error}</p> :
         value !== null && value !== undefined ? (
          <div className="text-2xl font-bold">{value} {unit}</div>
        ) : (
          <p className="text-xs text-muted-foreground pt-1">No hay datos</p>
        )}
        {time && !loading && !error && value !== null && value !== undefined && (
          <p className="text-xs text-muted-foreground pt-1">
            Última actualización: {format(new Date(time), "PPp", { locale: es })}
          </p>
        )}
        {description && !loading && !error && (
            <p className="text-xs text-muted-foreground pt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}


export default function DashboardPage() {
  const { currentUser } = useAuth() as { currentUser: UserProfile }; // Assert currentUser has role
  const [latestVitals, setLatestVitals] = useState<VitalSign | null>(null);
  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalData | null>(null);
  const [detailedRiskPrediction, setDetailedRiskPrediction] = useState<PredictEarlyRisksOutput | null>(null);
  const [initialProfileRisk, setInitialProfileRisk] = useState<PredictInitialProfileRiskOutput | null>(null);


  const [loadingVitals, setLoadingVitals] = useState(true);
  const [loadingEnvData, setLoadingEnvData] = useState(true);
  const [loadingDetailedPrediction, setLoadingDetailedPrediction] = useState(true);
  const [loadingInitialRisk, setLoadingInitialRisk] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [envError, setEnvError] = useState<string | null>(null);
  const isCaregiver = currentUser?.role === 'caregiver';

  useEffect(() => {
    if (currentUser?.id) {
      setLoadingInitialRisk(true);
      predictInitialProfileRisk(currentUser.id)
        .then(profileRisk => {
          setInitialProfileRisk(profileRisk);
        })
        .catch(e => {
          console.error("Error fetching initial profile risk:", e);
        })
        .finally(() => {
          setLoadingInitialRisk(false);
        });

      // Fetch patient-specific data only if user is not a caregiver
      if (!isCaregiver) {
        const fetchPatientData = async () => {
          setLoadingVitals(true);
          setLoadingEnvData(true);
          setLoadingDetailedPrediction(true);
          setError(null);
          setEnvError(null);

          let vitalsData: VitalSign | null = null;
          let envDataForPrediction: EnvironmentalData | null = null;

          try {
            vitalsData = await getLatestVitalSign(currentUser.id);
            setLatestVitals(vitalsData);
          } catch (e) {
              console.error("Error fetching vitals:", e);
              setError(prev => prev || "Error al cargar signos vitales.");
          } finally {
              setLoadingVitals(false);
          }

          try {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                async (position) => {
                  const { latitude, longitude } = position.coords;
                  const envData = await fetchEnvironmentalData(latitude, longitude);
                  setEnvironmentalData(envData);
                  envDataForPrediction = envData;
                  setLoadingEnvData(false);
                  triggerDetailedPrediction(vitalsData, envDataForPrediction);
                },
                async (geoError) => {
                  console.warn("Error obteniendo geolocalización:", geoError.message);
                  let specificError = "No se pudo obtener la ubicación para datos de altitud.";
                  if (geoError.code === geoError.PERMISSION_DENIED) {
                      specificError = "Permiso de ubicación denegado. Se usarán valores por defecto para altitud.";
                  } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
                      specificError = "Ubicación no disponible. Se usarán valores por defecto para altitud.";
                  }
                  setEnvError(specificError);
                  const envData = await fetchEnvironmentalData(); 
                  setEnvironmentalData(envData);
                  envDataForPrediction = envData;
                  setLoadingEnvData(false);
                  triggerDetailedPrediction(vitalsData, envDataForPrediction);
                },
                { timeout: 10000 } 
              );
            } else {
              setEnvError("Geolocalización no soportada. Se usarán valores por defecto para altitud.");
              const envData = await fetchEnvironmentalData(); 
              setEnvironmentalData(envData);
              envDataForPrediction = envData;
              setLoadingEnvData(false);
              triggerDetailedPrediction(vitalsData, envDataForPrediction);
            }
          } catch (e) {
            console.error("Error fetching environmental data:", e);
            setEnvError("Error al cargar datos ambientales.");
            setLoadingEnvData(false);
            triggerDetailedPrediction(vitalsData, null); 
          }

          if (!navigator.geolocation) {
             triggerDetailedPrediction(vitalsData, envDataForPrediction);
          }
        };
        fetchPatientData();
      } else {
        // For caregivers, set loading states to false as these sections won't be shown
        setLoadingVitals(false);
        setLoadingEnvData(false);
        setLoadingDetailedPrediction(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, isCaregiver]); // Added isCaregiver as dependency

  const triggerDetailedPrediction = async (vitals: VitalSign | null, envData: EnvironmentalData | null) => {
    if (!currentUser?.id || isCaregiver) return; // Don't run for caregivers
    setLoadingDetailedPrediction(true);
    try {
        const predictionInputVitals = vitals ? {
            heartRate: vitals.heartRate,
            systolicPressure: vitals.systolicPressure,
            oxygenSaturation: vitals.oxygenSaturation,
            temperature: vitals.temperature,
        } : undefined;

        const prediction = await predictEarlyRisks(currentUser.id, predictionInputVitals, envData || undefined);
        setDetailedRiskPrediction(prediction);
    } catch(e) {
        console.error("Error fetching detailed prediction:", e);
        setError(prev => prev || "Error al cargar la predicción de riesgos detallada.");
    } finally {
        setLoadingDetailedPrediction(false);
    }
  };


  const displayName = currentUser?.name || currentUser?.email?.split('@')[0] || "Usuario";
  
  const getRiskBadgeVariant = (riskLevel: string | undefined): "default" | "secondary" | "destructive" | "outline" => {
    if (!riskLevel) return 'secondary';
    switch (riskLevel.toLowerCase()) {
      case 'alto': return 'destructive';
      case 'medio': return 'default'; 
      case 'bajo': return 'secondary'; 
      default: return 'outline';
    }
  };


  return (
    <div className="container mx-auto py-2">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {isCaregiver ? "Panel de Cuidador: " : ""}¡Bienvenido de nuevo, {displayName}!
        </h1>
        <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">
              {isCaregiver 
                ? "Supervise y gestione la salud de sus pacientes asignados." 
                : "Aquí tiene un resumen rápido de su estado de salud y contexto ambiental."
              }
            </p>
            {loadingInitialRisk ? <Skeleton className="h-6 w-24" /> :
             initialProfileRisk && (
                <Badge variant={getRiskBadgeVariant(initialProfileRisk.riskLevel)} className="text-xs">
                   Riesgo de Perfil: {initialProfileRisk.riskLevel}
                </Badge>
            )}
        </div>
      </div>

      {error && !isCaregiver && ( // Only show general error if not caregiver and error is relevant
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error General del Panel</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isCaregiver && (
        <Card className="mb-8 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-700 dark:text-blue-300">
              <Users className="mr-2 h-6 w-6"/> Vista de Cuidador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-600 dark:text-blue-400">
              Este panel está diseñado para la supervisión de pacientes. En futuras versiones, aquí podrá ver una lista de sus pacientes asignados,
              acceder a su información detallada (como nombre, últimos signos vitales: frecuencia cardíaca, presión sistólica, oxígeno),
              y ver su evaluación de riesgos contextual.
            </p>
          </CardContent>
        </Card>
      )}

      {!isCaregiver && (
        <>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Últimos Signos Vitales</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <InfoCard title="Frecuencia Cardíaca" value={latestVitals?.heartRate} unit="lpm" icon={HeartPulse} time={latestVitals?.timestamp} dataTestId="heart-rate-card" loading={loadingVitals} />
              <InfoCard title="Presión Sistólica" value={latestVitals?.systolicPressure} unit="mmHg" icon={Activity} time={latestVitals?.timestamp} dataTestId="systolic-pressure-card" loading={loadingVitals} />
              <InfoCard title="Saturación de Oxígeno" value={latestVitals?.oxygenSaturation} unit="%" icon={Wind} time={latestVitals?.timestamp} dataTestId="oxygen-saturation-card" loading={loadingVitals} />
              <InfoCard title="Temperatura" value={latestVitals?.temperature} unit="°C" icon={Thermometer} time={latestVitals?.timestamp} dataTestId="temperature-card" loading={loadingVitals} />
            </div>
            {!loadingVitals && !latestVitals && !error && (
               <p className="text-muted-foreground mt-4">Aún no se han registrado signos vitales. <Link href="/dashboard/vitals" className="text-primary hover:underline">Añada sus signos vitales ahora.</Link></p>
            )}
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Contexto Ambiental (Estimado)</h2>
            <div className="grid gap-4 md:grid-cols-2">
                <InfoCard title="Pasos Estimados Hoy" value={environmentalData?.stepsToday} unit="pasos" icon={Footprints} dataTestId="steps-today-card" loading={loadingEnvData} error={envError && !environmentalData?.stepsToday ? envError : undefined} description={!loadingEnvData && !envError ? "Simulación basada en actividad general." : ""} />
                <InfoCard title="Altitud Estimada" value={environmentalData?.altitude} unit="m" icon={Mountain} dataTestId="altitude-card" loading={loadingEnvData} error={envError && !environmentalData?.altitude ? envError : undefined} description={!loadingEnvData && !envError ? "Basada en ubicación (si está permitida) o valores por defecto." : ""} />
            </div>
            {loadingEnvData && <p className="text-muted-foreground mt-2">Obteniendo datos ambientales estimados...</p>}
             {envError && !isCaregiver && ( // Only show envError if not caregiver
                <Alert variant="warning" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Aviso de Datos Ambientales</AlertTitle>
                    <AlertDescription>{envError}</AlertDescription>
                </Alert>
            )}
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Evaluación Detallada de Riesgos por IA (Contextual)</h2>
             {loadingDetailedPrediction ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
              </Card>
            ) : detailedRiskPrediction ? (
              <Card className="bg-card border-accent shadow-md" data-testid="risk-assessment-card">
                <CardHeader>
                  <CardTitle className="flex items-center text-accent">
                    <ShieldCheck className="mr-2 h-6 w-6" />
                    Resumen de Riesgos Detallado
                  </CardTitle>
                  <CardDescription>
                    Basado en los últimos datos disponibles (signos vitales, perfil y ambiente).
                    {(latestVitals || environmentalData) && (
                      <>
                        {latestVitals && ` Signos vitales de ${format(new Date(latestVitals.timestamp), "PPp", { locale: es })}.`}
                        {environmentalData?.altitude && ` Altitud: ${environmentalData.altitude}m.`}
                        {environmentalData?.stepsToday && ` Pasos: ${environmentalData.stepsToday}.`}
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-lg mb-2">{detailedRiskPrediction.riskAssessment}</p>
                  <p className="text-sm text-muted-foreground">{detailedRiskPrediction.recommendations}</p>
                </CardContent>
              </Card>
            ) : (
              <p className="text-muted-foreground">La evaluación de riesgos detallada estará disponible una vez que se procesen todos los datos. Esto puede tomar un momento.</p>
            )}
          </section>
        </>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-4">Acciones Rápidas</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {!isCaregiver && (
            <Link href="/dashboard/vitals" passHref legacyBehavior>
              <Button variant="outline" className="w-full justify-start text-base py-6">
                <FilePlus2 className="mr-3 h-5 w-5 text-primary" /> Registrar Nuevos Signos Vitales
              </Button>
            </Link>
          )}
          <Link href="/dashboard/history" passHref legacyBehavior>
            <Button variant="outline" className="w-full justify-start text-base py-6">
              <BarChartHorizontalBig className="mr-3 h-5 w-5 text-primary" /> Ver Historial {isCaregiver ? "(Funcionalidad de Paciente)" : "Personal"}
            </Button>
          </Link>
          <Link href="/dashboard/profile" passHref legacyBehavior>
            <Button variant="outline" className="w-full justify-start text-base py-6">
             <UserCog2 className="mr-3 h-5 w-5 text-primary" /> Actualizar Perfil
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

    
