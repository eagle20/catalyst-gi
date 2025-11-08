'use client';

import { clsx } from 'clsx';
import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  targetDate: Date | string;
  className?: string;
  expiredMessage?: string;
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(targetDate: Date): TimeLeft | null {
  const difference = targetDate.getTime() - new Date().getTime();

  if (difference <= 0) {
    return null;
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

export function CountdownTimer({
  targetDate,
  className,
  expiredMessage = 'Sale Ended',
  showLabels = true,
  size = 'medium',
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
    setTimeLeft(calculateTimeLeft(target));

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(target));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  const sizeClasses = {
    small: {
      container: 'gap-2 text-sm',
      digit: 'min-w-[40px] p-2',
      label: 'text-xs',
    },
    medium: {
      container: 'gap-3 text-lg',
      digit: 'min-w-[60px] p-3',
      label: 'text-sm',
    },
    large: {
      container: 'gap-4 text-2xl',
      digit: 'min-w-[80px] p-4',
      label: 'text-base',
    },
  };

  if (!timeLeft) {
    return (
      <div
        className={clsx(
          'font-heading text-center font-semibold text-foreground',
          sizeClasses[size].container,
          className,
        )}
      >
        {expiredMessage}
      </div>
    );
  }

  const timeUnits = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hours' },
    { value: timeLeft.minutes, label: 'Minutes' },
    { value: timeLeft.seconds, label: 'Seconds' },
  ];

  return (
    <div className={clsx('flex items-center justify-center', sizeClasses[size].container, className)}>
      {timeUnits.map((unit, index) => (
        <div key={unit.label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={clsx(
                'flex items-center justify-center rounded-lg bg-foreground font-heading font-bold tabular-nums text-background',
                sizeClasses[size].digit,
              )}
            >
              {String(unit.value).padStart(2, '0')}
            </div>
            {showLabels && (
              <span
                className={clsx(
                  'mt-1 font-sans font-medium text-foreground/70',
                  sizeClasses[size].label,
                )}
              >
                {unit.label}
              </span>
            )}
          </div>
          {index < timeUnits.length - 1 && (
            <span className="mx-1 font-heading font-bold text-foreground">:</span>
          )}
        </div>
      ))}
    </div>
  );
}
