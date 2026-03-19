import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingTooltip } from '../ui/OnboardingTooltip';

describe('OnboardingTooltip', () => {
  it('shows tooltip when step matches currentStep', () => {
    render(
      <OnboardingTooltip step="add-member" currentStep="add-member" message="참여자를 추가해 보세요!" onDismiss={vi.fn()}>
        <button>추가</button>
      </OnboardingTooltip>
    );
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('참여자를 추가해 보세요!')).toBeInTheDocument();
  });

  it('hides tooltip when step does not match currentStep', () => {
    render(
      <OnboardingTooltip step="add-member" currentStep="add-session" message="참여자를 추가해 보세요!" onDismiss={vi.fn()}>
        <button>추가</button>
      </OnboardingTooltip>
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('hides tooltip when currentStep is null', () => {
    render(
      <OnboardingTooltip step="add-member" currentStep={null} message="msg" onDismiss={vi.fn()}>
        <button>추가</button>
      </OnboardingTooltip>
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('calls onDismiss when 건너뛰기 is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <OnboardingTooltip step="add-member" currentStep="add-member" message="msg" onDismiss={onDismiss}>
        <button>추가</button>
      </OnboardingTooltip>
    );
    await user.click(screen.getByText('건너뛰기'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('renders children regardless of tooltip state', () => {
    render(
      <OnboardingTooltip step="add-member" currentStep="add-session" message="msg" onDismiss={vi.fn()}>
        <button>추가</button>
      </OnboardingTooltip>
    );
    expect(screen.getByRole('button', { name: '추가' })).toBeInTheDocument();
  });

  it('positions tooltip on top when position is top', () => {
    render(
      <OnboardingTooltip step="add-member" currentStep="add-member" message="msg" position="top" onDismiss={vi.fn()}>
        <button>추가</button>
      </OnboardingTooltip>
    );
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.className).toContain('bottom-full');
  });

  it('positions tooltip on bottom by default', () => {
    render(
      <OnboardingTooltip step="add-member" currentStep="add-member" message="msg" onDismiss={vi.fn()}>
        <button>추가</button>
      </OnboardingTooltip>
    );
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.className).toContain('top-full');
  });
});
