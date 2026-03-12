'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-semibold text-text-primary mb-2">
              문제가 발생했습니다
            </p>
            <p className="text-sm text-text-secondary mb-4">
              앱을 새로고침 해주세요.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="rounded-xl bg-primary px-6 py-2.5 text-base font-medium text-text-primary hover:bg-primary-dark transition-colors"
            >
              새로고침
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
