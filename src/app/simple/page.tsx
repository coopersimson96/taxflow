export default function SimplePage() {
  return (
    <html>
      <head>
        <title>Simple Test</title>
      </head>
      <body style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: 'blue' }}>Simple Page Without Any Dependencies</h1>
        <p>This page bypasses all providers, authentication, and complex dependencies.</p>
        
        <script dangerouslySetInnerHTML={{
          __html: `
            console.log('🔍 SIMPLE PAGE: Basic script executing');
            document.addEventListener('DOMContentLoaded', function() {
              console.log('🔍 SIMPLE PAGE: DOM loaded');
              const button = document.getElementById('testBtn');
              if (button) {
                button.onclick = function() {
                  console.log('🔍 SIMPLE PAGE: Button clicked');
                  alert('JavaScript is working!');
                };
              }
            });
          `
        }} />
        
        <button 
          id="testBtn"
          style={{ 
            padding: '10px 20px', 
            backgroundColor: 'green', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Test JavaScript
        </button>
      </body>
    </html>
  )
}