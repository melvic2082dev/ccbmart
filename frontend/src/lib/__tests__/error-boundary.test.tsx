import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '@/components/ui/error-boundary';

function Bomb({ msg }: { msg: string }) {
  throw new Error(msg);
}

describe('ErrorBoundary', () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  afterAll(() => spy.mockRestore());

  it('renders children when no error', () => {
    render(<ErrorBoundary>ok</ErrorBoundary>);
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('renders default fallback with error message', () => {
    render(
      <ErrorBoundary>
        <Bomb msg="boom" />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
  });

  it('calls onError and renders custom fallback', async () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary
        onError={onError}
        fallback={({ error, reset }) => (
          <div>
            <span>custom: {error.message}</span>
            <button onClick={reset}>reset</button>
          </div>
        )}
      >
        <Bomb msg="bang" />
      </ErrorBoundary>
    );
    expect(screen.getByText('custom: bang')).toBeInTheDocument();
    expect(onError).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'reset' }));
  });
});
