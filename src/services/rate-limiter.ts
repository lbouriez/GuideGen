/**
 * Rate Limiter Service
 * Throttles API calls to prevent rate limit errors
 */

import { injectable } from 'inversify';
import type { IRateLimiter } from '../interfaces/services/IProviderService.js';
import { RateLimitError } from '../errors/index.js';

interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

@injectable()
export class RateLimiter implements IRateLimiter {
  private queue: QueueItem<unknown>[] = [];
  private running = 0;
  private lastCallTime = 0;
  private maxConcurrent: number;
  private minDelayMs: number;

  constructor(maxConcurrent: number = 3, minDelayMs: number = 1000) {
    this.maxConcurrent = maxConcurrent;
    this.minDelayMs = minDelayMs;
  }

  /**
   * Throttle a function call
   */
  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      this.processQueue();
    });
  }

  /**
   * Set maximum concurrent requests
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
  }

  /**
   * Set minimum delay between requests
   */
  setMinDelay(delayMs: number): void {
    this.minDelayMs = delayMs;
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;

    if (timeSinceLastCall < this.minDelayMs) {
      setTimeout(() => this.processQueue(), this.minDelayMs - timeSinceLastCall);
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.running++;
    this.lastCallTime = Date.now();

    try {
      const result = await item.fn();
      item.resolve(result);
    } catch (error) {
      item.reject(error as Error);
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  /**
   * Clear the queue
   */
  clear(): void {
    const error = new RateLimitError('Queue cleared', 'unknown');
    for (const item of this.queue) {
      item.reject(error);
    }
    this.queue = [];
  }

  /**
   * Wait for all pending requests to complete
   */
  async drain(): Promise<void> {
    return new Promise<void>((resolve) => {
      const check = () => {
        if (this.queue.length === 0 && this.running === 0) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }
}

/**
 * Create a rate limiter with retry capability
 */
@injectable()
export class RateLimiterWithRetry extends RateLimiter {
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(
    maxConcurrent: number = 3,
    minDelayMs: number = 1000,
    maxRetries: number = 3,
    retryDelayMs: number = 2000
  ) {
    super(maxConcurrent, minDelayMs);
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
  }

  /**
   * Throttle with retry on rate limit errors
   */
  async throttleWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.throttle(fn);
      } catch (error) {
        lastError = error as Error;

        // Check if it's a rate limit error
        if (this.isRateLimitError(error)) {
          const retryAfter = this.extractRetryAfter(error);
          const delay = retryAfter || this.retryDelayMs * Math.pow(2, attempt);

          if (attempt < this.maxRetries) {
            await this.sleep(delay);
            continue;
          }
        }

        throw error;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: unknown): boolean {
    if (error instanceof RateLimitError) return true;

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('rate limit') ||
        message.includes('too many requests') ||
        message.includes('429')
      );
    }

    return false;
  }

  /**
   * Extract retry-after from error
   */
  private extractRetryAfter(error: unknown): number | null {
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000; // Convert to ms
    }

    // Try to extract from error message
    if (error instanceof Error) {
      const match = error.message.match(/retry.{0,10}(\d+)/i);
      if (match) {
        return parseInt(match[1], 10) * 1000;
      }
    }

    return null;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
