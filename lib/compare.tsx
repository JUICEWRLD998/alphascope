'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompareToken {
  address: string;
  symbol: string;
  name: string;
  logoURI?: string;
  price: number;
  overallScore: number;
  risk: number;
  opportunity: number;
  momentum: number;
  liquidity: number;
  security: number;
  verdict: string;
}

interface CompareContextValue {
  tokens: CompareToken[];
  add: (token: CompareToken) => void;
  remove: (address: string) => void;
  has: (address: string) => boolean;
  clear: () => void;
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CompareContext = createContext<CompareContextValue | null>(null);

const MAX_TOKENS = 3;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<CompareToken[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const add = useCallback((token: CompareToken) => {
    setTokens((prev) => {
      if (prev.some((t) => t.address === token.address)) return prev;
      if (prev.length >= MAX_TOKENS) return prev; // silently cap at 3
      return [...prev, token];
    });
  }, []);

  const remove = useCallback((address: string) => {
    setTokens((prev) => prev.filter((t) => t.address !== address));
  }, []);

  const has = useCallback(
    (address: string) => tokens.some((t) => t.address === address),
    [tokens],
  );

  const clear = useCallback(() => {
    setTokens([]);
    setIsOpen(false);
  }, []);

  return (
    <CompareContext.Provider
      value={{
        tokens,
        add,
        remove,
        has,
        clear,
        isOpen,
        openModal: () => setIsOpen(true),
        closeModal: () => setIsOpen(false),
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used inside CompareProvider');
  return ctx;
}
