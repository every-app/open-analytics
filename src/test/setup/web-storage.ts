// Node 25 and later turn Web Storage on by default and define their own
// localStorage and sessionStorage on globalThis. Without --localstorage-file,
// Node's localStorage is a stub with no Storage methods, and vitest's happy-dom
// environment keeps it because the key already exists. Put happy-dom's Storage
// back so the browser tests see what a browser has, on every supported Node.
// Suites in the node environment are left alone: Storage there is Node's.
const scope = globalThis as typeof globalThis & {
  happyDOM?: unknown;
  Storage?: new () => Storage;
};

if (scope.happyDOM && scope.Storage) {
  for (const key of ["localStorage", "sessionStorage"] as const) {
    const current = scope[key] as Storage | undefined;
    if (typeof current?.clear !== "function") {
      Object.defineProperty(scope, key, {
        value: new scope.Storage(),
        configurable: true,
        enumerable: true,
        writable: true,
      });
    }
  }
}
