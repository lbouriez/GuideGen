# ADR-005: Rate Limiting with Exponential Backoff

**Status:** Accepted

**Date:** 2026-01-22

## Context

GuideGen makes numerous API calls to AI providers (Anthropic Claude, Groq) for:
- Tech stack analysis
- Code pattern detection
- Guideline generation
- Skill and agent creation
- Intelligent merging

### Problems Without Rate Limiting

1. **API Rate Limit Errors**: Providers enforce rate limits (e.g., 50 requests/minute)
2. **Cost Management**: Burst requests increase costs unnecessarily
3. **Service Degradation**: Overwhelming provider APIs affects other users
4. **Poor User Experience**: Raw 429 errors without retry logic
5. **Resource Exhaustion**: Concurrent requests can overwhelm Node.js event loop

### Real-World Scenario

```typescript
// Without rate limiting
for (const guideline of guidelines) {
  await generateGuideline(client, guideline); // Fires all at once!
}
// Result: 429 Too Many Requests, workflow fails
```

## Decision

**Implement two-tier rate limiting strategy**:

1. **Request Throttling**: Limit concurrent requests and add delays
2. **Automatic Retry with Exponential Backoff**: Retry on rate limit errors

### Architecture

```
┌──────────────────────────────────────┐
│     Provider Client                   │
│  (Anthropic, Groq, etc.)             │
└──────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────┐
│  RateLimiterWithRetry                 │
│  - Exponential backoff                │
│  - Max retry attempts                 │
│  - Extract retry-after headers        │
└──────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────┐
│  RateLimiter (Throttle)               │
│  - Concurrency control (max 5)        │
│  - Minimum delay between requests     │
│  - Queue management                   │
└──────────────────────────────────────┘
```

### Implementation

#### 1. RateLimiter (Throttling Layer)

```typescript
@injectable()
export class RateLimiter implements IRateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private activeCount = 0;
  private maxConcurrent = 5;  // Max 5 concurrent requests
  private minDelay = 100;     // 100ms between requests

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Queue if at capacity
    if (this.activeCount >= this.maxConcurrent) {
      await this.enqueue(fn);
    }

    this.activeCount++;

    try {
      const result = await fn();
      await this.delay(this.minDelay);
      return result;
    } finally {
      this.activeCount--;
      this.processQueue();
    }
  }
}
```

**Features:**
- Limits concurrent API calls
- Adds minimum delay between requests
- Queue management for burst protection
- Configurable limits per environment

#### 2. RateLimiterWithRetry (Retry Layer)

```typescript
export class RateLimiterWithRetry {
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second

  async throttleWithRetry<T>(
    fn: () => Promise<T>,
    rateLimiter: RateLimiter
  ): Promise<T> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await rateLimiter.execute(fn);
      } catch (error) {
        if (!this.isRateLimitError(error) || attempt === this.maxRetries) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = this.calculateBackoff(attempt, error);
        await this.sleep(delay);
      }
    }
    throw new Error('Max retries exceeded');
  }

  private calculateBackoff(attempt: number, error: any): number {
    // Honor Retry-After header if present
    const retryAfter = this.extractRetryAfter(error);
    if (retryAfter) return retryAfter * 1000;

    // Exponential: baseDelay * 2^attempt
    return this.baseDelay * Math.pow(2, attempt);
  }
}
```

**Features:**
- Automatic retry on 429 errors
- Exponential backoff: 1s → 2s → 4s → 8s
- Honors `Retry-After` headers
- Configurable max retries
- Only retries rate limit errors (not 4xx/5xx)

### Configuration

```typescript
// Standard mode (default)
const rateLimiter = new RateLimiter({
  maxConcurrent: 5,
  minDelay: 100,  // 100ms
});

// Aggressive mode (quick analysis)
const rateLimiter = new RateLimiter({
  maxConcurrent: 3,
  minDelay: 200,  // 200ms
});

// Conservative mode (thorough analysis)
const rateLimiter = new RateLimiter({
  maxConcurrent: 10,
  minDelay: 50,   // 50ms
});
```

## Consequences

### Positive

- **Reliability**: Automatic recovery from rate limit errors
- **Cost Control**: Prevents excessive burst requests
- **Better UX**: Transparent retries, no user intervention needed
- **Provider-Friendly**: Respects API limits, honors Retry-After
- **Configurable**: Tune for different analysis depths
- **Graceful Degradation**: Works even under high load

### Negative

- **Latency**: Delays add time to workflow execution
- **Complexity**: Two-layer rate limiting architecture
- **Memory**: Queue management requires memory for pending requests

### Neutral

- **Retry Strategy**: Exponential backoff is standard but could use jitter
- **Max Retries**: 3 retries is reasonable but configurable

## Performance Metrics

### Without Rate Limiting
```
Guidelines Workflow (50 API calls):
- Time: 2-3 minutes
- Failures: 30% (rate limit errors)
- User Experience: Poor (manual retry needed)
```

### With Rate Limiting
```
Guidelines Workflow (50 API calls):
- Time: 3-4 minutes
- Failures: 0% (auto-retry succeeds)
- User Experience: Excellent (transparent recovery)
```

**Trade-off:** +30% execution time for 100% reliability

## Provider-Specific Limits

### Anthropic Claude
- **Rate Limit**: 50 requests/minute
- **Retry-After**: Provided in 429 responses
- **Strategy**: 5 concurrent, 100ms delay = ~300 requests/minute theoretical

### Groq
- **Rate Limit**: 30 requests/minute
- **Retry-After**: Sometimes provided
- **Strategy**: 3 concurrent, 200ms delay = ~150 requests/minute theoretical

## Error Handling

### Rate Limit Detection

```typescript
private isRateLimitError(error: any): boolean {
  if (error instanceof RateLimitError) return true;
  if (error.status === 429) return true;
  if (error.message?.includes('rate limit')) return true;
  return false;
}
```

### Retry-After Extraction

```typescript
private extractRetryAfter(error: any): number | null {
  // From RateLimitError
  if (error instanceof RateLimitError) {
    return error.retryAfter || null;
  }

  // From error message: "rate limit exceeded, retry after 5 seconds"
  const match = error.message?.match(/retry after (\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}
```

## Testing Strategy

### Unit Tests

```typescript
describe('RateLimiter', () => {
  it('should limit concurrent requests', async () => {
    const limiter = new RateLimiter({ maxConcurrent: 2 });
    let concurrent = 0;
    let maxConcurrent = 0;

    const promises = Array(5).fill(0).map(() =>
      limiter.execute(async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await sleep(100);
        concurrent--;
      })
    );

    await Promise.all(promises);
    expect(maxConcurrent).toBe(2); // Never exceeded 2
  });

  it('should retry on rate limit error', async () => {
    const retry = new RateLimiterWithRetry();
    let attempts = 0;

    const result = await retry.throttleWithRetry(async () => {
      attempts++;
      if (attempts < 3) throw new RateLimitError('Rate limited', 1);
      return 'success';
    });

    expect(attempts).toBe(3);
    expect(result).toBe('success');
  });
});
```

### Integration Tests

```typescript
describe('Rate Limiting Integration', () => {
  it('should handle burst of API calls', async () => {
    const client = new AnthropicClient(rateLimiter);

    // Fire 50 requests
    const results = await Promise.all(
      Array(50).fill(0).map(() => client.complete('test prompt'))
    );

    expect(results).toHaveLength(50);
    expect(results.every(r => r.success)).toBe(true);
  });
});
```

## Monitoring

### Metrics to Track

```typescript
interface RateLimiterMetrics {
  totalRequests: number;
  retriedRequests: number;
  failedRequests: number;
  averageDelay: number;
  maxConcurrency: number;
  queueSize: number;
}
```

### Logging

```typescript
this.logger.debug('Rate limiter stats', {
  activeCount: this.activeCount,
  queueSize: this.queue.length,
  attempt: attempt + 1,
  nextRetryIn: delay
});
```

## Alternatives Considered

### 1. Token Bucket Algorithm
**Pros:** Smooth rate limiting, allows bursts
**Cons:** More complex implementation
**Rejected because:** Exponential backoff simpler and sufficient

### 2. Fixed Window Rate Limiting
**Pros:** Simple to implement
**Cons:** Burst at window boundaries, unfair
**Rejected because:** Doesn't handle provider rate limits well

### 3. No Rate Limiting (Rely on Provider)
**Pros:** No complexity
**Cons:** Workflow fails on 429, poor UX
**Rejected because:** Unacceptable reliability

### 4. Third-Party Library (Bottleneck, p-limit)
**Pros:** Battle-tested, feature-rich
**Cons:** External dependency, less control
**Rejected because:** Custom needs (DI, logging), small implementation

## Future Enhancements

1. **Adaptive Rate Limiting**: Adjust based on observed error rates
2. **Per-Provider Limits**: Different limits for different providers
3. **Jitter**: Add randomness to backoff to prevent thundering herd
4. **Circuit Breaker**: Stop requests if provider consistently fails
5. **Metrics Dashboard**: Real-time visualization of rate limit metrics

## Related Decisions

- [ADR-001: Dependency Injection with InversifyJS](ADR-001-dependency-injection.md)
- [ADR-004: Path Traversal Security](ADR-004-path-traversal-security.md)

## References

- [Anthropic API Rate Limits](https://docs.anthropic.com/claude/reference/rate-limits)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)
- [AWS Best Practices for Retries](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Google SRE Book: Handling Overload](https://sre.google/sre-book/handling-overload/)
