
// src/app/(auth)/register/page.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { signUp, updateUserProfile } from '@/lib/firebaseService';
import { Spinner } from '@/components/ui/Spinner';
import type { UserProfileFormData } from '@/types';
import { Eye, EyeOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const registerSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Dirección de correo electrónico inválida." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  confirmPassword: z.string(),
  role: z.enum(['patient', 'caregiver'], { required_error: "Debe seleccionar un rol." }),
  age: z.preprocess(
    val => (val === "" || val === null || val === undefined ? undefined : String(val).trim() === "" ? undefined : Number(val)),
    z.coerce.number().int().positive("La edad debe ser un número entero positivo.").optional()
  ),
  sex: z.preprocess(
    val => (val === "" || val === null || val === undefined ? undefined : val),
    z.enum(['male', 'female', 'other', 'prefer_not_to_say'], { errorMap: () => ({ message: "Seleccione un sexo válido."})}).optional()
  ),
  medicalDiagnosis: z.string().optional(),
  currentMedications: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: undefined, // User must select a role
      age: undefined,
      sex: undefined,
      medicalDiagnosis: '',
      currentMedications: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      const { email, password, name, role, ...profileData } = data;
      // Pass name and role directly to signUp if your service supports it
      // Otherwise, signUp creates the user, then updateUserProfile adds the rest
      const userAuth = await signUp(email, password, name, role);
      
      // Prepare profile data excluding auth related fields already handled by signUp
      const userProfileDetails: Partial<UserProfileFormData> = { 
        name, // name is already part of UserProfileFormData
        role, // role is also part of UserProfileFormData
        age: profileData.age,
        sex: profileData.sex,
        medicalDiagnosis: profileData.medicalDiagnosis || undefined,
        currentMedications: profileData.currentMedications || undefined,
        emergencyContactName: profileData.emergencyContactName || undefined,
        emergencyContactPhone: profileData.emergencyContactPhone || undefined,
      };
      
      const cleanProfileData = Object.fromEntries(Object.entries(userProfileDetails).filter(([_, v]) => v !== undefined));

      // updateUserProfile might be redundant if signUp fully populates the profile
      // However, it's good for updating any additional fields not set at auth creation
      await updateUserProfile(userAuth.id, cleanProfileData);

      toast({
        title: "Registro Exitoso",
        description: "Su cuenta ha sido creada. Por favor, inicie sesión.",
      });
      router.push('/login');
    } catch (error: any) {
      toast({
        title: "Registro Fallido",
        description: error.message || "Ocurrió un error inesperado.",
        variant: "destructive",
      });
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CardHeader>
        <CardTitle className="text-2xl">Crea tu Cuenta</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="name">Nombre Completo</FormLabel>
                  <FormControl>
                    <Input id="name" placeholder="John Doe" {...field} value={field.value ?? ""} aria-describedby="name-error" />
                  </FormControl>
                  <FormMessage id="name-error" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="email">Dirección de Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input id="email" type="email" placeholder="tu@ejemplo.com" {...field} value={field.value ?? ""} aria-describedby="email-error" />
                  </FormControl>
                  <FormMessage id="email-error" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="password">Contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        {...field} 
                        value={field.value ?? ""}
                        aria-describedby="password-error" 
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage id="password-error" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="confirmPassword">Confirmar Contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        id="confirmPassword" 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        {...field} 
                        value={field.value ?? ""}
                        aria-describedby="confirmPassword-error"
                      />
                       <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Ocultar contraseña confirmada" : "Mostrar contraseña confirmada"}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage id="confirmPassword-error" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="role">Soy un</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Seleccionar rol..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="patient">Paciente</SelectItem>
                      <SelectItem value="caregiver">Cuidador</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="age">Edad (Opcional)</FormLabel>
                  <FormControl><Input id="age" type="number" placeholder="Ej: 30" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField control={form.control} name="sex" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo (Opcional)</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione sexo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Femenino</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefiero no decirlo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} 
            />
            <FormField control={form.control} name="medicalDiagnosis" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="medicalDiagnosis">Diagnóstico Médico (Opcional)</FormLabel>
                  <FormControl><Input id="medicalDiagnosis" placeholder="Ej: Hipertensión" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField control={form.control} name="currentMedications" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="currentMedications">Medicamentos Actuales (Opcional)</FormLabel>
                  <FormControl><Input id="currentMedications" placeholder="Ej: Lisinopril 10mg" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="emergencyContactName">Nombre de Contacto de Emergencia (Opcional)</FormLabel>
                  <FormControl><Input id="emergencyContactName" placeholder="Ej: Jane Doe" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="emergencyContactPhone">Teléfono de Contacto de Emergencia (Opcional)</FormLabel>
                  <FormControl><Input id="emergencyContactPhone" placeholder="Ej: 555-123-4567" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Crear Cuenta
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <p className="text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Inicia sesión aquí
          </Link>
        </p>
      </CardFooter>
    </>
  );
}
