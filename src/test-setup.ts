/**
 * Test Setup Configuration
 *
 * This file configures the testing environment for the PCM project.
 * It sets up testing library extensions and global test utilities.
 *
 * @module TestSetup
 * @version 1.0
 * @date 2025-08-30
 */

import '@testing-library/jest-dom';

// Mock File for Node.js testing environment
global.File = class File {
  constructor(
    public fileBits: BlobPart[],
    public name: string,
    public options: FilePropertyBag = {}
  ) {
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
  }

  public readonly type: string;
  public readonly lastModified: number;
  public readonly size: number = this.fileBits.reduce((size, bit) => {
    if (typeof bit === 'string') return size + bit.length;
    if (bit instanceof ArrayBuffer) return size + bit.byteLength;
    return size + (bit as any).length || 0;
  }, 0);

  public readonly webkitRelativePath: string = '';

  slice(start?: number, end?: number, contentType?: string): Blob {
    const slicedBits = this.fileBits.slice(start, end);
    return new Blob(slicedBits, { type: contentType });
  }

  stream(): ReadableStream<Uint8Array> {
    throw new Error('stream() not implemented in test environment');
  }

  text(): Promise<string> {
    return Promise.resolve(this.fileBits.join(''));
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    const content = this.fileBits.join('');
    const buffer = new ArrayBuffer(content.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < content.length; i++) {
      view[i] = content.charCodeAt(i);
    }
    return Promise.resolve(buffer);
  }
} as any;

// Mock IntersectionObserver for testing
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver for testing
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia for testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock console.error for cleaner test output
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
        args[0].includes('Warning: An invalid form control'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
