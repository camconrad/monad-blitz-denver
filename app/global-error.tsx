'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm text-center">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
