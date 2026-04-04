import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

interface UseLocalStorageOptions {
  serializer?: (value: any) => string;
  deserializer?: (value: string) => any;
  initializeWithValue?: boolean;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions = {}
): [T, SetValue<T>, () => void] {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    initializeWithValue = true,
  } = options;

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    if (!initializeWithValue) {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === undefined) {
        return initialValue;
      }
      return deserializer(item) as T;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((prev) => {
          const valueToStore = value instanceof Function ? value(prev) : value;
          
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, serializer(valueToStore));
            
            // Dispatch custom event for cross-tab synchronization
            window.dispatchEvent(
              new CustomEvent('local-storage', {
                detail: { key, value: valueToStore },
              })
            );
          }
          
          return valueToStore;
        });
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, serializer]
  );

  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        setStoredValue(initialValue);
        
        window.dispatchEvent(
          new CustomEvent('local-storage', {
            detail: { key, value: initialValue },
          })
        );
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Listen for storage events from other tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(deserializer(event.newValue) as T);
        } catch (error) {
          console.warn(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    const handleCustomStorageChange = (event: CustomEvent) => {
      if (event.detail?.key === key) {
        setStoredValue(event.detail.value as T);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleCustomStorageChange as EventListener);
    };
  }, [key, deserializer]);

  return [storedValue, setValue, removeValue];
}

// Hook for managing multiple localStorage items
export function useLocalStorageMap<T extends Record<string, any>>(
  key: string,
  initialValue: T
): [T, (updates: Partial<T>) => void, () => void] {
  const [storedValue, setValue, removeValue] = useLocalStorage<T>(key, initialValue);

  const updateValues = useCallback(
    (updates: Partial<T>) => {
      setValue((prev) => ({ ...prev, ...updates }));
    },
    [setValue]
  );

  return [storedValue, updateValues, removeValue];
}

// Hook for boolean values
export function useLocalStorageBoolean(
  key: string,
  initialValue: boolean = false
): [boolean, (value: boolean) => void, () => void] {
  return useLocalStorage<boolean>(key, initialValue, {
    serializer: (v) => String(v),
    deserializer: (v) => v === 'true',
  });
}

// Hook for number values
export function useLocalStorageNumber(
  key: string,
  initialValue: number = 0
): [number, (value: number) => void, () => void] {
  return useLocalStorage<number>(key, initialValue, {
    serializer: (v) => String(v),
    deserializer: (v) => parseFloat(v) || 0,
  });
}

// Hook for string values
export function useLocalStorageString(
  key: string,
  initialValue: string = ''
): [string, (value: string) => void, () => void] {
  return useLocalStorage<string>(key, initialValue);
}
