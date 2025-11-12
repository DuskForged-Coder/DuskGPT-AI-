import { useState, useEffect, useCallback } from 'react';

// Declare aistudio on the window object for TypeScript
// Fix: Define the AIStudio interface to resolve the type conflict.
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    aistudio?: AIStudio;
  }
}

export const useApiKey = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkApiKey = useCallback(async () => {
    if (window.aistudio) {
      setIsChecking(true);
      try {
        const result = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(result);
      } catch (error) {
        console.error("Error checking API key:", error);
        setHasApiKey(false);
      } finally {
        setIsChecking(false);
      }
    } else {
        // aistudio might not be available in all environments
        setIsChecking(false);
        setHasApiKey(false);
    }
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const selectApiKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // Assume success after opening dialog to avoid race conditions
        setHasApiKey(true);
      } catch (error) {
        console.error("Error opening API key selection:", error);
        setHasApiKey(false);
      }
    }
  };
  
  const resetApiKey = () => {
    setHasApiKey(false);
  }

  return { hasApiKey, isChecking, selectApiKey, checkApiKey, resetApiKey };
};
