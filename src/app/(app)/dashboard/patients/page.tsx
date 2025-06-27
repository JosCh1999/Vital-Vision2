// src/app/(app)/dashboard/patients/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getAllPatients } from '@/lib/firebaseService';
import type { UserProfile } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Users, AlertTriangle, Eye, FileText } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function PatientsPage() {
  const { currentUser } = useAuth();
  const [patients, setPatients] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCaregiver = currentUser?.role === 'caregiver';

  useEffect(() => {
    if (isCaregiver) {
      setLoading(true);
      getAllPatients()
        .then(data => {
          setPatients(data);
        })
        .catch(err => {
          console.error("Error fetching patients:", err);
          setError("Error de Permisos: No se pudo cargar la lista de pacientes. Asegúrese de que las reglas de seguridad de Firestore permitan a los cuidadores listar los perfiles de usuario.");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isCaregiver]);

  if (currentUser && !isCaregiver) {
    return (
      <div className="container mx-auto py-2">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Acceso Denegado</AlertTitle>
          <AlertDescription>
            Esta página solo está disponible para usuarios con el rol de Cuidador.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Users className="mr-3 h-8 w-8 text-primary" />
          Gestión de Pacientes
        </h1>
        <p className="text-muted-foreground">
          Vea la lista de pacientes registrados, acceda a su historial detallado y genere reportes de salud.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error al Cargar Pacientes</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={`skeleton-patient-${i}`}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
              <CardFooter className="flex gap-2">
                 <Skeleton className="h-10 w-1/2" />
                 <Skeleton className="h-10 w-1/2" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : patients.length > 0 ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map(patient => (
            <Card key={patient.id}>
              <CardHeader>
                <CardTitle>{patient.name || 'Nombre no disponible'}</CardTitle>
                <CardDescription>{patient.email}</CardDescription>
              </CardHeader>
              <CardContent>
                 <Badge variant="outline">
                    {patient.age ? `${patient.age} años` : 'Edad no especificada'}
                 </Badge>
              </CardContent>
              <CardFooter className="flex justify-between gap-2">
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/dashboard/patients/${patient.id}/history`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Historial
                  </Link>
                </Button>
                <Button asChild className="w-full">
                  <Link href={`/dashboard/patients/${patient.id}/report`}>
                    <FileText className="mr-2 h-4 w-4" />
                    Ver Reporte
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-8">
            <CardContent>
                <p className="text-muted-foreground">No se encontraron pacientes registrados en el sistema.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
