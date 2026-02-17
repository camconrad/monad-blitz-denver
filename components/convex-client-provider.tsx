'use client';

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ReactNode } from 'react';

// Placeholder when env not set so useMutation/useQuery don't throw; app won't call Convex until NEXT_PUBLIC_CONVEX_URL is set.
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? 'https://placeholder.convex.cloud';
const client = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
