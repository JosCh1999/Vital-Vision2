
// src/app/(app)/layout.tsx
"use client";

import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  BarChart3,
  UserCircle,
  LogOut,
  HeartPulse,
  ShieldAlert,
  Settings,
  BellRing,
  Menu,
  Users,
  CalendarDays,
  Pill,
  Sparkles,
} from 'lucide-react';
import { AppLogo } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/app/loading';
import { cn } from '@/lib/utils';

const baseNavItems = [
  { href: '/dashboard', label: 'Panel', icon: Home },
  { href: '/dashboard/history', label: 'Historial Personal', icon: BarChart3 },
  { href: '/dashboard/profile', label: 'Perfil', icon: UserCircle },
  { href: '/dashboard/schedule', label: 'Agenda', icon: CalendarDays },
];

const patientNavItems = [
  { href: '/dashboard/vitals', label: 'Signos Vitales', icon: HeartPulse },
  { href: '/dashboard/medications', label: 'Medicamentos', icon: Pill },
  { href: '/dashboard/risk-prediction', label: 'Predicción de Riesgos', icon: ShieldAlert },
  { href: '/dashboard/recommendations', label: 'Recomendaciones IA', icon: Sparkles },
  { href: '/dashboard/notifications', label: 'Alertas', icon: BellRing },
];

const caregiverNavItems = [
  { href: '/dashboard/patients', label: 'Pacientes', icon: Users },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, loading, router]);

  const isCaregiver = currentUser?.role === 'caregiver';

  const navItemsToDisplay = useMemo(() => {
    let items = [...baseNavItems];
    if (isCaregiver) {
      items.splice(1, 0, ...caregiverNavItems);
    } else {
      // It's a patient
      const patientSpecificItems = patientNavItems.map(item => ({...item}));
      const personalHistoryItem = items.find(item => item.href === '/dashboard/history');
      if (personalHistoryItem) {
          personalHistoryItem.label = 'Historial'; // Change label for patients
      }
      items.splice(1, 0, ...patientSpecificItems);
    }
    return items;
  }, [isCaregiver]);

  if (loading) {
    return <Loading />;
  }

  if (!currentUser) {
    return <Loading />; 
  }
  
  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      const names = name.split(' ');
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };
  

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
              <AppLogo className="h-8 w-8" />
              <span className="">VitalVision</span>
            </Link>
          </div>
          <nav className="flex-1 overflow-auto py-4">
            <ul className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navItemsToDisplay.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                      pathname === item.href && "bg-primary/10 text-primary font-semibold"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto p-4 border-t">
            <Link
              href="/dashboard/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                pathname === "/dashboard/settings" && "bg-primary/10 text-primary font-semibold"
              )}
            >
              <Settings className="h-4 w-4" />
              Configuración
            </Link>
          </div>
        </div>
      </aside>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
                aria-label="Abrir/cerrar menú de navegación"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
                  <AppLogo className="h-8 w-8" />
                  <span className="">VitalVision</span>
                </Link>
              </div>
              <nav className="grid gap-2 p-4 text-lg font-medium">
                {navItemsToDisplay.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                       pathname === item.href && "bg-muted text-foreground font-semibold"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
                 <Link
                    href="/dashboard/settings"
                    className={cn(
                      "flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                      pathname === "/dashboard/settings" && "bg-muted text-foreground font-semibold"
                    )}
                  >
                    <Settings className="h-5 w-5" />
                    Configuración
                  </Link>
              </nav>
            </SheetContent>
          </Sheet>
          
          <div className="w-full flex-1">
            {/* Optional: Search bar or other header elements */}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.name || currentUser.email || "Usuario"} />
                  <AvatarFallback>{getInitials(currentUser.name, currentUser.email)}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Abrir/cerrar menú de usuario</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{currentUser.name || currentUser.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">Perfil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                 <Link href="/dashboard/settings">Configuración</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
