/**
 * File I/O operations with Result<T,E> error handling
 * These replace the throwing/null-returning versions for better type safety
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { Result, Ok, Err, AsyncResult } from '@/types';

/**
 * Read file with Result error handling
 */
export async function readFileResult(filePath: string): AsyncResult<string, Error> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return Ok(content);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(`Failed to read file: ${filePath}`));
  }
}

/**
 * Write file with Result error handling
 */
export async function writeFileResult(
  filePath: string,
  content: string
): AsyncResult<void, Error> {
  try {
    const dir = join(filePath, '..');
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, content, 'utf-8');
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(`Failed to write file: ${filePath}`));
  }
}

/**
 * Check if file exists with Result error handling
 */
export async function fileExistsResult(filePath: string): AsyncResult<boolean, Error> {
  try {
    const { stat } = await import('fs/promises');
    await stat(filePath);
    return Ok(true);
  } catch {
    return Ok(false);
  }
}

/**
 * Read JSON file with validation
 */
export async function readJsonFileResult<T>(
  filePath: string,
  validator?: (data: unknown) => data is T
): AsyncResult<T, Error> {
  const fileResult = await readFileResult(filePath);

  if (!fileResult.ok) {
    return fileResult;
  }

  try {
    const parsed = JSON.parse(fileResult.value) as unknown;

    if (validator && !validator(parsed)) {
      return Err(new Error(`Invalid JSON format in ${filePath}`));
    }

    return Ok(parsed as T);
  } catch (error) {
    return Err(new Error(`Failed to parse JSON in ${filePath}: ${error instanceof Error ? error.message : String(error)}`));
  }
}

/**
 * Write JSON file with Result error handling
 */
export async function writeJsonFileResult<T>(
  filePath: string,
  data: T
): AsyncResult<void, Error> {
  try {
    const content = JSON.stringify(data, null, 2);
    return await writeFileResult(filePath, content);
  } catch (error) {
    return Err(new Error(`Failed to stringify JSON: ${error instanceof Error ? error.message : String(error)}`));
  }
}
