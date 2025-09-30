import { NextResponse } from 'next/server'

export async function GET() {
  // This endpoint returns JavaScript that clears client-side caches
  const script = `
    // Clear all localStorage items related to stores
    localStorage.removeItem('currentStoreId');
    localStorage.removeItem('selectedOrganizationId');
    
    // Clear any cached store data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('store') || key.includes('organization'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Force reload without cache
    window.location.href = window.location.origin + '/dashboard?_t=' + Date.now();
  `;

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'text/javascript',
    },
  })
}