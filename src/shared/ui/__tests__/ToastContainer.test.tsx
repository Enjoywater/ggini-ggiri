import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { ToastContainer } from '../ToastContainer';
import { useToastStore } from '@/shared/lib/toast-store';

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when no toasts', () => {
    const { container } = render(<ToastContainer />);
    // The component returns null when there are no toasts
    expect(container.innerHTML).toBe('');
  });

  it('renders toast messages when toasts exist in store', () => {
    act(() => {
      useToastStore.getState().addToast('Test message', 'success');
    });

    render(<ToastContainer />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders multiple toasts', () => {
    act(() => {
      useToastStore.getState().addToast('First toast', 'success');
      useToastStore.getState().addToast('Second toast', 'error');
    });

    render(<ToastContainer />);

    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
  });

  describe('type styling', () => {
    it('applies pastel-mint classes for success type', () => {
      act(() => {
        useToastStore.getState().addToast('Success toast', 'success');
      });

      render(<ToastContainer />);

      const toastEl = screen.getByRole('status');
      expect(toastEl.className).toContain('bg-pastel-mint');
      expect(toastEl.className).toContain('border-pastel-mint-dark');
    });

    it('applies pastel-coral classes for error type', () => {
      act(() => {
        useToastStore.getState().addToast('Error toast', 'error');
      });

      render(<ToastContainer />);

      const toastEl = screen.getByRole('status');
      expect(toastEl.className).toContain('bg-pastel-coral');
      expect(toastEl.className).toContain('border-pastel-coral-dark');
    });

    it('applies pastel-sky classes for info type', () => {
      act(() => {
        useToastStore.getState().addToast('Info toast', 'info');
      });

      render(<ToastContainer />);

      const toastEl = screen.getByRole('status');
      expect(toastEl.className).toContain('bg-pastel-sky');
      expect(toastEl.className).toContain('border-pastel-sky-dark');
    });
  });

  describe('close button', () => {
    it('removes toast when close button is clicked', () => {
      act(() => {
        useToastStore.getState().addToast('Dismissible toast', 'success');
      });

      render(<ToastContainer />);

      expect(screen.getByText('Dismissible toast')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: '알림 닫기' });
      fireEvent.click(closeButton);

      expect(screen.queryByText('Dismissible toast')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has role="status" on each toast', () => {
      act(() => {
        useToastStore.getState().addToast('Accessible toast', 'success');
      });

      render(<ToastContainer />);

      const statusEl = screen.getByRole('status');
      expect(statusEl).toBeInTheDocument();
    });

    it('has aria-live="polite" on each toast', () => {
      act(() => {
        useToastStore.getState().addToast('Polite toast', 'success');
      });

      render(<ToastContainer />);

      const statusEl = screen.getByRole('status');
      expect(statusEl).toHaveAttribute('aria-live', 'polite');
    });

    it('has aria-label="알림" on the container region', () => {
      act(() => {
        useToastStore.getState().addToast('Region toast', 'success');
      });

      render(<ToastContainer />);

      const region = screen.getByRole('region');
      expect(region).toHaveAttribute('aria-label', '알림');
    });

    it('has aria-atomic="true" on each toast', () => {
      act(() => {
        useToastStore.getState().addToast('Atomic toast', 'success');
      });

      render(<ToastContainer />);

      const statusEl = screen.getByRole('status');
      expect(statusEl).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('portal rendering', () => {
    it('uses createPortal to render in document.body', () => {
      act(() => {
        useToastStore.getState().addToast('Portal toast', 'success');
      });

      const { container } = render(<ToastContainer />);

      // The component container should be empty since content is portaled to body
      expect(container.innerHTML).toBe('');

      // But the toast should be in the body
      expect(document.body.querySelector('[role="region"]')).toBeInTheDocument();
      expect(screen.getByText('Portal toast')).toBeInTheDocument();
    });
  });
});
