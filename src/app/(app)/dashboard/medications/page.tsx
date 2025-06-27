// src/app/(app)/dashboard/medications/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { addMedication, getMedications, deleteMedication, logMedicationTaken, getMedicationLog } from '@/lib/firebaseService';
import type { Medication, MedicationFormData, MedicationLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Pill, PlusCircle, Trash2, List, Info, AlertTriangle, Clock, Check, BellRing } from 'lucide-react';
import { VoiceInputButton } from '@/components/ui/voice-input-button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const medicationSchema = z.object({
  name: z.string().min(2, "El nombre del medicamento es obligatorio."),
  dose: z.string().min(1, "La dosis es obligatoria."),
  frequency: z.enum(['daily', 'twice_daily', 'three_times_daily']),
  times: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)).min(1, "Debe especificar al menos un horario."),
});

type MedicationFormValues = z.infer<typeof medicationSchema>;

export default function MedicationsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationLog, setMedicationLog] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remindedToday, setRemindedToday] = useState<Set<string>>(new Set());

  const form = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      name: "",
      dose: "",
      frequency: "daily",
      times: [""],
    },
  });

  const frequency = form.watch('frequency');

  const numberOfTimes = useMemo(() => {
    switch (frequency) {
      case 'twice_daily': return 2;
      case 'three_times_daily': return 3;
      default: return 1;
    }
  }, [frequency]);

  useEffect(() => {
    form.setValue('times', Array(numberOfTimes).fill(""));
  }, [numberOfTimes, form]);

  const fetchData = async () => {
    if (currentUser?.id) {
      setLoading(true);
      setError(null);
      try {
        const [meds, log] = await Promise.all([
          getMedications(currentUser.id),
          getMedicationLog(currentUser.id, 20)
        ]);
        setMedications(meds);
        setMedicationLog(log);
      } catch (err) {
        console.error("Error fetching medication data:", err);
        setError("Error al cargar los datos de medicamentos.");
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const triggerReminder = (med: Medication, time: string) => {
    const reminderMessage = `Recordatorio: Es hora de tomar su medicamento ${med.name}, dosis: ${med.dose}.`;
    
    toast({
      duration: 30000, // 30 seconds
      title: "Recordatorio de Medicamento",
      description: reminderMessage,
      action: (
        <Button onClick={() => handleConfirmTake(med.id, med.name)}>
          <Check className="mr-2 h-4 w-4" /> Confirmar Toma
        </Button>
      ),
    });

    if ('speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(reminderMessage);
        utterance.lang = 'es-ES';
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error("Error en la síntesis de voz:", e);
      }
    }

    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };
  
  const handleConfirmTake = async (medicationId: string, medicationName: string) => {
      if (!currentUser?.id) return;
      try {
        await logMedicationTaken(currentUser.id, medicationId, medicationName);
        toast({ title: "Toma Registrada", description: `Se ha registrado la toma de ${medicationName}.` });
        fetchData(); // Refresh log
      } catch (e) {
          toast({ title: "Error", description: "No se pudo registrar la toma.", variant: "destructive" });
      }
  };

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      medications.forEach(med => {
        med.times.forEach(timeStr => {
          const [hour, minute] = timeStr.split(':').map(Number);
          const reminderKey = `${med.id}-${timeStr}`;

          if (hour === currentHour && minute === currentMinute && !remindedToday.has(reminderKey)) {
            triggerReminder(med, timeStr);
            setRemindedToday(prev => new Set(prev).add(reminderKey));
          }
        });
      });
    };

    const intervalId = setInterval(checkReminders, 60000); // Check every minute
    
    // This is a simple implementation. For a production app, a more robust scheduler or web worker would be better.
    // Reset daily reminders at midnight
    const resetDaily = () => {
        const now = new Date();
        if(now.getHours() === 0 && now.getMinutes() === 0) {
            setRemindedToday(new Set());
        }
    }
    const dailyIntervalId = setInterval(resetDaily, 60000);

    return () => {
      clearInterval(intervalId);
      clearInterval(dailyIntervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medications, remindedToday]);


  const onSubmit = async (data: MedicationFormValues) => {
    if (!currentUser?.id) return;
    setSubmitting(true);
    try {
      await addMedication(currentUser.id, data);
      toast({ title: "Medicamento Agregado", description: `${data.name} ha sido añadido a su lista.` });
      form.reset();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleDelete = async (medicationId: string) => {
      if (!currentUser?.id) return;
      if(confirm("¿Está seguro de que desea eliminar este medicamento?")) {
          try {
              await deleteMedication(currentUser.id, medicationId);
              toast({ title: "Medicamento Eliminado", description: "El medicamento ha sido eliminado." });
              fetchData();
          } catch(e: any) {
              toast({ title: "Error", description: e.message, variant: "destructive" });
          }
      }
  }
  
  const handleVoiceTranscript = (fieldName: keyof MedicationFormValues, transcript: string) => {
    form.setValue(fieldName, transcript, { shouldValidate: true });
  };


  return (
    <div className="container mx-auto py-2 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center"><Pill className="mr-3 h-8 w-8 text-primary"/> Gestión de Medicamentos</h1>
        <p className="text-muted-foreground">Registre sus medicamentos y reciba recordatorios sonoros y visuales.</p>
      </div>
      
      <Alert variant="default" className="bg-blue-50 border-blue-200">
        <BellRing className="h-5 w-5 text-blue-700"/>
        <AlertTitle className="text-blue-800">Sistema de Recordatorios Activo</AlertTitle>
        <AlertDescription className="text-blue-700">
          Mientras esta página esté abierta, el sistema le recordará cuándo tomar sus medicamentos con una alerta sonora y visual.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><PlusCircle className="mr-2 h-5 w-5 text-primary"/> Agregar Nuevo Medicamento</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Medicamento</FormLabel>
                       <div className="flex items-center gap-2">
                          <FormControl><Input placeholder="Ej: Paracetamol" {...field} /></FormControl>
                          <VoiceInputButton onTranscript={(text) => handleVoiceTranscript('name', text)} targetInputName="Nombre del Medicamento" aria-label="Dictar nombre del medicamento"/>
                       </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dose" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dosis</FormLabel>
                       <div className="flex items-center gap-2">
                          <FormControl><Input placeholder="Ej: 500 mg" {...field} /></FormControl>
                          <VoiceInputButton onTranscript={(text) => handleVoiceTranscript('dose', text)} targetInputName="Dosis" aria-label="Dictar dosis"/>
                       </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="frequency" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frecuencia</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Seleccione frecuencia..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Una vez al día</SelectItem>
                          <SelectItem value="twice_daily">Dos veces al día</SelectItem>
                          <SelectItem value="three_times_daily">Tres veces al día</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {Array.from({ length: numberOfTimes }).map((_, index) => (
                    <FormField key={index} control={form.control} name={`times.${index}` as const} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de Toma {numberOfTimes > 1 ? index + 1 : ''}</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    )} />
                  ))}
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Spinner className="mr-2" /> : <PlusCircle className="mr-2" />}
                    Guardar Medicamento
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><List className="mr-2 h-5 w-5 text-primary" /> Mis Medicamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-24 w-full" /> : 
               error ? <p className="text-destructive flex items-center"><AlertTriangle className="mr-2 h-4 w-4"/> {error}</p> :
               medications.length > 0 ? (
                <ul className="space-y-4">
                  {medications.map(med => (
                    <li key={med.id} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-semibold text-base">{med.name}</p>
                        <p className="text-sm text-muted-foreground">Dosis: {med.dose}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3"/> Horarios: {med.times.join(', ')}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(med.id)} aria-label={`Eliminar ${med.name}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
               ) : (
                <div className="text-center text-muted-foreground py-4">
                  <Info className="mx-auto h-8 w-8 mb-2" />
                  <p>No tiene medicamentos registrados.</p>
                </div>
               )}
            </CardContent>
          </Card>
        </div>

        <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><List className="mr-2 h-5 w-5 text-primary" /> Historial de Tomas Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-48 w-full" /> : 
               medicationLog.length > 0 ? (
                <ul className="space-y-3">
                  {medicationLog.map(log => (
                    <li key={log.id} className="flex items-center gap-3 text-sm">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{log.medicationName}</span>
                        <span className="text-muted-foreground"> - Tomado el </span> 
                        <span className="text-muted-foreground">{format(new Date(log.takenAt), 'PPpp', { locale: es })}</span>
                      </div>
                    </li>
                  ))}
                </ul>
               ) : (
                <div className="text-center text-muted-foreground py-4">
                  <Info className="mx-auto h-8 w-8 mb-2" />
                  <p>No hay registros de tomas recientes.</p>
                </div>
               )}
            </CardContent>
          </Card>

      </div>
    </div>
  );
}
