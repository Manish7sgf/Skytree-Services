import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}>
          <h2 style={{ marginBottom: '1rem' }}>Something went wrong</h2>
          <p style={{ marginBottom: '1rem', fontSize: '14px' }}>
            {this.state.error?.message}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            style={{ cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
