// src/app/(app)/dashboard/settings/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Bell, Palette, ShieldQuestion, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react'; // Import useState

export default function SettingsPage() {
  const { currentUser, signOut } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: "Sesión Cerrada", description: "Ha cerrado sesión correctamente." });
      router.push('/login');
    } catch (error) {
      toast({ title: "Error al Cerrar Sesión", description: "No se pudo cerrar sesión. Por favor, inténtelo de nuevo.", variant: "destructive" });
    }
  };


  // Placeholder states for settings
  // In a real app, these would be fetched and updated via a service
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false); // This would typically control a theme toggle

  return (
    <div className="container mx-auto py-2 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Gestione las preferencias de su aplicación y la configuración de su cuenta.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preferencias de Notificación</CardTitle>
          <CardDescription>Controle cómo recibe alertas y actualizaciones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="notifications" className="text-base flex items-center">
                <Bell className="mr-2 h-5 w-5 text-primary" />
                Activar Notificaciones
              </Label>
              <p className="text-sm text-muted-foreground">
                Reciba alertas de salud importantes y recordatorios.
              </p>
            </div>
            <Switch
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
              aria-label="Activar/desactivar notificaciones"
            />
          </div>
          {/* Add more notification settings here, e.g., email, SMS, specific alert types */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>Personalice el aspecto de la aplicación.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode" className="text-base flex items-center">
                <Palette className="mr-2 h-5 w-5 text-primary" />
                Modo Oscuro
              </Label>
              <p className="text-sm text-muted-foreground">
                Reduzca la fatiga visual en entornos con poca luz. (Solo UI, aún no persiste)
              </p>
            </div>
            <Switch
              id="dark-mode"
              checked={darkModeEnabled}
              onCheckedChange={(checked) => {
                setDarkModeEnabled(checked);
                // This is a simplified example. Proper theme switching is more complex.
                if (checked) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              }}
              aria-label="Activar/desactivar modo oscuro"
            />
          </div>
          {/* Accessibility settings like font size could go here */}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Cuenta</CardTitle>
          <CardDescription>Gestione la configuración de su cuenta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <Button variant="outline" className="w-full md:w-auto" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
          </Button>
          <Button variant="destructive" className="w-full md:w-auto">
            <AlertTriangle className="mr-2 h-4 w-4" /> Eliminar Cuenta (No Implementado)
          </Button>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Soporte y Ayuda</CardTitle>
          <CardDescription>Obtenga ayuda o envíe comentarios.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="link" className="p-0 h-auto text-primary">
             <ShieldQuestion className="mr-2 h-4 w-4" /> Preguntas Frecuentes y Centro de Ayuda (No Implementado)
          </Button>
          <br />
          <Button variant="link" className="p-0 h-auto text-primary">
            Contactar Soporte (No Implementado)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
