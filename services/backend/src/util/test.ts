import { convexTest as _convexTest } from 'convex-test';

/// <reference types="vite/client" />
export const modules = import.meta.glob('../../**/!(*.*.*)*.*s');
export const convexTest = (schema: Parameters<typeof _convexTest>[0]) =>
  _convexTest(schema, modules);
