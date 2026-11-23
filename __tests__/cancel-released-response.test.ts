/// <reference types="node" />
import { FetchResponse } from 'expo/build/winter/fetch/FetchResponse';

globalThis.ReadableStream = require('node:stream/web').ReadableStream;

// Stand-in for the native `NativeResponse` shared object. On Android, `cancelStreaming` is an
// `AsyncFunction`. When the native object is already released (for example, the response was
// garbage-collected or the request finished on the native side first), the call rejects with
// "Cannot use shared object that was already released".
jest.mock('expo/build/winter/fetch/ExpoFetchModule', () => {
  class NativeResponse {
    private listeners = new Map<string, Set<(...args: any[]) => void>>();
    addListener(event: string, listener: (...args: any[]) => void) {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event)!.add(listener);
    }
    removeListener(event: string, listener: (...args: any[]) => void) {
      this.listeners.get(event)?.delete(listener);
    }
    removeAllListeners(event: string) {
      this.listeners.delete(event);
    }
    emit() {}
    get _rawHeaders() {
      return [['content-type', 'text/plain']];
    }
    get status() {
      return 200;
    }
    get statusText() {
      return 'OK';
    }
    get url() {
      return 'https://example.test/';
    }
    get redirected() {
      return false;
    }
    get bodyUsed() {
      return false;
    }
    async startStreaming() {
      return null;
    }
    cancelStreaming(): Promise<void> {
      return Promise.reject(
        new Error(
          "Call to function 'NativeResponse.cancelStreaming' has been rejected.\n" +
            '→ Caused by: Cannot use shared object that was already released'
        )
      );
    }
  }
  return { ExpoFetchModule: { NativeRequest: class {}, NativeResponse } };
});

test('canceling the body of a released response does not leave an unhandled rejection', async () => {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);
  // Jest also fails the test on its own when it sees the unhandled rejection.
  process.on('unhandledRejection', onUnhandled);

  const response = new FetchResponse(() => {});
  const reader = response.body!.getReader();
  try {
    // What a careful caller writes. It cannot catch the native rejection: the stream's
    // own cancel promise resolves, and the native promise is dropped inside expo/fetch.
    await reader.cancel('no longer needed');
  } catch {
    // never reached
  }
  await new Promise((resolve) => setImmediate(resolve));
  process.off('unhandledRejection', onUnhandled);

  expect(unhandled).toEqual([]);
});
