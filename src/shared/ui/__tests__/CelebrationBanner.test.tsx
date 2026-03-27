import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CelebrationBanner } from '../CelebrationBanner';

describe('CelebrationBanner', () => {
  it('show=true 일 때 배너를 렌더링한다', () => {
    const { container } = render(<CelebrationBanner show={true} />);
    const banner = container.firstElementChild as HTMLElement;
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('모든 송금이 완료되었습니다!');
    expect(banner.textContent).toContain('수고하셨습니다');
  });

  it('show=false 일 때 아무것도 렌더링하지 않는다', () => {
    const { container } = render(<CelebrationBanner show={false} />);
    expect(container.firstElementChild).toBeNull();
  });

  it('role="status" 접근성 속성이 적용된다', () => {
    const { container } = render(<CelebrationBanner show={true} />);
    const banner = container.querySelector('[role="status"]');
    expect(banner).toBeTruthy();
    expect(banner?.getAttribute('aria-label')).toBe('모든 송금 완료');
  });

  it('CheckAnimation 체크마크가 포함된다', () => {
    const { container } = render(<CelebrationBanner show={true} />);
    // CheckAnimation renders an SVG with a circle when checked=true
    const circle = container.querySelector('circle');
    expect(circle).toBeTruthy();
  });

  it('celebration-in 애니메이션 클래스가 적용된다', () => {
    const { container } = render(<CelebrationBanner show={true} />);
    const banner = container.firstElementChild as HTMLElement;
    expect(banner.className).toContain('animate-[celebration-in_500ms_ease-out_both]');
  });
});
