/**
 * Declaraciones mínimas del global Deno para Supabase Edge Functions.
 * El runtime real es Deno; esto evita errores de TypeScript en el IDE.
 */
declare const Deno: {
  serve(handler: (req: Request) => Promise<Response> | Response): void;
  env: {
    get(key: string): string | undefined;
  };
};
