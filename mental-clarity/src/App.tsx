

function App() {
  return (
    <div className="bg-dot-grid" style={{ minHeight: '100vh', padding: 'var(--space-screen-edge)' }}>
      <h1>Mental Clarity</h1>
      <p>Foundation established.</p>

      <div style={{ display: 'flex', gap: 'var(--space-small)', marginTop: 'var(--space-large)' }}>
        <button style={{
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: 'var(--radius-pill)',
          cursor: 'pointer',
          fontWeight: 500
        }}>
          Primary Button
        </button>

        <button style={{
          backgroundColor: 'transparent',
          color: 'var(--color-text-secondary)',
          border: '1px solid var(--color-border)',
          padding: '12px 24px',
          borderRadius: 'var(--radius-pill)',
          cursor: 'pointer',
          fontWeight: 500
        }}>
          Secondary Button
        </button>
      </div>

      <div style={{ marginTop: 'var(--space-xl)' }}>
        <h2 style={{ marginBottom: 'var(--space-medium)' }}>Design Tokens Test</h2>
        <div style={{ display: 'flex', gap: 'var(--space-medium)', flexWrap: 'wrap' }}>
          <div style={{ width: 100, height: 100, background: 'var(--gradient-organic)', borderRadius: 'var(--radius-medium)' }} />
          <div style={{ width: 100, height: 100, background: 'var(--gradient-technical)', borderRadius: 'var(--radius-medium)' }} />
          <div style={{ width: 100, height: 100, background: 'var(--gradient-creative)', borderRadius: 'var(--radius-medium)' }} />
        </div>
      </div>
    </div>
  );
}

export default App;
