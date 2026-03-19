import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders message text', () => {
    render(<EmptyState message="테스트 메시지" />);
    expect(screen.getByText('테스트 메시지')).toBeInTheDocument();
  });

  it('renders members illustration', () => {
    const { container } = render(<EmptyState illustration="members" message="msg" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders sessions illustration', () => {
    const { container } = render(<EmptyState illustration="sessions" message="msg" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders history illustration', () => {
    const { container } = render(<EmptyState illustration="history" message="msg" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders custom icon instead of illustration', () => {
    render(<EmptyState icon={<span data-testid="custom-icon">🎉</span>} message="msg" />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders CTA button when provided', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<EmptyState message="msg" cta={{ label: '추가하기', onClick }} />);

    const button = screen.getByRole('button', { name: '추가하기' });
    expect(button).toBeInTheDocument();
    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not render CTA button when not provided', () => {
    render(<EmptyState message="msg" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies animate-breathing class to message', () => {
    render(<EmptyState message="breathing msg" />);
    const p = screen.getByText('breathing msg');
    expect(p.className).toContain('animate-breathing');
  });

  it('merges custom className', () => {
    const { container } = render(<EmptyState message="msg" className="custom-class" />);
    expect(container.firstElementChild!.className).toContain('custom-class');
  });
});
