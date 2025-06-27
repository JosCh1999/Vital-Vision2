
// src/app/(app)/dashboard/recommendations/page.tsx
"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { generatePersonalizedRecommendations } from '@/lib/firebaseService';
import type { GeneratePersonalizedRecommendationsOutput } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles, Bot, AlertTriangle, Lightbulb, CheckSquare, Info } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/skeleton';

export default function RecommendationsPage() {
  const { currentUser } = useAuth();
  const [recommendations, setRecommendations] = useState<GeneratePersonalizedRecommendationsOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateRecommendations = async () => {
    if (!currentUser?.id) {
      setError("No se pudo verificar la identidad del usuario. Por favor, inicie sesión de nuevo.");
      return;
    }
    setLoading(true);
    setError(null);
    setRecommendations(null);

    try {
      const result = await generatePersonalizedRecommendations(currentUser.id);
      setRecommendations(result);
    } catch (e: any) {
      console.error("Error generating recommendations:", e);
      setError(e.message || "Ocurrió un error inesperado al generar las recomendaciones. Por favor, inténtelo de nuevo más tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-2 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Sparkles className="mr-3 h-8 w-8 text-primary" />
          Recomendaciones de Salud por IA
        </h1>
        <p className="text-muted-foreground">
          Obtenga consejos personalizados basados en su perfil y su historial de salud reciente.
        </p>
      </div>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Genere su Reporte de Recomendaciones</CardTitle>
          <CardDescription>
            Presione el botón para que nuestro asistente de IA analice su información más reciente y le ofrezca un resumen y consejos prácticos. Este proceso puede tardar unos segundos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerateRecommendations} disabled={loading}>
            {loading ? (
              <>
                <Spinner className="mr-2" />
                Analizando...
              </>
            ) : (
              <>
                <Bot className="mr-2" />
                Generar Mis Recomendaciones
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error al Generar</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6 mt-2" />
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3 mb-2" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </CardContent>
          </Card>
        </div>
      ) : recommendations ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />
                Resumen Personalizado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{recommendations.personalizedSummary}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckSquare className="mr-2 h-5 w-5 text-green-600" />
                Recomendaciones Prácticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 list-disc pl-5 text-muted-foreground">
                {recommendations.actionableRecommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : (
         <Card className="text-center py-10">
            <CardContent>
                <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Sus recomendaciones aparecerán aquí.</p>
                <p className="text-muted-foreground">Haga clic en el botón de arriba para comenzar.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

