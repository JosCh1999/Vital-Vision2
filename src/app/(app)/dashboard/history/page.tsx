// src/app/(app)/dashboard/history/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getVitalSignsHistory } from '@/lib/firebaseService';
import type { VitalSign, UserProfile } from '@/types'; // Added UserProfile
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-range';
import { Download, Filter, RotateCcw, Info, HeartPulse, Activity, Wind, Thermometer, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


const VitalSignType = {
  ALL: 'all',
  HEART_RATE: 'heartRate',
  SYSTOLIC_PRESSURE: 'systolicPressure',
  OXYGEN_SATURATION: 'oxygenSaturation',
  TEMPERATURE: 'temperature',
} as const;

type VitalSignKey = keyof typeof VitalSignType;


export default function HistoryPage() {
  const { currentUser } = useAuth() as { currentUser: UserProfile }; // Assert currentUser has role
  const [history, setHistory] = useState<VitalSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [vitalTypeFilter, setVitalTypeFilter] = useState<typeof VitalSignType[VitalSignKey]>(VitalSignType.ALL);
  
  const isCaregiver = currentUser?.role === 'caregiver';

  useEffect(() => {
    if (currentUser?.id && !isCaregiver) { // Only fetch history if user is a patient
      setLoading(true);
      setError(null);
      getVitalSignsHistory(currentUser.id, 100) 
        .then(data => {
          setHistory(data);
        })
        .catch(err => {
          console.error("Error fetching history:", err);
          setError("Error al cargar el historial de signos vitales.");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false); // Set loading to false if caregiver or no user ID
    }
  }, [currentUser?.id, isCaregiver]);

  const filteredHistory = useMemo(() => {
    if (isCaregiver) return []; // No history to filter for caregivers in this view
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
  }, [history, dateRange, isCaregiver]);

  const exportToCSV = () => {
    if (filteredHistory.length === 0 || isCaregiver) {
      alert("No hay datos para exportar en esta vista.");
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
      link.setAttribute("download", `vital_vision_historial_${format(new Date(), 'yyyyMMddHHmmss')}.csv`);
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

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historial de Signos Vitales</h1>
        {!isCaregiver && <p className="text-muted-foreground">Revise sus signos vitales registrados a lo largo del tiempo. Filtre por fecha o tipo.</p>}
      </div>

      {isCaregiver && (
         <Alert variant="default" className="border-blue-500 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30">
            <Users className="h-5 w-5 text-blue-700 dark:text-blue-300" />
            <AlertTitle className="text-blue-700 dark:text-blue-300 font-semibold">Vista de Cuidador</AlertTitle>
            <AlertDescription className="text-blue-600 dark:text-blue-400">
              Esta página actualmente muestra el historial de signos vitales personales.
              La funcionalidad para seleccionar y ver el historial de sus pacientes asignados estará disponible en futuras versiones.
            </AlertDescription>
        </Alert>
      )}

      {!isCaregiver && (
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
                <Select value={vitalTypeFilter} onValueChange={(value) => setVitalTypeFilter(value as typeof VitalSignType[VitalSignKey])}>
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
              {loading ? "Cargando historial de signos vitales. Por favor, espere." : 
              filteredHistory.length === 0 ? "No se encontraron signos vitales que coincidan con sus filtros. Puede ajustar los filtros o registrar nuevos signos vitales." :
              `Mostrando ${filteredHistory.length} registro(s) de signos vitales. La tabla es accesible para lectores de pantalla.`}
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
                      No se encontraron resultados. Intente ajustar sus filtros o{' '}
                      <Link href="/dashboard/vitals" className="text-primary hover:underline">registrar nuevos signos vitales</Link>.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
