
// src/app/(app)/dashboard/patients/[patientId]/report/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getUserProfile, getVitalSignsHistory, predictInitialProfileRisk, predictEarlyRisks } from '@/lib/firebaseService';
import { summarizeHealthTrends } from '@/ai/flows/summarize-health-trends';
import { VitalsChart } from '@/components/VitalsChart';
import { PrintButton } from '@/components/PrintButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, User, Shield, BarChart, Activity, Info, ListChecks, FileText, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PrintStyles } from '@/components/PrintStyles';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile, VitalSign, PredictInitialProfileRiskOutput, PredictEarlyRisksOutput } from '@/types';
import type { SummarizeHealthTrendsOutput } from '@/ai/flows/summarize-health-trends';

type ReportData = {
  patientProfile: UserProfile;
  vitalHistory: VitalSign[];
  initialRisk: PredictInitialProfileRiskOutput;
  detailedRisk: PredictEarlyRisksOutput;
  trendsSummary: SummarizeHealthTrendsOutput;
};

export default function PatientReportPage() {
  const params = useParams();
  const patientId = params.patientId as string;

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;

    const fetchReportData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [patientProfile, vitalHistory] = await Promise.all([
          getUserProfile(patientId),
          getVitalSignsHistory(patientId, 50)
        ]);

        if (!patientProfile) {
          throw new Error(`No se pudo encontrar el perfil del paciente con ID: ${patientId}`);
        }

        const latestVitals = vitalHistory.length > 0 ? vitalHistory[0] : null;

        const [initialRisk, detailedRisk, trendsSummary] = await Promise.all([
          predictInitialProfileRisk(patientId),
          predictEarlyRisks(patientId, latestVitals ?? undefined),
          summarizeHealthTrends(vitalHistory)
        ]);
        
        setReportData({
          patientProfile,
          vitalHistory,
          initialRisk,
          detailedRisk,
          trendsSummary
        });

      } catch (e: any) {
        console.error("Error fetching report data:", e);
        setError(e.message || "Ocurrió un error al generar el reporte.");
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [patientId]);

  const getRiskBadgeVariant = (riskLevel: string | undefined): "default" | "secondary" | "destructive" | "outline" => {
    if (!riskLevel) return 'secondary';
    switch (riskLevel.toLowerCase()) {
      case 'alto': return 'destructive';
      case 'medio': return 'default';
      case 'bajo': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
        <div className="container mx-auto py-2 space-y-6">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <Skeleton className="h-8 w-96 mb-2"/>
                    <Skeleton className="h-4 w-64"/>
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-10"/>
                    <Skeleton className="h-10 w-36"/>
                </div>
            </div>
            <Separator className="my-4" />
            <Card><CardHeader><Skeleton className="h-6 w-48"/></CardHeader><CardContent><Skeleton className="h-20 w-full"/></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-6 w-48"/></CardHeader><CardContent><Skeleton className="h-16 w-full"/></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-6 w-48"/></CardHeader><CardContent><Skeleton className="h-24 w-full"/></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-6 w-48"/></CardHeader><CardContent><Skeleton className="h-72 w-full"/></CardContent></Card>
        </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-2">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error al Generar Reporte</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!reportData) {
    return (
        <div className="container mx-auto py-2 text-center">
            <Info className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
                No hay datos disponibles para generar el reporte.
            </p>
        </div>
    );
  }
  
  const { patientProfile, vitalHistory, initialRisk, detailedRisk, trendsSummary } = reportData;

  return (
    <div className="container mx-auto py-2 space-y-6 print:space-y-4">
      <PrintStyles />

      <div className="printable-area">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Reporte de Salud del Paciente</h1>
                <p className="text-muted-foreground">Generado el: {format(new Date(), 'PPpp', { locale: es })}</p>
              </div>
            </div>
          </div>
          <div className="no-print flex items-center gap-2">
             <Button asChild variant="outline" size="icon" aria-label="Volver a la lista de pacientes">
                <Link href="/dashboard/patients"><ArrowLeft className="h-4 w-4" /></Link>
             </Button>
            <PrintButton />
          </div>
        </div>

        <Separator className="my-4" />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5" /> Información del Paciente</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Nombre:</strong> {patientProfile.name || 'N/A'}</p>
              <p><strong>Email:</strong> {patientProfile.email || 'N/A'}</p>
              <p><strong>Edad:</strong> {patientProfile.age || 'N/A'}</p>
              <p><strong>Sexo:</strong> {patientProfile.sex || 'N/A'}</p>
            </div>
            <div>
              <p><strong>Diagnóstico Médico:</strong> {patientProfile.medicalDiagnosis || 'No especificado'}</p>
              <p><strong>Medicamentos Actuales:</strong> {patientProfile.currentMedications || 'No especificado'}</p>
            </div>
            <div className="md:col-span-2">
              <h3 className="font-semibold text-md mb-2 flex items-center"><BarChart className="mr-2 h-4 w-4"/> Evaluación de Riesgo Inicial (Perfil)</h3>
              <Badge variant={getRiskBadgeVariant(initialRisk.riskLevel)}>Nivel de Riesgo: {initialRisk.riskLevel}</Badge>
              <p className="text-sm text-muted-foreground mt-1">{initialRisk.justification}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
           <CardHeader>
            <CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5" /> Evaluación Contextual Actual</CardTitle>
            <CardDescription>Basado en los últimos signos vitales registrados el: {vitalHistory.length > 0 ? format(new Date(vitalHistory[0].timestamp), 'PPp', { locale: es }) : 'N/A'}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-lg mb-2">{detailedRisk.riskAssessment}</p>
            <p className="text-sm text-muted-foreground">{detailedRisk.recommendations}</p>
          </CardContent>
        </Card>

         <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center"><Activity className="mr-2 h-5 w-5" /> Resumen de Tendencias por IA</CardTitle>
             <CardDescription>Análisis del historial reciente de signos vitales.</CardDescription>
          </CardHeader>
          <CardContent>
             {vitalHistory.length > 0 ? (
                <>
                  <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
                    <p>{trendsSummary.summary}</p>
                  </div>
                  <h4 className="font-semibold mb-2 flex items-center"><ListChecks className="mr-2 h-4 w-4"/>Observaciones Clave:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {trendsSummary.keyObservations.map((obs, i) => <li key={i}>{obs}</li>)}
                  </ul>
                </>
             ) : (
                <p className="text-muted-foreground">No hay suficiente historial de signos vitales para generar un resumen de tendencias.</p>
             )}
          </CardContent>
        </Card>
        
        {vitalHistory.length > 0 ? (
          <VitalsChart data={vitalHistory} />
        ) : (
           <Card>
            <CardHeader>
              <CardTitle>Historial Gráfico de Signos Vitales</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <Info className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay datos históricos para mostrar en el gráfico.</p>
            </CardContent>
           </Card>
        )}
      </div>
    </div>
  );
}
