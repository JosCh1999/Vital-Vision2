// src/app/(auth)/layout.tsx
import type { ReactNode } from 'react';
import { AppLogo } from '@/components/icons';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex flex-col items-center">
        <AppLogo className="h-16 w-16 text-primary" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
          VitalVision
        </h1>
        <p className="text-muted-foreground">Monitoreo Inteligente de Salud</p>
      </div>
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg sm:p-8">
        {children}
      </div>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} VitalVision. Todos los derechos reservados.
      </footer>
    </div>
  );
}
