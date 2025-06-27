
// src/app/(app)/dashboard/profile/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, getUserProfile, predictInitialProfileRisk } from '@/lib/firebaseService';
import type { UserProfileFormData, PredictInitialProfileRiskOutput } from '@/types';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCircle2, Save, Edit3, ShieldQuestion, BarChart } from 'lucide-react';
import { VoiceInputButton } from '@/components/ui/voice-input-button'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const profileSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Dirección de correo electrónico inválida." }).optional(),
  age: z.preprocess(
    val => (val === "" || val === null || val === undefined ? undefined : String(val).trim() === "" ? undefined : Number(val)),
    z.coerce.number().int().positive("La edad debe ser un número entero positivo.").optional()
  ),
  sex: z.preprocess(
    val => (val === "" || val === null || val === undefined ? undefined : val === "NONE" ? undefined : val),
    z.enum(['male', 'female', 'other', 'prefer_not_to_say'], { errorMap: () => ({ message: "Seleccione un sexo válido."})}).optional()
  ),
  medicalDiagnosis: z.string().optional(),
  currentMedications: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loadingData, setLoadingData] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initialProfileRisk, setInitialProfileRisk] = useState<PredictInitialProfileRiskOutput | null>(null);
  const [loadingProfileRisk, setLoadingProfileRisk] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      age: undefined, 
      sex: undefined, 
      medicalDiagnosis: '',
      currentMedications: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
    },
  });

  useEffect(() => {
    if (currentUser?.id) {
      setLoadingData(true);
      setLoadingProfileRisk(true);
      getUserProfile(currentUser.id)
        .then(profile => {
          if (profile) {
            form.reset({
              name: profile.name || '',
              email: currentUser.email || '',
              age: profile.age !== undefined ? profile.age : undefined,
              sex: profile.sex || undefined,
              medicalDiagnosis: profile.medicalDiagnosis || '',
              currentMedications: profile.currentMedications || '',
              emergencyContactName: profile.emergencyContactName || '',
              emergencyContactPhone: profile.emergencyContactPhone || '',
            });
          } else {
             form.reset({
              name: currentUser.name || '',
              email: currentUser.email || '',
              age: undefined,
              sex: undefined,
              medicalDiagnosis: '',
              currentMedications: '',
              emergencyContactName: '',
              emergencyContactPhone: '',
            });
          }
          // Fetch initial profile risk after profile data is loaded
          predictInitialProfileRisk(currentUser.id)
            .then(riskResult => setInitialProfileRisk(riskResult))
            .catch(err => {
              console.error("Error fetching initial profile risk:", err);
              toast({ title: "Error", description: "No se pudo cargar la evaluación de riesgo del perfil.", variant: "destructive" });
            })
            .finally(() => setLoadingProfileRisk(false));
        })
        .catch(err => {
          console.error("Error fetching profile:", err);
          toast({ title: "Error", description: "No se pudieron cargar los datos del perfil.", variant: "destructive" });
        })
        .finally(() => setLoadingData(false));
    } else if (!authLoading) { 
      setLoadingData(false); 
      setLoadingProfileRisk(false);
      form.reset({
        name: '',
        email: '',
        age: undefined,
        sex: undefined,
        medicalDiagnosis: '',
        currentMedications: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
      });
    }
  }, [currentUser, form, toast, authLoading]);


  const onSubmit = async (data: ProfileFormValues) => {
    if (!currentUser?.id) {
      toast({ title: "Error", description: "Usuario no encontrado.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    
    const updateData: Partial<UserProfileFormData> = {
      name: data.name,
      age: data.age,
      sex: data.sex,
      medicalDiagnosis: data.medicalDiagnosis || undefined,
      currentMedications: data.currentMedications || undefined,
      emergencyContactName: data.emergencyContactName || undefined,
      emergencyContactPhone: data.emergencyContactPhone || undefined,
    };
    
    const cleanUpdateData = Object.fromEntries(Object.entries(updateData).filter(([_, v]) => v !== undefined));

    try {
      await updateUserProfile(currentUser.id, cleanUpdateData);
      toast({
        title: "Perfil Actualizado",
        description: "Su información de perfil ha sido guardada.",
      });
      setIsEditing(false); 
      // Re-fetch initial profile risk after profile update
      setLoadingProfileRisk(true);
      predictInitialProfileRisk(currentUser.id)
        .then(riskResult => setInitialProfileRisk(riskResult))
        .catch(err => {
          console.error("Error fetching initial profile risk after update:", err);
        })
        .finally(() => setLoadingProfileRisk(false));
    } catch (error: any) {
      toast({
        title: "Actualización Fallida",
        description: error.message || "No se pudo guardar el perfil.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoiceTranscript = (fieldName: keyof ProfileFormValues, transcript: string) => {
    form.setValue(fieldName, transcript, { shouldValidate: true });
    toast({
      title: "Campo Actualizado por Voz",
      description: `Campo '${fieldName}' actualizado.`,
    });
  };
  
  const getRiskColor = (riskLevel: string | undefined) => {
    if (!riskLevel) return 'bg-muted text-muted-foreground';
    switch (riskLevel.toLowerCase()) {
      case 'alto': return 'bg-destructive text-destructive-foreground';
      case 'medio': return 'bg-orange-500 text-white'; // Using a specific orange for medium
      case 'bajo': return 'bg-green-500 text-white'; // Using a specific green for low
      default: return 'bg-muted text-muted-foreground';
    }
  };


  if (authLoading || loadingData) {
    return (
      <div className="container mx-auto py-2 space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-6 w-3/4 mb-6" />
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
          <CardContent className="space-y-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
          <CardFooter><Skeleton className="h-10 w-24" /></CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center"><UserCircle2 className="mr-3 h-8 w-8 text-primary"/> Su Perfil</h1>
          <p className="text-muted-foreground">Vea y gestione su información personal y médica. Puede usar el micrófono para dictar en los campos de texto.</p>
        </div>
        <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? "secondary" : "default"}>
          {isEditing ? 'Cancelar Edición' : <><Edit3 className="mr-2 h-4 w-4" /> Editar Perfil</>}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evaluación de Riesgo Basada en Perfil</CardTitle>
          <CardDescription>Nivel de riesgo inicial calculado según su información de perfil (edad, diagnósticos, etc.).</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingProfileRisk ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : initialProfileRisk ? (
            <Alert className={`border-0 ${getRiskColor(initialProfileRisk.riskLevel)}`}>
              <BarChart className="h-5 w-5" /> {/* Using BarChart as a placeholder for risk level icon */}
              <AlertTitle className="font-semibold text-lg">
                Nivel de Riesgo: {initialProfileRisk.riskLevel}
              </AlertTitle>
              <AlertDescription>
                {initialProfileRisk.justification}
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-muted-foreground">No se pudo cargar la evaluación de riesgo del perfil.</p>
          )}
        </CardContent>
      </Card>


      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="name">Nombre Completo</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl><Input id="name" {...field} value={field.value ?? ""} readOnly={!isEditing} className={!isEditing ? "bg-muted/50" : ""}/></FormControl>
                    {isEditing && <VoiceInputButton onTranscript={(text) => handleVoiceTranscript('name', text)} targetInputName="Nombre Completo" aria-label="Dictar nombre completo"/>}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormItem>
                <FormLabel htmlFor="email">Dirección de Correo Electrónico</FormLabel>
                 <Input id="email" type="email" value={currentUser?.email || ''} readOnly className="bg-muted/50" aria-label="Correo electrónico (solo lectura)"/>
                 <FormDescription>El correo electrónico no se puede cambiar aquí.</FormDescription>
              </FormItem>
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="age">Edad</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl><Input id="age" type="number" {...field} value={field.value ?? ""} readOnly={!isEditing} className={!isEditing ? "bg-muted/50" : ""}/></FormControl>
                    {isEditing && <VoiceInputButton onTranscript={(text) => handleVoiceTranscript('age', text)} targetInputName="Edad" aria-label="Dictar edad"/>}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="sex" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="sex">Sexo</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || "NONE"} 
                    disabled={!isEditing}
                  >
                    <FormControl>
                      <SelectTrigger id="sex" className={!isEditing ? "bg-muted/50" : ""}>
                        <SelectValue placeholder="Seleccione sexo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NONE" disabled style={{ display: 'none' }}>Seleccione sexo</SelectItem>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Femenino</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefiero no decirlo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>

            <CardHeader>
              <CardTitle>Información Médica</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="medicalDiagnosis" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel htmlFor="medicalDiagnosis">Diagnóstico Médico</FormLabel>
                  <div className="flex items-start gap-2">
                    <FormControl><Textarea id="medicalDiagnosis" placeholder="Ej: Hipertensión, Diabetes Tipo 2" {...field} value={field.value ?? ""} readOnly={!isEditing} className={!isEditing ? "bg-muted/50" : ""}/></FormControl>
                    {isEditing && <VoiceInputButton onTranscript={(text) => handleVoiceTranscript('medicalDiagnosis', text)} targetInputName="Diagnóstico Médico" aria-label="Dictar diagnóstico médico" className="mt-1"/>}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="currentMedications" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel htmlFor="currentMedications">Medicamentos Actuales</FormLabel>
                  <div className="flex items-start gap-2">
                  <FormControl><Textarea id="currentMedications" placeholder="Ej: Lisinopril 10mg, Metformina 500mg" {...field} value={field.value ?? ""} readOnly={!isEditing} className={!isEditing ? "bg-muted/50" : ""}/></FormControl>
                  {isEditing && <VoiceInputButton onTranscript={(text) => handleVoiceTranscript('currentMedications', text)} targetInputName="Medicamentos Actuales" aria-label="Dictar medicamentos actuales" className="mt-1"/>}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>

            <CardHeader>
              <CardTitle>Contacto de Emergencia</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="emergencyContactName">Nombre del Contacto</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl><Input id="emergencyContactName" placeholder="Ej: Jane Doe" {...field} value={field.value ?? ""} readOnly={!isEditing} className={!isEditing ? "bg-muted/50" : ""}/></FormControl>
                    {isEditing && <VoiceInputButton onTranscript={(text) => handleVoiceTranscript('emergencyContactName', text)} targetInputName="Nombre del Contacto de Emergencia" aria-label="Dictar nombre de contacto de emergencia"/>}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="emergencyContactPhone">Teléfono del Contacto</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl><Input id="emergencyContactPhone" type="tel" placeholder="Ej: 555-123-4567" {...field} value={field.value ?? ""} readOnly={!isEditing} className={!isEditing ? "bg-muted/50" : ""}/></FormControl>
                    {isEditing && <VoiceInputButton onTranscript={(text) => handleVoiceTranscript('emergencyContactPhone', text)} targetInputName="Teléfono del Contacto de Emergencia" aria-label="Dictar teléfono de contacto de emergencia"/>}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
            
            {isEditing && (
              <CardFooter>
                <Button type="submit" disabled={submitting || !form.formState.isDirty}>
                  {submitting ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Cambios
                </Button>
              </CardFooter>
            )}
          </form>
        </Form>
      </Card>
    </div>
  );
}
