declare module '@tabler/icons-react';

declare module 'klinecharts' {
  export interface Chart {
    setKLineData(data: any[]): void;
    addKLineData(data: any): void;
    updateKLineData(data: any): void;
    setData(data: any[]): void;
    setOptions(options: any): void;
    applyOptions(options: any): void;
    setStyles(styles: any): void;
    destroy(): void;
    updateData(data: any[]): void;
    clearData(): void;
    clear(): void;
    resize(): void;
    getOptions(): any;
    subscribe(event: string, callback: Function): void;
    unsubscribe(event: string, callback: Function): void;
  }

  export function init(container: HTMLElement | null, options?: any): Chart | null;
  export function dispose(container: HTMLElement | null): void;
  export const utils: any;
  export const extension: any;
  export const version: string;
}
