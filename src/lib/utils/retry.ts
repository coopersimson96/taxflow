/**
 * Retry Logic with Exponential Backoff
 *
 * Implements robust retry mechanisms for handling transient failures,
 * especially for Shopify API rate limits and network issues.
 *
 * Features:
 * - Exponential backoff with jitter
 * - Configurable retry attempts
 * - Respects Shopify rate limit headers
 * - Different strategies for different error types
 * - Circuit breaker pattern support
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number

  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number

  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number

  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number

  /** Add random jitter to prevent thundering herd (default: true) */
  jitter?: boolean

  /** Custom function to determine if error is retryable (default: auto-detect) */
  shouldRetry?: (error: Error, attempt: number) => boolean

  /** Callback for retry attempts */
  onRetry?: (error: Error, attempt: number, delayMs: number) => void
}

export interface ShopifyRateLimitInfo {
  /** Whether the request was rate limited */
  isRateLimited: boolean

  /** Seconds to wait before retrying (from Retry-After header) */
  retryAfter?: number

  /** Current API call limit */
  callLimit?: number

  /** Remaining API calls */
  callsRemaining?: number
}

/**
 * Parse Shopify rate limit headers from response
 */
export function parseShopifyRateLimitHeaders(headers: Headers): ShopifyRateLimitInfo {
  const retryAfter = headers.get('Retry-After')
  const apiCallLimit = headers.get('X-Shopify-Shop-Api-Call-Limit')

  // Parse X-Shopify-Shop-Api-Call-Limit header (format: "32/40")
  let callLimit: number | undefined
  let callsRemaining: number | undefined

  if (apiCallLimit) {
    const [current, max] = apiCallLimit.split('/').map(Number)
    callLimit = max
    callsRemaining = max - current
  }

  return {
    isRateLimited: !!retryAfter || callsRemaining === 0,
    retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
    callLimit,
    callsRemaining
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase()

  // Network errors
  if (message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('enotfound') ||
      message.includes('fetch failed')) {
    return true
  }

  // Rate limit errors
  if (message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('too many requests')) {
    return true
  }

  // Server errors (5xx)
  if (message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')) {
    return true
  }

  // Shopify-specific errors
  if (message.includes('throttled')) {
    return true
  }

  // Don't retry client errors (4xx except 429)
  if (message.includes('400') ||
      message.includes('401') ||
      message.includes('403') ||
      message.includes('404')) {
    return false
  }

  // Default: retry unknown errors
  return true
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  options: Required<Pick<RetryOptions, 'initialDelay' | 'maxDelay' | 'backoffMultiplier' | 'jitter'>>
): number {
  // Exponential backoff: delay = initialDelay * (backoffMultiplier ^ attempt)
  const exponentialDelay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt)

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, options.maxDelay)

  // Add jitter to prevent thundering herd problem
  if (options.jitter) {
    // Random jitter between 0% and 25% of the delay
    const jitterAmount = cappedDelay * 0.25 * Math.random()
    return cappedDelay + jitterAmount
  }

  return cappedDelay
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => fetchShopifyData(shop, token),
 *   {
 *     maxRetries: 5,
 *     initialDelay: 1000,
 *     onRetry: (err, attempt, delay) => {
 *       console.log(`Retry attempt ${attempt} after ${delay}ms: ${err.message}`)
 *     }
 *   }
 * )
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    jitter = true,
    shouldRetry = isRetryableError,
    onRetry
  } = options

  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Attempt the operation
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry if we've exhausted attempts
      if (attempt === maxRetries) {
        break
      }

      // Check if error is retryable
      if (!shouldRetry(lastError, attempt)) {
        throw lastError
      }

      // Calculate delay
      const delay = calculateBackoffDelay(attempt, {
        initialDelay,
        maxDelay,
        backoffMultiplier,
        jitter
      })

      // Notify retry callback
      if (onRetry) {
        onRetry(lastError, attempt + 1, delay)
      }

      // Wait before retrying
      await sleep(delay)
    }
  }

  // All retries exhausted
  throw new Error(
    `Operation failed after ${maxRetries + 1} attempts. Last error: ${lastError!.message}`
  )
}

/**
 * Retry fetch request with Shopify-specific rate limit handling
 */
export async function retryShopifyRequest<T>(
  fn: () => Promise<Response>,
  options: RetryOptions = {}
): Promise<Response> {
  return retryWithBackoff(
    async () => {
      const response = await fn()

      // Check for rate limiting
      const rateLimitInfo = parseShopifyRateLimitHeaders(response.headers)

      if (response.status === 429 || rateLimitInfo.isRateLimited) {
        // Use Retry-After header if available, otherwise use exponential backoff
        const retryAfterMs = (rateLimitInfo.retryAfter || 2) * 1000

        throw new Error(
          `Shopify rate limit exceeded. Retry after ${rateLimitInfo.retryAfter || 2}s. ` +
          `Calls remaining: ${rateLimitInfo.callsRemaining}/${rateLimitInfo.callLimit}`
        )
      }

      // Check for other errors
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Shopify API error: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      return response
    },
    {
      maxRetries: 5, // More retries for Shopify (rate limits are common)
      initialDelay: 2000, // Start with 2s
      maxDelay: 60000, // Cap at 60s
      ...options
    }
  )
}

/**
 * Batch requests with rate limit awareness
 * Processes items in batches with delay between batches
 */
export async function batchWithRateLimit<TInput, TOutput>(
  items: TInput[],
  processFn: (item: TInput) => Promise<TOutput>,
  options: {
    batchSize?: number
    delayBetweenBatches?: number
    onProgress?: (completed: number, total: number) => void
  } = {}
): Promise<TOutput[]> {
  const {
    batchSize = 10,
    delayBetweenBatches = 1000,
    onProgress
  } = options

  const results: TOutput[] = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(item =>
        retryWithBackoff(() => processFn(item), {
          maxRetries: 3,
          initialDelay: 1000
        })
      )
    )

    results.push(...batchResults)

    // Report progress
    if (onProgress) {
      onProgress(results.length, items.length)
    }

    // Delay between batches (except for last batch)
    if (i + batchSize < items.length) {
      await sleep(delayBetweenBatches)
    }
  }

  return results
}

/**
 * Circuit breaker implementation
 * Stops attempting requests after too many failures
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime?: number
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      const now = Date.now()
      const timeSinceFailure = this.lastFailureTime ? now - this.lastFailureTime : 0

      if (timeSinceFailure < this.timeout) {
        throw new Error(
          `Circuit breaker is open. Too many failures. Retry in ${
            Math.ceil((this.timeout - timeSinceFailure) / 1000)
          }s`
        )
      }

      // Try half-open state
      this.state = 'half-open'
    }

    try {
      const result = await fn()

      // Success - reset circuit
      this.failures = 0
      this.state = 'closed'

      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()

      // Open circuit if threshold exceeded
      if (this.failures >= this.threshold) {
        this.state = 'open'
      }

      throw error
    }
  }

  reset(): void {
    this.failures = 0
    this.state = 'closed'
    this.lastFailureTime = undefined
  }

  getState(): { state: string; failures: number } {
    return {
      state: this.state,
      failures: this.failures
    }
  }
}
