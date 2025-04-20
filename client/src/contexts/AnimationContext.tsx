import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AnimationContextType {
  currentAnimation: string | null;
  currentExpression: Record<string, number> | null;
  setAnimation: (animation: string | null) => void;
  setExpression: (expression: Record<string, number> | null) => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export function AnimationProvider({ children }: { children: ReactNode }) {
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const [currentExpression, setCurrentExpression] = useState<Record<string, number> | null>(null);

  const value = {
    currentAnimation,
    currentExpression,
    setAnimation: setCurrentAnimation,
    setExpression: setCurrentExpression,
  };

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
}

export function useAnimation() {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
}
