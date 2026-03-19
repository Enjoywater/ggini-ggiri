import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, CardHeader, CardTitle } from '../Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(<Card className="extra">Content</Card>);
    expect(container.firstElementChild!.className).toContain('extra');
    expect(container.firstElementChild!.className).toContain('rounded-2xl');
  });

  it('passes through extra props', () => {
    render(<Card data-testid="my-card">Content</Card>);
    expect(screen.getByTestId('my-card')).toBeInTheDocument();
  });

  it('renders without accent when accentColor is not provided', () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstElementChild!.className).not.toContain('border-l-4');
  });

  it('applies accent border class when accentColor is provided', () => {
    const { container } = render(<Card accentColor="pink">Content</Card>);
    expect(container.firstElementChild!.className).toContain('border-l-4');
    expect(container.firstElementChild!.className).toContain('border-l-pastel-pink-dark');
  });

  it('applies correct accent for each color', () => {
    const colors = ['pink', 'lavender', 'mint', 'sky', 'peach'] as const;
    for (const color of colors) {
      const { container } = render(<Card accentColor={color}>Content</Card>);
      expect(container.firstElementChild!.className).toContain(`border-l-pastel-${color}-dark`);
      container.remove();
    }
  });
});

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(<CardHeader className="custom">Header</CardHeader>);
    expect(container.firstElementChild!.className).toContain('custom');
    expect(container.firstElementChild!.className).toContain('mb-3');
  });
});

describe('CardTitle', () => {
  it('renders children as h3', () => {
    render(<CardTitle>My Title</CardTitle>);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('My Title');
  });

  it('merges custom className', () => {
    render(<CardTitle className="bold">Title</CardTitle>);
    const heading = screen.getByRole('heading');
    expect(heading.className).toContain('bold');
    expect(heading.className).toContain('text-lg');
  });
});
