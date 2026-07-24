import React, { createContext, useContext, useState, useCallback } from 'react';

export interface SignupData {
  name: string;
  // Required — the backend requires `phone` at registration. Captured at
  // Step 4 along with location, kept here for the final POST.
  phone: string;
  email: string;
  password: string;
  lat?: number;
  lng?: number;
  city?: string;
  state?: string;
  address?: string;
  pincode?: string;
}

interface SignupContextValue {
  data: SignupData;
  update: (patch: Partial<SignupData>) => void;
  reset: () => void;
}

const initial: SignupData = {
  name: '',
  phone: '',
  email: '',
  password: '',
};

const SignupContext = createContext<SignupContextValue | null>(null);

export const SignupProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<SignupData>(initial);

  const update = useCallback((patch: Partial<SignupData>) => {
    setData(prev => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setData(initial);
  }, []);

  return (
    <SignupContext.Provider value={{ data, update, reset }}>
      {children}
    </SignupContext.Provider>
  );
};

export const useSignupContext = (): SignupContextValue => {
  const ctx = useContext(SignupContext);
  if (!ctx) {
    throw new Error('useSignupContext must be used within SignupProvider');
  }
  return ctx;
};
