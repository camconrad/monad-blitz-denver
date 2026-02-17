'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from 'lucide-react';
import BlockiesSvg from 'blockies-react-svg';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const BLOCKIE_SIZE = 8;
const BLOCKIE_SCALE = 4;

export function WalletAvatar({ className }: { className?: string }) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        openConnectModal,
        openAccountModal,
        mounted,
        authenticationStatus,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected = ready && account;

        if (!ready) {
          return (
            <div className={cn('size-9 rounded-full bg-muted', className)} aria-hidden />
          );
        }

        if (!connected) {
          return (
            <Button
              variant="ghost"
              size="icon"
              onClick={openConnectModal}
              className={cn('size-9 rounded-full', className)}
              title="Connect"
              aria-label="Connect wallet"
            >
              <Wallet className="h-4 w-4" />
            </Button>
          );
        }

        return (
          <button
            type="button"
            onClick={openAccountModal}
            className={cn(
              'inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-border ring-offset-2 ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary',
              className
            )}
            title={account.displayName}
            aria-label="Account menu"
          >
            <span className="block h-full w-full overflow-hidden rounded-full">
              <BlockiesSvg
                address={account.address}
                size={BLOCKIE_SIZE}
                scale={BLOCKIE_SCALE}
                className="h-full w-full"
              />
            </span>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
