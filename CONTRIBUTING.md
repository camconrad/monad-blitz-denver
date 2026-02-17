# Contributing Guide

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `yarn install`
3. Create a branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Test locally: `yarn dev`
6. Build to verify: `yarn build`
7. Commit your changes
8. Push and create a Pull Request

## Code Style

- Use TypeScript for all new files
- Follow existing component patterns
- Use Tailwind CSS for styling (avoid inline styles)
- Use `cn()` helper for conditional classes
- Keep components small and focused

## Component Guidelines

### Creating New Components

```tsx
// components/my-component.tsx
import { cn } from '@/lib/utils';

interface MyComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export function MyComponent({ className, children }: MyComponentProps) {
  return (
    <div className={cn('base-styles', className)}>
      {children}
    </div>
  );
}
```

### Using shadcn/ui

Always install via CLI:

```bash
npx shadcn@latest add [component-name]
```

Don't manually copy components - the CLI ensures correct dependencies and configuration.

## File Organization

- **app/** - Next.js pages and layouts (App Router)
- **components/ui/** - shadcn/ui components (managed by CLI)
- **components/animate-ui/** - animate-ui components (managed by CLI)
- **components/** - Your custom components
- **lib/** - Utility functions
- **hooks/** - Custom React hooks

## Commit Messages

Follow conventional commits:

- `feat: add new feature`
- `fix: fix bug in component`
- `docs: update documentation`
- `style: format code`
- `refactor: refactor component`
- `test: add tests`
- `chore: update dependencies`

## Testing

Before submitting:

1. Run dev server and test manually
2. Run production build: `yarn build`
3. Check for TypeScript errors
4. Verify all imports work

## Pull Request Process

1. Update README.md if needed
2. Update PROJECT_CONFIG.md for configuration changes
3. Ensure the build succeeds
4. Describe your changes clearly
5. Link any related issues

## Questions?

Open an issue for discussion before starting major changes.
