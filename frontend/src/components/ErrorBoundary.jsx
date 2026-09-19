import React from 'react';

/**
 * Global Error Boundary
 * Closes unhandled React UI crash scenarios by displaying an accessible, recoverable fallback screen
 * with role="alert" and a retry trigger.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary captured error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-screen" role="alert" aria-live="assertive" style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#0F172A',
          color: '#F8FAFC',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '1rem',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">⚠️</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: '#F8FAFC' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '0.95rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
              OnboardAI encountered an unexpected application error. You can try reloading the page or returning to the home screen.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Reload Application
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#CBD5E1',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
