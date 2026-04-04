import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

// Моки для localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should return initial value for new key', () => {
    const { result } = renderHook(() =>
      useLocalStorage('new-key', 'default-value')
    );

    expect(result.current[0]).toBe('default-value');
  });

  it('should return stored value for existing key', () => {
    localStorageMock.getItem.mockReturnValue('"stored-value"');

    const { result } = renderHook(() =>
      useLocalStorage('existing-key', 'default-value')
    );

    expect(result.current[0]).toBe('stored-value');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('existing-key');
  });

  it('should save value to localStorage', () => {
    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'initial-value')
    );

    act(() => {
      result.current[1]('new-value');
    });

    expect(result.current[0]).toBe('new-value');
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'test-key',
      JSON.stringify('new-value')
    );
  });

  it('should handle object values', () => {
    const initialValue = { name: 'test', count: 42 };
    const { result } = renderHook(() =>
      useLocalStorage('object-key', initialValue)
    );

    const newValue = { name: 'updated', count: 100 };
    act(() => {
      result.current[1](newValue);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'object-key',
      JSON.stringify(newValue)
    );
  });

  it('should handle number values', () => {
    const { result } = renderHook(() => useLocalStorage('number-key', 0));

    act(() => {
      result.current[1](42);
    });

    expect(result.current[0]).toBe(42);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'number-key',
      JSON.stringify(42)
    );
  });

  it('should handle array values', () => {
    const { result } = renderHook(() => useLocalStorage('array-key', [] as string[]));

    act(() => {
      result.current[1](['BTCUSDT', 'ETHUSDT']);
    });

    expect(result.current[0]).toEqual(['BTCUSDT', 'ETHUSDT']);
  });

  it('should handle JSON parse error gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid-json');

    const { result } = renderHook(() =>
      useLocalStorage('invalid-key', 'default-value')
    );

    // Should return default value on parse error
    expect(result.current[0]).toBe('default-value');
  });
});
