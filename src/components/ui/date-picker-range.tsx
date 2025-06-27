// src/components/ui/date-picker-range.tsx
"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from 'date-fns/locale'; // Import Spanish locale
import type { DateRange } from "react-day-picker"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  id?: string;
  "aria-label"?: string;
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
  id,
  "aria-label": ariaLabel,
}: DatePickerWithRangeProps) {
  const defaultAriaLabel = "Seleccionar rango de fechas";
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id || "date-range-picker"}
            variant={"outline"}
            aria-label={ariaLabel || defaultAriaLabel}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                  {format(date.to, "LLL dd, y", { locale: es })}
                </>
              ) : (
                format(date.from, "LLL dd, y", { locale: es })
              )
            ) : (
              <span>Seleccione un rango</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            locale={es} // Pass locale to Calendar component
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
