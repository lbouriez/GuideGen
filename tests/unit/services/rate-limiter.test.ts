/**
 * Rate Limiter Tests
 * Tests for RateLimiter and RateLimiterWithRetry services
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'reflect-metadata';
import { RateLimiter, RateLimiterWithRetry } from '../../../src/services/rate-limiter.js';
import { RateLimitError } from '../../../src/errors/index.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(3, 100); // 3 concurrent, 100ms delay
  });

  describe('constructor', () => {
    it('should create with default values', () => {
      const defaultLimiter = new RateLimiter();
      expect(defaultLimiter.getQueueSize()).toBe(0);
    });

    it('should create with custom values', () => {
      const customLimiter = new RateLimiter(5, 500);
      expect(customLimiter.getQueueSize()).toBe(0);
    });
  });

  describe('throttle', () => {
    it('should execute function and return result', async () => {
      const result = await limiter.throttle(async () => 'test');
      expect(result).toBe('test');
    });

    it('should execute async function', async () => {
      const result = await limiter.throttle(async () => {
        await new Promise((r) => setTimeout(r, 10));
        return 42;
      });
      expect(result).toBe(42);
    });

    it('should propagate errors', async () => {
      await expect(
        limiter.throttle(async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });

    it('should execute multiple requests', async () => {
      const results = await Promise.all([
        limiter.throttle(async () => 1),
        limiter.throttle(async () => 2),
        limiter.throttle(async () => 3),
      ]);
      expect(results).toEqual([1, 2, 3]);
    });

    it('should respect concurrency limit', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      const track = async (delay: number, value: number) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((r) => setTimeout(r, delay));
        concurrent--;
        return value;
      };

      // Queue more requests than max concurrent
      const limitedLimiter = new RateLimiter(2, 10);
      await Promise.all([
        limitedLimiter.throttle(() => track(50, 1)),
        limitedLimiter.throttle(() => track(50, 2)),
        limitedLimiter.throttle(() => track(50, 3)),
        limitedLimiter.throttle(() => track(50, 4)),
      ]);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should handle different return types', async () => {
      const stringResult = await limiter.throttle(async () => 'string');
      expect(stringResult).toBe('string');

      const numberResult = await limiter.throttle(async () => 123);
      expect(numberResult).toBe(123);

      const objectResult = await limiter.throttle(async () => ({ key: 'value' }));
      expect(objectResult).toEqual({ key: 'value' });

      const arrayResult = await limiter.throttle(async () => [1, 2, 3]);
      expect(arrayResult).toEqual([1, 2, 3]);
    });
  });

  describe('setMaxConcurrent', () => {
    it('should update max concurrent setting', async () => {
      limiter.setMaxConcurrent(1);

      let concurrent = 0;
      let maxConcurrent = 0;

      const track = async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((r) => setTimeout(r, 20));
        concurrent--;
      };

      await Promise.all([
        limiter.throttle(track),
        limiter.throttle(track),
        limiter.throttle(track),
      ]);

      expect(maxConcurrent).toBe(1);
    });
  });

  describe('setMinDelay', () => {
    it('should update min delay setting', async () => {
      limiter.setMinDelay(200);

      const times: number[] = [];
      const track = async () => {
        times.push(Date.now());
      };

      await limiter.throttle(track);
      await limiter.throttle(track);

      const diff = times[1] - times[0];
      expect(diff).toBeGreaterThanOrEqual(180); // Allow some variance
    });
  });

  describe('getQueueSize', () => {
    it('should return current queue size', () => {
      expect(limiter.getQueueSize()).toBe(0);
    });
  });

  describe('clear', () => {
    it('should reject all queued items', async () => {
      // Create a slow limiter
      const slowLimiter = new RateLimiter(1, 1000);

      // Start a long-running task
      const first = slowLimiter.throttle(async () => {
        await new Promise((r) => setTimeout(r, 500));
        return 'first';
      });

      // Queue more tasks
      const second = slowLimiter.throttle(async () => 'second');
      const third = slowLimiter.throttle(async () => 'third');

      // Wait a bit then clear
      await new Promise((r) => setTimeout(r, 50));
      slowLimiter.clear();

      // Second and third should be rejected
      await expect(second).rejects.toThrow('Queue cleared');
      await expect(third).rejects.toThrow('Queue cleared');

      // First should complete (already running)
      await expect(first).resolves.toBe('first');
    });
  });

  describe('drain', () => {
    it('should wait for all requests to complete', async () => {
      const results: number[] = [];

      // Start some tasks
      limiter.throttle(async () => {
        await new Promise((r) => setTimeout(r, 50));
        results.push(1);
      });
      limiter.throttle(async () => {
        await new Promise((r) => setTimeout(r, 30));
        results.push(2);
      });

      expect(results.length).toBeLessThan(2);

      await limiter.drain();
      expect(results.length).toBe(2);
    });

    it('should resolve immediately when empty', async () => {
      const start = Date.now();
      await limiter.drain();
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(200);
    });
  });
});

describe('RateLimiterWithRetry', () => {
  let limiter: RateLimiterWithRetry;

  beforeEach(() => {
    limiter = new RateLimiterWithRetry(3, 10, 3, 50); // Fast settings for tests
  });

  describe('constructor', () => {
    it('should create with default values', () => {
      const defaultLimiter = new RateLimiterWithRetry();
      expect(defaultLimiter.getQueueSize()).toBe(0);
    });

    it('should create with custom values', () => {
      const customLimiter = new RateLimiterWithRetry(5, 500, 5, 1000);
      expect(customLimiter.getQueueSize()).toBe(0);
    });
  });

  describe('throttleWithRetry', () => {
    it('should succeed on first try', async () => {
      const result = await limiter.throttleWithRetry(async () => 'success');
      expect(result).toBe('success');
    });

    it('should retry on RateLimitError', async () => {
      let attempts = 0;

      const result = await limiter.throttleWithRetry(async () => {
        attempts++;
        if (attempts < 3) {
          throw new RateLimitError('Rate limited', 'test');
        }
        return 'success';
      });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should retry on rate limit message', async () => {
      let attempts = 0;

      const result = await limiter.throttleWithRetry(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Too many requests');
        }
        return 'success';
      });

      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('should retry on 429 error', async () => {
      let attempts = 0;

      const result = await limiter.throttleWithRetry(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Error 429: Rate limit exceeded');
        }
        return 'success';
      });

      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('should throw after max retries', async () => {
      let attempts = 0;

      await expect(
        limiter.throttleWithRetry(async () => {
          attempts++;
          throw new RateLimitError('Rate limited', 'test');
        })
      ).rejects.toThrow(RateLimitError);

      expect(attempts).toBe(4); // 1 initial + 3 retries
    });

    it('should not retry non-rate-limit errors', async () => {
      let attempts = 0;

      await expect(
        limiter.throttleWithRetry(async () => {
          attempts++;
          throw new Error('Some other error');
        })
      ).rejects.toThrow('Some other error');

      expect(attempts).toBe(1);
    });

    it('should use retryAfter from RateLimitError', async () => {
      const fastLimiter = new RateLimiterWithRetry(3, 1, 3, 10);
      let attempts = 0;
      const times: number[] = [];

      const result = await fastLimiter.throttleWithRetry(async () => {
        times.push(Date.now());
        attempts++;
        if (attempts < 2) {
          // Small retry delay for testing
          throw new RateLimitError('Rate limited', 'test', 0.05); // 50ms
        }
        return 'success';
      });

      expect(result).toBe('success');
      expect(attempts).toBe(2);

      // Check that we waited approximately the retry delay
      if (times.length >= 2) {
        const delay = times[1] - times[0];
        expect(delay).toBeGreaterThanOrEqual(40); // Allow variance
      }
    });

    it('should extract retry time from error message', async () => {
      // Use RateLimitError which has retryAfter properly handled
      const fastLimiter = new RateLimiterWithRetry(3, 1, 3, 10);
      let attempts = 0;

      const result = await fastLimiter.throttleWithRetry(async () => {
        attempts++;
        if (attempts < 2) {
          // Use integer seconds (1 second = 1000ms delay)
          throw new Error('Rate limited, retry after 1 seconds');
        }
        return 'success';
      });

      expect(result).toBe('success');
      expect(attempts).toBe(2);
    }, 10000); // Increase timeout for this specific test

    it('should use exponential backoff', async () => {
      const fastLimiter = new RateLimiterWithRetry(3, 1, 3, 20);
      let attempts = 0;
      const times: number[] = [];

      try {
        await fastLimiter.throttleWithRetry(async () => {
          times.push(Date.now());
          attempts++;
          throw new RateLimitError('Rate limited', 'test');
        });
      } catch {
        // Expected to throw
      }

      // Check increasing delays
      expect(attempts).toBe(4);
      if (times.length >= 3) {
        const delay1 = times[1] - times[0];
        const delay2 = times[2] - times[1];
        expect(delay2).toBeGreaterThanOrEqual(delay1 * 1.5); // Exponential
      }
    });
  });
});
