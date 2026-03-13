import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input } from '../Input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('associates label with input via htmlFor/id', () => {
    render(<Input label="Username" />);
    const input = screen.getByLabelText('Username');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('uses provided id over generated one', () => {
    render(<Input label="Email" id="custom-id" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'custom-id');
  });

  it('displays error message with role="alert"', () => {
    render(<Input label="Name" error="Required field" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Required field');
  });

  it('sets aria-invalid when error is present', () => {
    render(<Input label="Name" error="Required" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets aria-invalid to false when no error', () => {
    render(<Input label="Name" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
  });

  it('sets aria-describedby pointing to error element', () => {
    render(<Input label="Name" error="Bad" />);
    const input = screen.getByRole('textbox');
    const errorEl = screen.getByRole('alert');
    expect(input.getAttribute('aria-describedby')).toBe(errorEl.id);
  });

  it('renders suffix text', () => {
    render(<Input suffix="원" />);
    expect(screen.getByText('원')).toBeInTheDocument();
  });

  it('does not render suffix when not provided', () => {
    const { container } = render(<Input />);
    expect(container.querySelector('span')).toBeNull();
  });

  it('accepts user input', async () => {
    const user = userEvent.setup();
    render(<Input label="Field" />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'hello');
    expect(input).toHaveValue('hello');
  });
});
