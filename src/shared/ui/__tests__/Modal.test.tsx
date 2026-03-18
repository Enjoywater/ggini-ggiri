import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from '../Modal';

// jsdom does not implement HTMLDialogElement showModal/close - mock them
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe('Modal', () => {
  it('renders children', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        Modal content
      </Modal>,
    );
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('calls showModal when open is true', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        Content
      </Modal>,
    );
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it('calls close when open is false', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        Content
      </Modal>,
    );
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  it('calls showModal then close when open changes', () => {
    const { rerender } = render(
      <Modal open={true} onClose={() => {}}>
        Content
      </Modal>,
    );
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);

    rerender(
      <Modal open={false} onClose={() => {}}>
        Content
      </Modal>,
    );
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  it('renders title when provided', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Confirm">
        Body
      </Modal>,
    );
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('sets aria-labelledby from title with unique id', () => {
    render(
      <Modal open={false} onClose={() => {}} title="My Dialog">
        Body
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { hidden: true });
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(labelledBy).toMatch(/^modal-title-/);
  });

  it('renders X close button that calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Dialog">
        Body
      </Modal>,
    );
    const closeBtn = screen.getByRole('button', { name: '닫기', hidden: true });
    expect(closeBtn).toBeInTheDocument();
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders X close button even without title', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        Body
      </Modal>,
    );
    const closeBtn = screen.getByRole('button', { name: '닫기', hidden: true });
    expect(closeBtn).toBeInTheDocument();
  });

  it('calls onClose when backdrop (dialog element) is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose}>
        Inner
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { hidden: true });
    // Click on the dialog element itself (backdrop area)
    await user.click(dialog);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when inner content is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <button>Inner button</button>
      </Modal>,
    );
    // dialog is hidden in jsdom, so use hidden: true
    await user.click(screen.getByRole('button', { name: 'Inner button', hidden: true }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
