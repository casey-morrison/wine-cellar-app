import React, { createContext, useContext } from 'react';
import { useCellar } from '@/hooks/useCellar';

type CellarContextValue = ReturnType<typeof useCellar>;

const CellarContext = createContext<CellarContextValue | null>(null);

export function CellarProvider({ children }: { children: React.ReactNode }) {
  const value = useCellar();
  return <CellarContext.Provider value={value}>{children}</CellarContext.Provider>;
}

export function useCellarContext(): CellarContextValue {
  const ctx = useContext(CellarContext);
  if (!ctx) throw new Error('useCellarContext must be used within CellarProvider');
  return ctx;
}
