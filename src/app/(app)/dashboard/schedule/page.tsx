// src/app/(app)/dashboard/schedule/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { addAppointment, getAppointments } from '@/lib/firebaseService';
import type { Appointment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Clock, PlusCircle, User, Mic, List, Info, Bell, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { VoiceInputButton } from '@/components/ui/voice-input-button';

const appointmentSchema = z.object({
  date: z.date({
    required_error: "La fecha es obligatoria.",
  }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Formato de hora inválido. Use HH:MM.",
  }),
  type: z.string().min(3, { message: "El tipo de terapia debe tener al menos 3 caracteres." }),
  professionalName: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

export default function SchedulePage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifiedAppointments, setNotifiedAppointments] = useState<Set<string>>(new Set());

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      date: undefined,
      time: "",
      type: "",
      professionalName: "",
    },
  });

  const fetchAppointments = async () => {
    if (currentUser?.id) {
      setLoading(true);
      setError(null);
      try {
        const data = await getAppointments(currentUser.id);
        const sortedData = data.sort((a, b) => {
            if (a.date !== b.date) {
                return a.date - b.date;
            }
            return a.time.localeCompare(b.time);
        });
        setAppointments(sortedData);
      } catch (err) {
        console.error("Error fetching appointments:", err);
        setError("Error al cargar las citas.");
        toast({ title: "Error", description: "No se pudieron cargar las citas.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
  };
  
  useEffect(() => {
    if(currentUser?.id) {
      fetchAppointments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    if (appointments.length > 0) {
      const now = new Date();
      appointments.forEach(app => {
        if (notifiedAppointments.has(app.id)) {
          return;
        }

        const [hours, minutes] = app.time.split(':').map(Number);
        const appDateTime = new Date(app.date);
        appDateTime.setHours(hours, minutes, 0, 0);

        const diffMinutes = (appDateTime.getTime() - now.getTime()) / (1000 * 60);

        if (diffMinutes > 0 && diffMinutes <= 60) {
          const timeString = format(appDateTime, 'p', { locale: es });
          const message = `Recordatorio: Tiene una cita de ${app.type} a las ${timeString}.`;

          toast({
            title: "Recordatorio de Cita Próxima",
            description: message,
            duration: 15000,
            action: <Bell className="h-6 w-6 text-primary" />,
          });

          if ('speechSynthesis' in window) {
            try {
              const utterance = new SpeechSynthesisUtterance(message);
              utterance.lang = 'es-ES';
              window.speechSynthesis.speak(utterance);
            } catch (speechError) {
              console.error("Error en la síntesis de voz:", speechError);
            }
          }
          
          setNotifiedAppointments(prev => new Set(prev).add(app.id));
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, toast]);


  const onSubmit = async (data: AppointmentFormValues) => {
    if (!currentUser?.id) {
      toast({ title: "Error", description: "Usuario no encontrado.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Combine date and time correctly into a single timestamp for storage
      const appointmentDate = new Date(data.date);
      const [hours, minutes] = data.time.split(':').map(Number);
      appointmentDate.setHours(hours, minutes, 0, 0);

      const formData = {
        date: appointmentDate.getTime(),
        time: data.time,
        type: data.type,
        professionalName: data.professionalName || "",
      };

      await addAppointment(currentUser.id, formData);
      toast({
        title: "Cita Agregada",
        description: "Su nueva cita ha sido programada con éxito.",
      });
      form.reset({date: undefined, time: "", type: "", professionalName: ""});
      fetchAppointments(); // Refresh the list
    } catch (error: any) {
      toast({
        title: "Error al Guardar",
        description: error.message || "No se pudo guardar la cita.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoiceTranscript = (fieldName: keyof AppointmentFormValues, transcript: string) => {
    form.setValue(fieldName, transcript, { shouldValidate: true });
    toast({
      title: "Campo Actualizado por Voz",
      description: `Campo actualizado: ${transcript}`,
    });
  };

  const groupAppointmentsByDay = (appointments: Appointment[]) => {
    return appointments.reduce((acc, appointment) => {
      const dateKey = format(new Date(appointment.date), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(appointment);
      return acc;
    }, {} as Record<string, Appointment[]>);
  };

  const groupedAppointments = groupAppointmentsByDay(appointments);
  const sortedDateKeys = Object.keys(groupedAppointments).sort();


  return (
    <div className="container mx-auto py-2 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agenda de Terapias y Consultas</h1>
        <p className="text-muted-foreground">Programe sus citas y reciba recordatorios verbales y visuales.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><PlusCircle className="mr-2 h-5 w-5 text-primary" /> Agregar Nueva Cita</CardTitle>
          <CardDescription>Use el formulario para añadir una nueva terapia o consulta a su agenda. Puede usar el micrófono para dictar los campos de texto.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? (format(field.value, "PPP", { locale: es })) : (<span>Seleccione una fecha</span>)}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1)) } initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="time" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora (formato 24h)</FormLabel>
                    <FormControl><Input type="time" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Terapia/Consulta</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl><Input placeholder="Ej: Fisioterapia, Consulta Psicológica" {...field} value={field.value ?? ""} /></FormControl>
                    <VoiceInputButton onTranscript={(text) => handleVoiceTranscript('type', text)} targetInputName="Tipo de Terapia" aria-label="Dictar tipo de terapia"/>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="professionalName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Profesional (Opcional)</FormLabel>
                   <div className="flex items-center gap-2">
                    <FormControl><Input placeholder="Ej: Dr. A. Pérez" {...field} value={field.value ?? ""} /></FormControl>
                     <VoiceInputButton onTranscript={(text) => handleVoiceTranscript('professionalName', text)} targetInputName="Nombre del Profesional" aria-label="Dictar nombre del profesional"/>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              
              <Button type="submit" disabled={submitting}>
                {submitting ? <Spinner className="mr-2" /> : <PlusCircle className="mr-2" />}
                Guardar Cita
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><List className="mr-2 h-5 w-5 text-primary" /> Próximas Citas</CardTitle>
           <CardDescription>Aquí se muestran sus citas programadas desde hoy en adelante.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="space-y-4">
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
             <p className="text-destructive flex items-center"><AlertTriangle className="mr-2 h-4 w-4"/> {error}</p>
          ) : sortedDateKeys.length > 0 ? (
            <div className="space-y-6">
              {sortedDateKeys.map(dateKey => (
                <div key={dateKey}>
                  <h3 className="text-lg font-semibold mb-2 border-b pb-1">
                    {format(parse(dateKey, 'yyyy-MM-dd', new Date()), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
                  </h3>
                  <ul className="space-y-3">
                    {groupedAppointments[dateKey].map(app => (
                       <li key={app.id} className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                         <div className="flex-shrink-0 pt-1">
                          <Clock className="h-5 w-5 text-primary" />
                         </div>
                         <div>
                            <p className="font-semibold text-base">{app.time} - {app.type}</p>
                            {app.professionalName && (
                              <p className="text-sm text-muted-foreground flex items-center">
                                <User className="mr-2 h-4 w-4" />
                                {app.professionalName}
                              </p>
                            )}
                         </div>
                       </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Info className="mx-auto h-10 w-10 mb-4" />
              <p>No tiene citas programadas.</p>
              <p>Use el formulario de arriba para agregar su primera cita.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
