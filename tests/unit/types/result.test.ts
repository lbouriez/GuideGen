/**
 * Unit tests for Result<T,E> type helpers
 * Tests all result type operations including creation, transformation, and combination
 */

import { describe, it, expect } from 'vitest';
import {
  Ok,
  Err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  mapResult,
  mapError,
  asyncResult,
  combineResults,
  type Result,
} from '@/types/result';

describe('Result Type Helpers', () => {
  describe('Ok()', () => {
    it('should create a successful result with a value', () => {
      const result = Ok(42);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it('should create a successful result with string value', () => {
      const result = Ok('success');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('success');
      }
    });

    it('should create a successful result with object value', () => {
      const obj = { name: 'test', value: 100 };
      const result = Ok(obj);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(obj);
      }
    });

    it('should create a successful result with null value', () => {
      const result = Ok(null);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(null);
      }
    });
  });

  describe('Err()', () => {
    it('should create a failed result with an error', () => {
      const error = new Error('Something went wrong');
      const result = Err(error);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(error);
      }
    });

    it('should create a failed result with string error', () => {
      const result = Err('error message');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('error message');
      }
    });

    it('should create a failed result with custom error object', () => {
      const customError = { code: 404, message: 'Not found' };
      const result = Err(customError);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(customError);
      }
    });
  });

  describe('isOk()', () => {
    it('should return true for Ok results', () => {
      const result = Ok(42);
      expect(isOk(result)).toBe(true);
    });

    it('should return false for Err results', () => {
      const result = Err('error');
      expect(isOk(result)).toBe(false);
    });

    it('should provide type narrowing', () => {
      const result: Result<number, string> = Ok(42);
      if (isOk(result)) {
        // TypeScript should know result.value exists here
        expect(result.value).toBe(42);
      }
    });
  });

  describe('isErr()', () => {
    it('should return false for Ok results', () => {
      const result = Ok(42);
      expect(isErr(result)).toBe(false);
    });

    it('should return true for Err results', () => {
      const result = Err('error');
      expect(isErr(result)).toBe(true);
    });

    it('should provide type narrowing', () => {
      const result: Result<number, string> = Err('failed');
      if (isErr(result)) {
        // TypeScript should know result.error exists here
        expect(result.error).toBe('failed');
      }
    });
  });

  describe('unwrap()', () => {
    it('should return the value from Ok result', () => {
      const result = Ok(42);
      expect(unwrap(result)).toBe(42);
    });

    it('should throw error from Err result', () => {
      const error = new Error('Test error');
      const result = Err(error);
      expect(() => unwrap(result)).toThrow(error);
    });

    it('should throw custom error from Err result', () => {
      const result = Err('custom error');
      expect(() => unwrap(result)).toThrow('custom error');
    });
  });

  describe('unwrapOr()', () => {
    it('should return the value from Ok result', () => {
      const result = Ok(42);
      expect(unwrapOr(result, 0)).toBe(42);
    });

    it('should return default value from Err result', () => {
      const result = Err('error');
      expect(unwrapOr(result, 0)).toBe(0);
    });

    it('should return default string from Err result', () => {
      const result: Result<string, Error> = Err(new Error('failed'));
      expect(unwrapOr(result, 'default')).toBe('default');
    });

    it('should return default object from Err result', () => {
      const defaultObj = { name: 'default' };
      const result: Result<{ name: string }, string> = Err('error');
      expect(unwrapOr(result, defaultObj)).toBe(defaultObj);
    });
  });

  describe('mapResult()', () => {
    it('should transform Ok result value', () => {
      const result = Ok(42);
      const mapped = mapResult(result, (n) => n * 2);
      expect(mapped.ok).toBe(true);
      if (mapped.ok) {
        expect(mapped.value).toBe(84);
      }
    });

    it('should transform Ok result to different type', () => {
      const result = Ok(42);
      const mapped = mapResult(result, (n) => `Number: ${n}`);
      expect(mapped.ok).toBe(true);
      if (mapped.ok) {
        expect(mapped.value).toBe('Number: 42');
      }
    });

    it('should not transform Err result', () => {
      const error = new Error('failed');
      const result: Result<number, Error> = Err(error);
      const mapped = mapResult(result, (n) => n * 2);
      expect(mapped.ok).toBe(false);
      if (!mapped.ok) {
        expect(mapped.error).toBe(error);
      }
    });

    it('should chain multiple transformations', () => {
      const result = Ok(10);
      const mapped = mapResult(
        mapResult(result, (n) => n * 2),
        (n) => n + 5
      );
      expect(mapped.ok).toBe(true);
      if (mapped.ok) {
        expect(mapped.value).toBe(25);
      }
    });
  });

  describe('mapError()', () => {
    it('should transform Err result error', () => {
      const result: Result<number, string> = Err('original error');
      const mapped = mapError(result, (err) => `Transformed: ${err}`);
      expect(mapped.ok).toBe(false);
      if (!mapped.ok) {
        expect(mapped.error).toBe('Transformed: original error');
      }
    });

    it('should transform error to different type', () => {
      const result: Result<number, Error> = Err(new Error('test'));
      const mapped = mapError(result, (err) => ({ code: 500, message: err.message }));
      expect(mapped.ok).toBe(false);
      if (!mapped.ok) {
        expect(mapped.error).toEqual({ code: 500, message: 'test' });
      }
    });

    it('should not transform Ok result', () => {
      const result: Result<number, string> = Ok(42);
      const mapped = mapError(result, (err) => `Transformed: ${err}`);
      expect(mapped.ok).toBe(true);
      if (mapped.ok) {
        expect(mapped.value).toBe(42);
      }
    });
  });

  describe('asyncResult()', () => {
    it('should wrap successful async function', async () => {
      const fn = async () => 42;
      const result = await asyncResult(fn);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it('should wrap async function returning string', async () => {
      const fn = async () => 'success';
      const result = await asyncResult(fn);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('success');
      }
    });

    it('should catch Error from async function', async () => {
      const error = new Error('Async error');
      const fn = async () => {
        throw error;
      };
      const result = await asyncResult(fn);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(error);
      }
    });

    it('should wrap non-Error thrown values in Error', async () => {
      const fn = async () => {
        throw 'string error';
      };
      const result = await asyncResult(fn);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('string error');
      }
    });

    it('should handle rejected promises', async () => {
      const fn = async () => Promise.reject(new Error('Rejected'));
      const result = await asyncResult(fn);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Rejected');
      }
    });
  });

  describe('combineResults()', () => {
    it('should combine multiple Ok results into array', () => {
      const results = [Ok(1), Ok(2), Ok(3)];
      const combined = combineResults(results);
      expect(combined.ok).toBe(true);
      if (combined.ok) {
        expect(combined.value).toEqual([1, 2, 3]);
      }
    });

    it('should combine empty array into empty array', () => {
      const results: Result<number, string>[] = [];
      const combined = combineResults(results);
      expect(combined.ok).toBe(true);
      if (combined.ok) {
        expect(combined.value).toEqual([]);
      }
    });

    it('should return first error when one result fails', () => {
      const error = new Error('Failed');
      const results: Result<number, Error>[] = [Ok(1), Err(error), Ok(3)];
      const combined = combineResults(results);
      expect(combined.ok).toBe(false);
      if (!combined.ok) {
        expect(combined.error).toBe(error);
      }
    });

    it('should return first error when multiple results fail', () => {
      const error1 = new Error('First');
      const error2 = new Error('Second');
      const results: Result<number, Error>[] = [Ok(1), Err(error1), Err(error2)];
      const combined = combineResults(results);
      expect(combined.ok).toBe(false);
      if (!combined.ok) {
        expect(combined.error).toBe(error1);
      }
    });

    it('should combine results of different types into array', () => {
      const results = [Ok('a'), Ok('b'), Ok('c')];
      const combined = combineResults(results);
      expect(combined.ok).toBe(true);
      if (combined.ok) {
        expect(combined.value).toEqual(['a', 'b', 'c']);
      }
    });

    it('should handle single Ok result', () => {
      const results = [Ok(42)];
      const combined = combineResults(results);
      expect(combined.ok).toBe(true);
      if (combined.ok) {
        expect(combined.value).toEqual([42]);
      }
    });

    it('should handle single Err result', () => {
      const error = new Error('Failed');
      const results = [Err(error)];
      const combined = combineResults(results);
      expect(combined.ok).toBe(false);
      if (!combined.ok) {
        expect(combined.error).toBe(error);
      }
    });
  });
});
