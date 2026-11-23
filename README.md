# expo/fetch: canceling a released response body leaves an unhandled rejection

Minimal reproducer for [expo/expo#54039](https://github.com/expo/expo/issues/54039) (follow-up of [#51199](https://github.com/expo/expo/issues/51199), closed by the bot for a missing reproducer).
Proposed fix: [expo/expo#54034](https://github.com/expo/expo/pull/54034) (`npm run test:with-fix` applies the same change).

`FetchResponse`'s body stream `cancel` callback calls the native `NativeResponse.cancelStreaming()`
and drops the promise it returns:

```ts
// packages/expo/src/winter/fetch/FetchResponse.ts (expo 58.0.26 and main)
cancel: (reason) => {
  this.bodyStreamClosed = true;
  body.consumed = true;
  this.cancelStreaming(String(reason)); // AsyncFunction on Android and iOS; promise dropped
},
```

On Android, when the native response is already released, that promise rejects with
`Cannot use shared object that was already released`. Nothing observes it, so it becomes an
**unhandled promise rejection**. The caller cannot catch it: `reader.cancel()` resolves, because
the stream's own cancel promise does not depend on the native one.

This repo runs the real, published `expo/build/winter/fetch/FetchResponse.js` in Jest. Only the
native module is replaced by a stub whose `cancelStreaming` rejects exactly like the Android
native module does when the shared object is gone. No device, emulator or Expo account is needed.

## Versions

- `expo` 58.0.26 (latest at the time of writing). Same code on `main`.
- Node 20+ (uses `node:stream/web`).

## Steps

```sh
npm install --legacy-peer-deps
npm test               # published expo as is: FAILS
npm run test:with-fix  # same test with the one-line fix applied to node_modules: PASSES
```

## Expected

Canceling a response body never produces an unhandled rejection. A failed native cancel of a
response that is already released is not actionable for the caller.

## Actual

```
✕ canceling the body of a released response does not leave an unhandled rejection

  Call to function 'NativeResponse.cancelStreaming' has been rejected.
  → Caused by: Cannot use shared object that was already released

    at Object.cancelStreaming [as cancel] (node_modules/expo/build/winter/fetch/FetchResponse.ts:344:18)
```

In a production Android app this shows up as an unhandled rejection with no app frames on the
stack (`Call to function 'NativeResponse.cancelStreaming' has been rejected` →
`Cannot use shared object that was already released`).

## Fix

```ts
Promise.resolve(this.cancelStreaming(String(reason))).catch(() => {});
```

`scripts/toggle-fix.js` applies exactly this change to the installed build, and reverts it.
