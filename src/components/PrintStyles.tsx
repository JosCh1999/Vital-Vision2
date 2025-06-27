"use client"

import React from 'react';

// This component encapsulates the print-specific global styles.
// By marking it with "use client", we can use styled-jsx which is a client-side feature.
export function PrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        body * {
          visibility: hidden;
        }
        .printable-area, .printable-area * {
          visibility: visible;
        }
        .printable-area {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .no-print {
          display: none;
        }
      }
    `}</style>
  )
}
