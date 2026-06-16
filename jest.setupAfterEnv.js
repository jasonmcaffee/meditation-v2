// Silence noisy React Native warnings that don't affect test outcomes
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args) => {
    const msg = args[0];
    if (
      typeof msg === 'string' &&
      (msg.includes('ReactNativeFiberHostComponent') ||
        msg.includes('NativeEventEmitter') ||
        msg.includes('act('))
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});
