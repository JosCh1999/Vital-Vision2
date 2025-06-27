// src/app/(app)/dashboard/notifications/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getVitalAlertsHistory } from '@/lib/firebaseService';
import type { AlertLog } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, Clock, Info, BellRing } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VITAL_RANGES } from '@/lib/constants';

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.id) {
      setLoading(true);
      setError(null);
      getVitalAlertsHistory(currentUser.id, 50) // Fetch a reasonable number of recent alerts
        .then(data => {
          setAlerts(data);
        })
        .catch(err => {
          console.error("Error fetching alert history:", err);
          setError("Error al cargar el historial de alertas.");
        })
        .finally(() => setLoading(false));
    }
  }, [currentUser?.id]);

  const getVitalSignFriendlyName = (type: keyof typeof VITAL_RANGES) => {
    return VITAL_RANGES[type]?.name || type;
  }

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <BellRing className="mr-3 h-8 w-8 text-primary" />
          Historial de Alertas de Signos Vitales
        </h1>
        <p className="text-muted-foreground">
          Revise las alertas generadas cuando los signos vitales estuvieron fuera de rango.
        </p>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Error al Cargar Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Alertas Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table aria-live="polite">
            <TableCaption>
              {loading ? "Cargando alertas..." :
                alerts.length === 0 ? "No hay alertas registradas." :
                  `Mostrando ${alerts.length} alerta(s).`}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Fecha y Hora</TableHead>
                <TableHead>Tipo de Signo Vital</TableHead>
                <TableHead>Valor Registrado</TableHead>
                <TableHead>Rango Normal</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={`skeleton-alert-${i}`}>
                    <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-1/3" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-1/2 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : alerts.length > 0 ? (
                alerts.map((alert) => (
                  <TableRow key={alert.id} className={alert.status === 'active' ? 'bg-destructive/5 hover:bg-destructive/10' : 'bg-muted/30'}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        {format(new Date(alert.timestamp), 'PPpp', { locale: es })}
                      </div>
                    </TableCell>
                    <TableCell>{getVitalSignFriendlyName(alert.vitalSignType)}</TableCell>
                    <TableCell>
                      <Badge variant={alert.status === 'active' ? "destructive" : "secondary"}>
                        {alert.value} {VITAL_RANGES[alert.vitalSignType]?.unit || ''}
                      </Badge>
                    </TableCell>
                    <TableCell>{alert.normalRange}</TableCell>
                    <TableCell className="text-sm">{alert.message}</TableCell>
                    <TableCell className="text-center">
                      {alert.status === 'active' ? (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="mr-1 h-3 w-3" /> Activa
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Vista
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Info className="h-10 w-10 mb-3" />
                      <p className="text-lg font-medium">No se han registrado alertas.</p>
                      <p>El sistema le notificará aquí si algún signo vital se sale de los rangos normales.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
