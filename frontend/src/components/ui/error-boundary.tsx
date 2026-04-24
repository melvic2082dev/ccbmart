'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Fallback =
  | ReactNode
  | ((props: { error: Error; reset: () => void }) => ReactNode);

interface Props {
  children: ReactNode;
  fallback?: Fallback;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { fallback } = this.props;
    if (typeof fallback === 'function') return fallback({ error, reset: this.reset });
    if (fallback !== undefined) return fallback;
    return <DefaultFallback error={error} reset={this.reset} />;
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div
      role="alert"
      className="m-4 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
    >
      <p className="font-semibold mb-1">Đã xảy ra lỗi hiển thị</p>
      <p className="text-sm mb-3 break-words">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="text-sm px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700"
      >
        Thử lại
      </button>
    </div>
  );
}
