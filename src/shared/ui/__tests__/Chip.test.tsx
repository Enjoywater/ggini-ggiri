import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from '../Chip';

describe('Chip', () => {
  it('renders children', () => {
    render(<Chip>Tag</Chip>);
    expect(screen.getByRole('switch', { name: 'Tag' })).toBeInTheDocument();
  });

  it('has role="switch"', () => {
    render(<Chip>Tag</Chip>);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('sets aria-checked=false when not selected', () => {
    render(<Chip>Tag</Chip>);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('sets aria-checked=true when selected', () => {
    render(<Chip selected>Tag</Chip>);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('fires onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Chip onClick={onClick}>Tag</Chip>);
    await user.click(screen.getByRole('switch'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies active color styles when selected with pink', () => {
    render(<Chip selected color="pink">Pink</Chip>);
    const chip = screen.getByRole('switch');
    expect(chip.className).toContain('bg-pastel-pink');
  });

  it('applies inactive styles when not selected', () => {
    render(<Chip color="mint">Mint</Chip>);
    const chip = screen.getByRole('switch');
    expect(chip.className).toContain('bg-surface-elevated');
  });

  it('defaults to sky color', () => {
    render(<Chip selected>Default</Chip>);
    const chip = screen.getByRole('switch');
    expect(chip.className).toContain('bg-pastel-sky');
  });

  it('applies lavender active styles', () => {
    render(<Chip selected color="lavender">Lavender</Chip>);
    const chip = screen.getByRole('switch');
    expect(chip.className).toContain('bg-pastel-lavender');
  });

  it('applies peach active styles', () => {
    render(<Chip selected color="peach">Peach</Chip>);
    const chip = screen.getByRole('switch');
    expect(chip.className).toContain('bg-pastel-peach');
  });
});
