'use client'

export default function TestPage() {
  console.log('🔍 TEST PAGE: Component is executing')
  
  return (
    <div className="p-8">
      <script dangerouslySetInnerHTML={{
        __html: `console.log('🔍 TEST PAGE: Inline script executing');`
      }} />
      <h1 className="text-2xl font-bold text-black">Test Page</h1>
      <p className="text-black">This is a minimal test page to check if React is working.</p>
      <button 
        onClick={() => {
          console.log('🔍 TEST PAGE: Button clicked')
          alert('Button works!')
        }}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Test Button
      </button>
    </div>
  )
}