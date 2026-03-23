import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LinkButton } from '../LinkButton';

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock view-transition to avoid startViewTransition issues in test env
vi.mock('@/shared/lib/view-transition', () => ({
  navigateWithTransition: (_href: string, cb: () => void) => cb(),
}));

describe('LinkButton', () => {
  it('renders as an anchor element with correct href', () => {
    render(<LinkButton href="/settings">Settings</LinkButton>);
    const link = screen.getByRole('link', { name: 'Settings' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/settings');
  });

  it('renders children', () => {
    render(<LinkButton href="/">Go Home</LinkButton>);
    expect(screen.getByText('Go Home')).toBeInTheDocument();
  });

  it('applies primary variant classes by default', () => {
    render(<LinkButton href="/">Primary</LinkButton>);
    const link = screen.getByRole('link');
    expect(link.className).toContain('bg-primary');
  });

  it('applies secondary variant classes', () => {
    render(<LinkButton href="/" variant="secondary">Secondary</LinkButton>);
    const link = screen.getByRole('link');
    expect(link.className).toContain('bg-surface-elevated');
  });

  it('applies danger variant classes', () => {
    render(<LinkButton href="/" variant="danger">Danger</LinkButton>);
    const link = screen.getByRole('link');
    expect(link.className).toContain('bg-danger');
  });

  it('applies ghost variant classes', () => {
    render(<LinkButton href="/" variant="ghost">Ghost</LinkButton>);
    const link = screen.getByRole('link');
    expect(link.className).toContain('bg-transparent');
  });

  it('applies sm size classes', () => {
    render(<LinkButton href="/" size="sm">Small</LinkButton>);
    const link = screen.getByRole('link');
    expect(link.className).toContain('text-sm');
  });

  it('applies lg size classes', () => {
    render(<LinkButton href="/" size="lg">Large</LinkButton>);
    const link = screen.getByRole('link');
    expect(link.className).toContain('text-lg');
  });

  it('applies fullWidth class', () => {
    render(<LinkButton href="/" fullWidth>Full</LinkButton>);
    const link = screen.getByRole('link');
    expect(link.className).toContain('w-full');
  });

  it('does not apply w-full when fullWidth is false', () => {
    render(<LinkButton href="/">Not Full</LinkButton>);
    const link = screen.getByRole('link');
    expect(link.className).not.toContain('w-full');
  });

  it('renders disabled state with aria-disabled', () => {
    render(<LinkButton href="/" disabled>Disabled</LinkButton>);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('tabindex', '-1');
  });

  it('disabled link applies opacity class', () => {
    render(<LinkButton href="/" disabled>Disabled</LinkButton>);
    const link = screen.getByRole('link');
    expect(link.className).toContain('opacity-50');
  });

  it('disabled link does not navigate (no href attribute)', () => {
    render(<LinkButton href="/settings" disabled>Disabled</LinkButton>);
    const link = screen.getByRole('link');
    // disabled renders a plain <a> without href
    expect(link).not.toHaveAttribute('href');
  });

  it('merges custom className', () => {
    render(<LinkButton href="/" className="custom-class">Custom</LinkButton>);
    const link = screen.getByRole('link');
    expect(link.className).toContain('custom-class');
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<LinkButton href="/" onClick={onClick}>Click me</LinkButton>);
    await user.click(screen.getByRole('link'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
