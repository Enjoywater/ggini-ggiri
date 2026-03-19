import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton, MainPageSkeleton, SettlementPageSkeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('renders with animate-pulse class', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild!;
    expect(el.className).toContain('animate-pulse');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-6 w-20" />);
    const el = container.firstElementChild!;
    expect(el.className).toContain('h-6');
    expect(el.className).toContain('w-20');
  });

  it('has aria-hidden="true"', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild!.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('MainPageSkeleton', () => {
  it('renders multiple skeleton blocks', () => {
    const { container } = render(<MainPageSkeleton />);
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(3);
  });

  it('has aria-busy and aria-label for loading state', () => {
    const { container } = render(<MainPageSkeleton />);
    const wrapper = container.firstElementChild!;
    expect(wrapper.getAttribute('aria-busy')).toBe('true');
    expect(wrapper.getAttribute('aria-label')).toBe('로딩 중');
  });
});

describe('SettlementPageSkeleton', () => {
  it('renders multiple skeleton blocks', () => {
    const { container } = render(<SettlementPageSkeleton />);
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(3);
  });

  it('has aria-busy and aria-label for loading state', () => {
    const { container } = render(<SettlementPageSkeleton />);
    const wrapper = container.firstElementChild!;
    expect(wrapper.getAttribute('aria-busy')).toBe('true');
    expect(wrapper.getAttribute('aria-label')).toBe('로딩 중');
  });
});
