import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-semibold text-foreground mb-2">404</h1>
      <p className="text-muted-foreground text-sm mb-6">This page could not be found.</p>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
