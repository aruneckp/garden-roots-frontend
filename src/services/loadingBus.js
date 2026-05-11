// Minimal pub/sub so api.js can broadcast loading events without importing React.
const listeners = new Set();

export const onLoading = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const emitLoading = (active) => listeners.forEach((fn) => fn(active));
