import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';
import { Chip } from '../Chip';
import { ErrorBoundary } from '../ErrorBoundary';
import { Modal } from '../Modal';
import { Switch } from '../Switch';

// jsdom does not implement HTMLDialogElement showModal/close - mock them
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe('Accessibility', () => {
  describe('Button', () => {
    it('has type="button" by default', () => {
      render(<Button>Click</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('allows type override', () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('has aria-disabled when disabled', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('does not have aria-disabled when enabled', () => {
      render(<Button>Enabled</Button>);
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-disabled');
    });
  });

  describe('Modal', () => {
    it('has role="dialog"', () => {
      const { container } = render(
        <Modal open={false} onClose={() => {}} title="Test">
          Content
        </Modal>,
      );
      const dialog = container.querySelector('dialog');
      expect(dialog).toHaveAttribute('role', 'dialog');
    });

    it('has aria-modal="true"', () => {
      const { container } = render(
        <Modal open={false} onClose={() => {}} title="Test">
          Content
        </Modal>,
      );
      const dialog = container.querySelector('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby linked to the title', () => {
      const { container } = render(
        <Modal open={false} onClose={() => {}} title="My Title">
          Content
        </Modal>,
      );
      const dialog = container.querySelector('dialog');
      const titleId = dialog?.getAttribute('aria-labelledby');
      expect(titleId).toBeTruthy();
      const titleEl = container.querySelector(`#${titleId}`);
      expect(titleEl).toHaveTextContent('My Title');
    });

    it('calls onClose when Escape is pressed', () => {
      const onClose = vi.fn();
      const { container } = render(
        <Modal open={true} onClose={onClose} title="Test">
          <button>Inside</button>
        </Modal>,
      );
      const dialog = container.querySelector('dialog')!;
      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });

    it('traps focus within the modal on Tab', () => {
      const { container } = render(
        <Modal open={true} onClose={() => {}} title="Test">
          <button>First</button>
          <button>Second</button>
        </Modal>,
      );
      const dialog = container.querySelector('dialog')!;
      const buttons = dialog.querySelectorAll('button');
      const firstButton = buttons[0] as HTMLElement;
      const lastButton = buttons[buttons.length - 1] as HTMLElement;

      // Focus the last button, then fire Tab keydown via React
      lastButton.focus();
      fireEvent.keyDown(dialog, { key: 'Tab' });

      // The focus trap should move focus to first
      expect(document.activeElement).toBe(firstButton);
    });

    it('traps focus within the modal on Shift+Tab', () => {
      const { container } = render(
        <Modal open={true} onClose={() => {}} title="Test">
          <button>First</button>
          <button>Second</button>
        </Modal>,
      );
      const dialog = container.querySelector('dialog')!;
      const buttons = dialog.querySelectorAll('button');
      const firstButton = buttons[0] as HTMLElement;
      const lastButton = buttons[buttons.length - 1] as HTMLElement;

      // Focus the first button, then fire Shift+Tab keydown via React
      firstButton.focus();
      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });

      // The focus trap should move focus to last
      expect(document.activeElement).toBe(lastButton);
    });
  });

  describe('ErrorBoundary', () => {
    it('renders fallback with role="alert" on error', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(
        '문제가 발생했습니다',
      );

      spy.mockRestore();
    });
  });

  describe('Chip', () => {
    it('has role="switch"', () => {
      render(<Chip>Tag</Chip>);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('has aria-checked=false by default', () => {
      render(<Chip>Tag</Chip>);
      expect(screen.getByRole('switch')).toHaveAttribute(
        'aria-checked',
        'false',
      );
    });

    it('has aria-checked=true when selected', () => {
      render(<Chip selected>Tag</Chip>);
      expect(screen.getByRole('switch')).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });

    it('toggles via keyboard Enter', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Chip onClick={onClick}>Tag</Chip>);
      screen.getByRole('switch').focus();
      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('toggles via keyboard Space', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Chip onClick={onClick}>Tag</Chip>);
      screen.getByRole('switch').focus();
      await user.keyboard(' ');
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Switch', () => {
    it('toggles via keyboard Enter', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Switch checked={false} onChange={onChange} label="Toggle" />);
      screen.getByRole('switch').focus();
      await user.keyboard('{Enter}');
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('toggles via keyboard Space', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Switch checked={false} onChange={onChange} label="Toggle" />);
      screen.getByRole('switch').focus();
      await user.keyboard(' ');
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('has correct aria-label', () => {
      render(<Switch checked={false} onChange={() => {}} label="Dark mode" />);
      expect(screen.getByRole('switch')).toHaveAttribute(
        'aria-label',
        'Dark mode',
      );
    });
  });
});
