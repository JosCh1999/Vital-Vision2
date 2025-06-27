// src/components/icons.tsx
import type { SVGProps } from 'react';
import { Eye, Activity } from 'lucide-react';

export const AppLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6"
    aria-label="VitalVision Logo"
    {...props}
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
    <path d="M7 12h2l2 5 2-10 2 5h2" />
  </svg>
);

// You can add more custom icons here if needed
// For example, a more specific Blood Pressure icon
export const BloodPressureIcon = (props: SVGProps<SVGSVGElement>) => (
  // Placeholder - Using Gauge from Lucide for now in components
  // This could be a custom path for a BP cuff
  <Activity {...props} />
);
