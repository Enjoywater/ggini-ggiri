import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { CheckAnimation } from '../CheckAnimation';

// NOTE: The component uses useEffect with setTimeout for sparkles.
// Use fake timers to control timing.

describe('CheckAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('unchecked 상태에서 SVG rect 표시', () => {
    const { container } = render(<CheckAnimation checked={false} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(container.querySelector('rect')).toBeTruthy();
    expect(container.querySelector('circle')).toBeNull();
    expect(container.querySelector('path')).toBeNull();
  });

  it('checked 상태에서 SVG circle + path 표시', () => {
    const { container } = render(<CheckAnimation checked={true} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(container.querySelector('circle')).toBeTruthy();
    expect(container.querySelector('path')).toBeTruthy();
    expect(container.querySelector('rect')).toBeNull();
  });

  it('aria-hidden="true" 속성 적용 (장식 요소)', () => {
    const { container } = render(<CheckAnimation checked={false} />);
    const span = container.firstElementChild as HTMLElement;
    expect(span.getAttribute('aria-hidden')).toBe('true');
  });

  it('unchecked → checked 전환 시 sparkle 파티클 표시', () => {
    const { container, rerender } = render(<CheckAnimation checked={false} />);

    // Transition to checked
    rerender(<CheckAnimation checked={true} />);

    const sparkles = container.querySelectorAll('.rounded-full');
    expect(sparkles.length).toBe(5); // SPARKLE_PARTICLES has 5 items
  });

  it('sparkle 파티클이 500ms 후 사라짐', () => {
    const { container, rerender } = render(<CheckAnimation checked={false} />);

    rerender(<CheckAnimation checked={true} />);
    expect(container.querySelectorAll('.rounded-full').length).toBe(5);

    // After 500ms timeout, sparkles should disappear
    vi.advanceTimersByTime(500);
    // Re-render to reflect state change from setTimeout callback
    rerender(<CheckAnimation checked={true} />);
    expect(container.querySelectorAll('.rounded-full').length).toBe(0);
  });

  it('초기 checked=true 렌더 시 sparkle 미표시', () => {
    const { container } = render(<CheckAnimation checked={true} />);
    const sparkles = container.querySelectorAll('.rounded-full');
    expect(sparkles.length).toBe(0);
  });

  it('커스텀 className 적용', () => {
    const { container } = render(
      <CheckAnimation checked={false} className="custom-class" />,
    );
    const span = container.firstElementChild as HTMLElement;
    expect(span.className).toContain('custom-class');
  });
});
