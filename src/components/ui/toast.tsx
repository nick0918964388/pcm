'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  onClose?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function Toast({
  title,
  description,
  variant = 'default',
  onClose,
  className,
  children,
  ...props
}: ToastProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 w-full max-w-sm p-4 border rounded-lg shadow-lg bg-white',
        {
          'border-gray-200 text-gray-900': variant === 'default',
          'border-red-200 bg-red-50 text-red-900': variant === 'destructive',
          'border-orange-200 bg-orange-50 text-orange-900':
            variant === 'warning',
          'border-green-200 bg-green-50 text-green-900': variant === 'success',
        },
        className
      )}
      {...props}
    >
      <div className='flex items-start space-x-3'>
        <div className='flex-1'>
          {title && <div className='font-semibold mb-1'>{title}</div>}
          {description && (
            <div className='text-sm opacity-90'>{description}</div>
          )}
          {children}
        </div>
        <button
          onClick={handleClose}
          className='flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
    </div>
  );
}

interface ToastContextValue {
  showToast: (props: Omit<ToastProps, 'onClose'>) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(
  undefined
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<(ToastProps & { id: string })[]>(
    []
  );

  const showToast = React.useCallback((props: Omit<ToastProps, 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast = {
      ...props,
      id,
      onClose: () => {
        setToasts(prev => prev.filter(t => t.id !== id));
      },
    };
    setToasts(prev => [...prev, toast]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} />
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
