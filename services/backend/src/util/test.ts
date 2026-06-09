import type { SchemaDefinition, GenericSchema } from 'convex/server';
import { convexTest as _convexTest } from 'convex-test';

/// <reference types="vite/client" />
export const modules = import.meta.glob('../../**/!(*.*.*)*.*s');
export const convexTest = <Schema extends GenericSchema>(
  schema: SchemaDefinition<Schema, boolean>
) => _convexTest(schema, modules);
