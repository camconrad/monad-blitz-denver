'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

const tabs = [
  { title: 'Guide', href: '/guide', value: 'guide' },
  { title: 'Trade', href: '/trade', value: 'trade' },
] as const;

export function CoachTradeTabs() {
  const pathname = usePathname();
  const activeValue = pathname === '/trade' ? 'trade' : 'guide';

  return (
    <nav className="flex justify-center" aria-label="Page tabs">
      <div className="flex items-center gap-0 rounded-lg border border-border bg-muted/30 p-0.5 no-visible-scrollbar max-w-full">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.href}
            className={cn(
              'relative z-0 px-4 py-2 text-sm font-medium rounded-md transition-colors',
              activeValue === tab.value
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {activeValue === tab.value && (
              <motion.div
                layoutId="guide-trade-tab"
                transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                className="absolute inset-0 rounded-md bg-primary"
                style={{ zIndex: -1 }}
              />
            )}
            <span className="relative">{tab.title}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
