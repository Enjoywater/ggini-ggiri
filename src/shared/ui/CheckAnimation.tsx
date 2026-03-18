'use client';

import { useEffect, useState, useRef } from 'react';

interface CheckAnimationProps {
  checked: boolean;
  className?: string;
}

const SPARKLE_PARTICLES = [
  { tx: '-12px', ty: '-10px' },
  { tx: '10px', ty: '-12px' },
  { tx: '-8px', ty: '8px' },
  { tx: '12px', ty: '6px' },
  { tx: '0px', ty: '-14px' },
];

export function CheckAnimation({ checked, className = '' }: CheckAnimationProps) {
  const [showSparkles, setShowSparkles] = useState(false);
  const prevChecked = useRef(checked);

  useEffect(() => {
    if (checked && !prevChecked.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSparkles(true);
      const timer = setTimeout(() => setShowSparkles(false), 500);
      prevChecked.current = checked;
      return () => clearTimeout(timer);
    }
    prevChecked.current = checked;
  }, [checked]);

  return (
    <span className={`relative inline-flex items-center justify-center w-6 h-6 ${className}`} aria-hidden="true">
      {checked ? (
        <>
          {/* SVG Check mark with stroke drawing animation */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-5 h-5"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              className="fill-pastel-mint stroke-pastel-mint-dark"
              strokeWidth="1.5"
            />
            <path
              d="M8 12.5L10.5 15L16 9.5"
              className="stroke-text-primary"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 24,
                strokeDashoffset: 0,
                animation: 'stroke-draw 300ms ease-out reverse backwards',
              }}
            />
          </svg>
          {/* Sparkle particles */}
          {showSparkles && (
            <span className="absolute inset-0 pointer-events-none">
              {SPARKLE_PARTICLES.map((p, i) => (
                <span
                  key={i}
                  className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-pastel-mint-dark"
                  style={{
                    '--sparkle-tx': p.tx,
                    '--sparkle-ty': p.ty,
                    animation: `sparkle 400ms ease-out ${i * 30}ms forwards`,
                  } as React.CSSProperties}
                />
              ))}
            </span>
          )}
        </>
      ) : (
        /* Unchecked state - empty square */
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="4"
            className="stroke-border"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
      )}
    </span>
  );
}
