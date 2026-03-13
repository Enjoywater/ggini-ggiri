import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from '../Switch';

describe('Switch', () => {
  it('renders with role="switch"', () => {
    render(<Switch checked={false} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('sets aria-checked=false when unchecked', () => {
    render(<Switch checked={false} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('sets aria-checked=true when checked', () => {
    render(<Switch checked={true} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange with toggled value on click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} />);
    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when currently checked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch checked={true} onChange={onChange} />);
    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Switch checked={false} onChange={() => {}} disabled />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('does not fire onChange when disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} disabled />);
    await user.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders label text', () => {
    render(<Switch checked={false} onChange={() => {}} label="Dark mode" />);
    expect(screen.getByText('Dark mode')).toBeInTheDocument();
  });

  it('associates label with switch via aria-label', () => {
    render(<Switch checked={false} onChange={() => {}} label="Toggle" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-label', 'Toggle');
  });
});
