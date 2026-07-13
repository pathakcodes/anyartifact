// Declare Hono context variable types
declare module 'hono' {
  interface ContextVariableMap {
    apiKeyHash: string;
  }
}
