'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell:
          'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',
        cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
        day: cn(
          'inline-flex items-center justify-center rounded-md text-sm font-normal ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
        ),
        day_range_end: 'day-range-end',
        day_selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        day_today: 'bg-accent text-accent-foreground',
        day_outside:
          'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
        day_disabled: 'text-muted-foreground opacity-50',
        day_range_middle:
          'aria-selected:bg-accent aria-selected:text-accent-foreground',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => (
          <svg
            width='15'
            height='15'
            viewBox='0 0 15 15'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
            {...props}
          >
            <path
              d='m8.84182 3.13514c0.04312 0 0.08439 0.01727 0.11516 0.04804c0.03077 0.03077 0.04804 0.07204 0.04804 0.11516v8.50166c0 0.04312-0.01727 0.08439-0.04804 0.11516c-0.03077 0.03077-0.07204 0.04804-0.11516 0.04804c-0.04312 0-0.08439-0.01727-0.11516-0.04804l-6.58645-4.25083c-0.02006-0.01301-0.03676-0.02906-0.04865-0.04693c-0.01188-0.01787-0.01833-0.03896-0.01833-0.06033s0.00645-0.04246 0.01833-0.06033c0.01189-0.01787 0.02859-0.03392 0.04865-0.04693l6.58645-4.25083c0.03077-0.03077 0.07204-0.04804 0.11516-0.04804Z'
              fill='currentColor'
              fillRule='evenodd'
              clipRule='evenodd'
            ></path>
          </svg>
        ),
        IconRight: ({ ...props }) => (
          <svg
            width='15'
            height='15'
            viewBox='0 0 15 15'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
            {...props}
          >
            <path
              d='m6.1584 3.13508c0.04312 0 0.08439 0.01727 0.11516 0.04804l6.58645 4.25083c0.02006 0.01301 0.03676 0.02906 0.04865 0.04693c0.01188 0.01787 0.01833 0.03896 0.01833 0.06033s-0.00645 0.04246-0.01833 0.06033c-0.01189 0.01787-0.02859 0.03392-0.04865 0.04693l-6.58645 4.25083c-0.03077 0.03077-0.07204 0.04804-0.11516 0.04804c-0.04312 0-0.08439-0.01727-0.11516-0.04804c-0.03077-0.03077-0.04804-0.07204-0.04804-0.11516v-8.50166c0-0.04312 0.01727-0.08439 0.04804-0.11516c0.03077-0.03077 0.07204-0.04804 0.11516-0.04804Z'
              fill='currentColor'
              fillRule='evenodd'
              clipRule='evenodd'
            ></path>
          </svg>
        ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
