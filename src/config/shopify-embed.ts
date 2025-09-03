/**
 * Shopify Embedded App Configuration
 * These settings control how the app behaves when embedded in Shopify Admin
 */

export const EMBEDDED_APP_CONFIG = {
  // Navigation items that appear in Shopify Admin
  navigation: {
    main: [
      {
        label: 'Dashboard',
        destination: '/dashboard',
        icon: 'AnalyticsMajor'
      },
      {
        label: 'Settings',
        destination: '/settings',
        icon: 'SettingsMajor'
      }
    ]
  },

  // App Bridge configuration
  appBridge: {
    // Features to enable
    features: {
      contextualSaveBar: true,
      loading: true,
      modal: true,
      resourcePicker: false,
      toast: true,
      titleBar: true
    },
    
    // Title bar configuration
    titleBar: {
      breadcrumbs: true
    }
  },

  // Route configuration for embedded mode
  routes: {
    // Routes that should open in embedded mode
    embedded: [
      '/dashboard',
      '/settings',
      '/connect',
      '/auth/signin'
    ],
    
    // Routes that should always open in new tab
    external: [
      '/api/*',
      '/terms',
      '/privacy'
    ],
    
    // Default route when app opens in admin
    defaultRoute: '/dashboard'
  },

  // Session handling
  session: {
    // Session token refresh interval (ms)
    refreshInterval: 55 * 60 * 1000, // 55 minutes
    
    // Token validation settings
    validation: {
      clockTolerance: 5, // seconds
      requiredClaims: ['iss', 'dest', 'aud', 'sub', 'exp', 'nbf', 'iat']
    }
  },

  // CORS settings for embedded requests
  cors: {
    allowedOrigins: [
      'https://*.myshopify.com',
      'https://*.shopify.com',
      'https://*.shopifypreview.com'
    ],
    
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Shopify-Access-Token',
      'X-Shopify-Embedded',
      'X-Requested-With'
    ],
    
    credentials: true
  },

  // Analytics and monitoring
  analytics: {
    // Track embedded vs standalone usage
    trackEmbeddedUsage: true,
    
    // Events to track
    events: {
      appLoaded: 'embedded_app_loaded',
      navigationClick: 'embedded_navigation_click',
      sessionRefresh: 'embedded_session_refresh'
    }
  },

  // Error handling
  errors: {
    // Show errors in Shopify Admin toast
    showToast: true,
    
    // Redirect to error page for critical errors
    criticalErrorRoute: '/auth/error'
  }
}

/**
 * Helper to check if a route should be embedded
 */
export function shouldEmbedRoute(pathname: string): boolean {
  return EMBEDDED_APP_CONFIG.routes.embedded.some(route => {
    if (route.includes('*')) {
      const prefix = route.replace('*', '')
      return pathname.startsWith(prefix)
    }
    return pathname === route
  })
}

/**
 * Helper to check if a route is external
 */
export function isExternalRoute(pathname: string): boolean {
  return EMBEDDED_APP_CONFIG.routes.external.some(route => {
    if (route.includes('*')) {
      const prefix = route.replace('*', '')
      return pathname.startsWith(prefix)
    }
    return pathname === route
  })
}

/**
 * Get CORS headers for embedded requests
 */
export function getEmbeddedCorsHeaders(origin: string | null): HeadersInit {
  const headers: HeadersInit = {
    'X-Frame-Options': 'ALLOWALL' // Required for embedding
  }

  if (origin && EMBEDDED_APP_CONFIG.cors.allowedOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace('*', '.*')
      return new RegExp(pattern).test(origin)
    }
    return origin === allowed
  })) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
    headers['Access-Control-Allow-Methods'] = EMBEDDED_APP_CONFIG.cors.allowedMethods.join(', ')
    headers['Access-Control-Allow-Headers'] = EMBEDDED_APP_CONFIG.cors.allowedHeaders.join(', ')
  }

  return headers
}