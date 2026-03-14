import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from '../FormField';

describe('FormField', () => {
  it('renders children without error', () => {
    render(
      <FormField>
        <input data-testid="child-input" />
      </FormField>,
    );
    expect(screen.getByTestId('child-input')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    render(
      <FormField error="금액은 0보다 커야 합니다.">
        <input />
      </FormField>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('금액은 0보다 커야 합니다.');
  });

  it('hides error when error is null', () => {
    render(
      <FormField error={null}>
        <input />
      </FormField>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('displays label when provided', () => {
    render(
      <FormField label="총 금액">
        <input />
      </FormField>,
    );
    expect(screen.getByText('총 금액')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(
      <FormField label="라벨" error="에러 메시지">
        <input />
      </FormField>,
    );
    const label = screen.getByText('라벨');
    expect(label.className).toContain('text-sm');
    expect(label.className).toContain('font-medium');
    expect(label.className).toContain('text-text-secondary');
    expect(label.className).toContain('mb-1');

    const error = screen.getByRole('alert');
    expect(error.className).toContain('text-xs');
    expect(error.className).toContain('text-danger-dark');
    expect(error.className).toContain('mt-1');
  });
});
