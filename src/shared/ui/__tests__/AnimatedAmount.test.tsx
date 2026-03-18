import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnimatedAmount } from '../AnimatedAmount';

// Mock useAnimatedNumber to return the target immediately for predictable tests
vi.mock('@/shared/lib/use-animated-number', () => ({
  useAnimatedNumber: (target: number) => target,
}));

describe('AnimatedAmount', () => {
  it('renders the amount with Korean locale formatting', () => {
    render(<AnimatedAmount amount={50000} />);
    expect(screen.getByText('50,000원')).toBeInTheDocument();
  });

  it('has correct aria-label with final amount', () => {
    render(<AnimatedAmount amount={50000} />);
    const el = screen.getByLabelText('50,000원');
    expect(el).toBeInTheDocument();
  });

  it('uses default suffix "원"', () => {
    render(<AnimatedAmount amount={10000} />);
    expect(screen.getByText('10,000원')).toBeInTheDocument();
  });

  it('accepts custom suffix', () => {
    render(<AnimatedAmount amount={25000} suffix="달러" />);
    expect(screen.getByText('25,000달러')).toBeInTheDocument();
    expect(screen.getByLabelText('25,000달러')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(
      <AnimatedAmount amount={1000} className="text-lg font-bold" />,
    );
    const span = container.querySelector('span');
    expect(span).toHaveClass('text-lg');
    expect(span).toHaveClass('font-bold');
  });

  it('renders correctly with amount 0', () => {
    render(<AnimatedAmount amount={0} />);
    expect(screen.getByText('0원')).toBeInTheDocument();
    expect(screen.getByLabelText('0원')).toBeInTheDocument();
  });
});
