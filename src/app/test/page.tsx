export default function TestPage() {
  return (
    <div style={{ padding: '32px', color: 'black', backgroundColor: 'white' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>SIMPLE TEST PAGE</h1>
      <p style={{ marginBottom: '16px' }}>If you can see this text, Next.js static rendering is working.</p>
      <div style={{ padding: '8px', backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}>
        This is a test div with inline styles to ensure visibility.
      </div>
    </div>
  )
}