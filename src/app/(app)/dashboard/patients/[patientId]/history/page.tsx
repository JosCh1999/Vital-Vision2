// src/app/(app)/dashboard/patients/[patientId]/history/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getVitalSignsHistory, getUserProfile } from '@/lib/firebaseService';
import type { VitalSign, UserProfile } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-range';
import { Download, Filter, RotateCcw, Info, HeartPulse, Activity, Wind, Thermometer, ArrowLeft, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useParams } from 'next/navigation';

const VitalSignType = {
  ALL: 'all',
  HEART_RATE: 'heartRate',
  SYSTOLIC_PRESSURE: 'systolicPressure',
  OXYGEN_SATURATION: 'oxygenSaturation',
  TEMPERATURE: 'temperature',
} as const;

type VitalSignKey = keyof typeof VitalSignType;


export default function PatientHistoryPage() {
  const { currentUser } = useAuth();
  const params = useParams();
  const patientId = params.patientId as string;

  const [patientProfile, setPatientProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<VitalSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [vitalTypeFilter, setVitalTypeFilter] = useState<typeof VitalSignType[VitalSignKey]>(VitalSignType.ALL);
  
  const isCaregiver = currentUser?.role === 'caregiver';

  useEffect(() => {
    // Only caregivers can view this page, and a patientId must be present.
    if (isCaregiver && patientId) {
      setLoading(true);
      setError(null);

      Promise.all([
        getUserProfile(patientId),
        getVitalSignsHistory(patientId, 100)
      ])
      .then(([profile, data]) => {
        if (!profile) {
          setError("No se pudo encontrar el perfil del paciente.");
        }
        setPatientProfile(profile);
        setHistory(data);
      })
      .catch(err => {
        console.error("Error fetching patient history:", err);
        setError("Error de Permisos: No se pudo cargar el historial del paciente. Verifique que las reglas de seguridad de Firestore permitan a los cuidadores leer los datos de los pacientes.");
      })
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isCaregiver, patientId]);

  const filteredHistory = useMemo(() => {
    return history
      .filter(item => {
        if (!dateRange?.from) return true;
        const itemDate = new Date(item.timestamp);
        const fromDate = dateRange.from;
        let toDate = dateRange.to ? new Date(dateRange.to) : new Date(fromDate); 

        if (dateRange.to) {
            toDate.setHours(23,59,59,999);
        } else {
            toDate.setHours(23,59,59,999);
        }
        
        return itemDate >= fromDate && itemDate <= toDate;
      })
      .sort((a, b) => b.timestamp - a.timestamp); 
  }, [history, dateRange]);

  const exportToCSV = () => {
    if (filteredHistory.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }
    const headers = "Marca de Tiempo,Frecuencia Cardíaca (lpm),Presión Sistólica (mmHg),Saturación de Oxígeno (%),Temperatura (°C)\n";
    const csvContent = filteredHistory.map(item => 
      `${format(new Date(item.timestamp), 'yyyy-MM-dd HH:mm:ss', { locale: es })},${item.heartRate},${item.systolicPressure},${item.oxygenSaturation},${item.temperature}`
    ).join("\n");
    
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `vital_vision_historial_${patientProfile?.name?.replace(' ', '_') || patientId}_${format(new Date(), 'yyyyMMddHHmmss')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetFilters = () => {
    setDateRange(undefined);
    setVitalTypeFilter(VitalSignType.ALL);
  };

  if (currentUser && !isCaregiver) {
     return (
      <div className="container mx-auto py-2">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Acceso Denegado</AlertTitle>
          <AlertDescription>
            Solo los cuidadores pueden ver el historial de los pacientes.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const patientName = patientProfile?.name || 'paciente';

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex items-center gap-4">
         <Button asChild variant="outline" size="icon" aria-label="Volver a la lista de pacientes">
            <Link href="/dashboard/patients"><ArrowLeft className="h-4 w-4" /></Link>
         </Button>
         <div>
            <h1 className="text-3xl font-bold tracking-tight">Historial de: {loading ? <Skeleton className="h-8 w-48 inline-block" /> : patientName}</h1>
            <p className="text-muted-foreground">Revise los signos vitales registrados para este paciente.</p>
         </div>
      </div>

        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Filter className="mr-2 h-5 w-5 text-primary"/> Filtros</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <label htmlFor="date-range-picker-history" className="text-sm font-medium text-muted-foreground">Rango de Fechas</label>
                <DatePickerWithRange id="date-range-picker-history" date={dateRange} onDateChange={setDateRange} className="w-full" aria-label="Seleccionar rango de fechas para filtrar el historial"/>
              </div>
              <div className="space-y-1">
                <label htmlFor="vital-type-select-history" className="text-sm font-medium text-muted-foreground">Tipo de Signo Vital</label>
                <Select value={vitalTypeFilter} onValueChange={(value) => setVitalTypeFilter(value as typeof VitalSignKey)}>
                  <SelectTrigger id="vital-type-select-history" className="w-full" aria-label="Seleccionar tipo de signo vital para filtrar el historial">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VitalSignType.ALL}>Todos los Signos</SelectItem>
                    <SelectItem value={VitalSignType.HEART_RATE}>Frecuencia Cardíaca</SelectItem>
                    <SelectItem value={VitalSignType.SYSTOLIC_PRESSURE}>Presión Sistólica</SelectItem>
                    <SelectItem value={VitalSignType.OXYGEN_SATURATION}>Saturación de Oxígeno</SelectItem>
                    <SelectItem value={VitalSignType.TEMPERATURE}>Temperatura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={resetFilters} variant="outline" className="w-full md:w-auto">
                  <RotateCcw className="mr-2 h-4 w-4" /> Restablecer Filtros
                </Button>
                <Button onClick={exportToCSV} className="w-full md:w-auto" disabled={filteredHistory.length === 0}>
                  <Download className="mr-2 h-4 w-4" /> Exportar CSV
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Table aria-live="polite">
            <TableCaption>
              {loading ? "Cargando historial de signos vitales del paciente." : 
              filteredHistory.length === 0 ? "No se encontraron signos vitales para este paciente." :
              `Mostrando ${filteredHistory.length} registro(s) de signos vitales.`}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Marca de Tiempo</TableHead>
                {vitalTypeFilter === VitalSignType.ALL || vitalTypeFilter === VitalSignType.HEART_RATE ? <TableHead><HeartPulse className="inline mr-1 h-4 w-4" aria-hidden="true"/>Frecuencia Cardíaca</TableHead> : null}
                {vitalTypeFilter === VitalSignType.ALL || vitalTypeFilter === VitalSignType.SYSTOLIC_PRESSURE ? <TableHead><Activity className="inline mr-1 h-4 w-4" aria-hidden="true"/>Presión Sistólica</TableHead> : null}
                {vitalTypeFilter === VitalSignType.ALL || vitalTypeFilter === VitalSignType.OXYGEN_SATURATION ? <TableHead><Wind className="inline mr-1 h-4 w-4" aria-hidden="true"/>Sat. Oxígeno</TableHead> : null}
                {vitalTypeFilter === VitalSignType.ALL || vitalTypeFilter === VitalSignType.TEMPERATURE ? <TableHead><Thermometer className="inline mr-1 h-4 w-4" aria-hidden="true"/>Temp.</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                    {vitalTypeFilter === VitalSignType.ALL || vitalTypeFilter === VitalSignType.HEART_RATE ? <TableCell><Skeleton className="h-5 w-1/2" /></TableCell> : null}
                    {vitalTypeFilter === VitalSignType.ALL || vitalTypeFilter === VitalSignType.SYSTOLIC_PRESSURE ? <TableCell><Skeleton className="h-5 w-1/2" /></TableCell> : null}
                    {vitalTypeFilter === VitalSignType.ALL || vitalTypeFilter === VitalSignType.OXYGEN_SATURATION ? <TableCell><Skeleton className="h-5 w-1/2" /></TableCell> : null}
                    {vitalTypeFilter === VitalSignType.ALL || vitalTypeFilter === VitalSignType.TEMPERATURE ? <TableCell><Skeleton className="h-5 w-1/2" /></TableCell> : null}
                  </TableRow>
                ))
              ) : filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{format(new Date(item.timestamp), 'PPpp', { locale: es })}</TableCell>
                    {vitalTypeFilter === VitalSignType.ALL || vitalTypeFilter === VitalSignType.HEART_RATE ? <TableCell>{item.heartRate} lpm</TableCell> : null}
                    {vitalTypeFilter === VitalSignType.ALL || vitalTypeFilter === VitalSignType.SYSTOLIC_PRESSURE ? <TableCell>{item.systolicPressure} mmHg</TableCell> : null}
                    {vitalTypeFilter === VitalSignType.ALL || vitalTypeFilter === VitalSignType.OXYGEN_SATURATION ? <TableCell>{item.oxygenSaturation} %</TableCell> : null}
                    {vitalTypeFilter === VitalSignType.ALL || vitalTypeFilter === VitalSignType.TEMPERATURE ? <TableCell>{item.temperature} °C</TableCell> : null}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={
                    vitalTypeFilter === VitalSignType.ALL ? 5 : 2
                  } className="h-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Info className="h-8 w-8 mb-2" aria-hidden="true"/>
                      Este paciente aún no tiene signos vitales registrados.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
    </div>
  );
}
