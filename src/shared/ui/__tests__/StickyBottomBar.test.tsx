import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StickyBottomBar } from '../StickyBottomBar';

describe('StickyBottomBar', () => {
  it('renders children when show is true', () => {
    render(
      <StickyBottomBar show={true}>
        <button>확인</button>
      </StickyBottomBar>,
    );
    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument();
  });

  it('returns null when show is false', () => {
    const { container } = render(
      <StickyBottomBar show={false}>
        <button>확인</button>
      </StickyBottomBar>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('has fixed positioning', () => {
    const { container } = render(
      <StickyBottomBar show={true}>
        <span>content</span>
      </StickyBottomBar>,
    );
    const bar = container.firstElementChild!;
    expect(bar.className).toContain('fixed');
    expect(bar.className).toContain('bottom-0');
  });

  it('applies safe-area padding via inline style', () => {
    const { container } = render(
      <StickyBottomBar show={true}>
        <span>content</span>
      </StickyBottomBar>,
    );
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.style.paddingBottom).toContain('safe-area-inset-bottom');
  });

  it('has backdrop-blur class', () => {
    const { container } = render(
      <StickyBottomBar show={true}>
        <span>content</span>
      </StickyBottomBar>,
    );
    const bar = container.firstElementChild!;
    expect(bar.className).toContain('backdrop-blur-md');
  });
});
