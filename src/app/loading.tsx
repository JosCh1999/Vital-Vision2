// src/app/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-12 w-12 animate-pulse text-primary"
          aria-label="VitalVision Logo"
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
          <path d="M7 12h2l2 5 2-10 2 5h2" />
        </svg>
        <Skeleton className="h-4 w-32 rounded-md" />
        <p className="text-sm text-muted-foreground">Cargando VitalVision...</p>
      </div>
    </div>
  );
}
