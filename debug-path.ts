/**
 * Debug script to test path resolution
 */

import { join, resolve } from 'path';
import { fileExists } from './cli/utils/file';

async function testPathResolution() {
  const targetPath = '.';
  const guidelinePath = '.guidelines/backend/api-routes.md';
  
  console.log('targetPath:', targetPath);
  console.log('guidelinePath:', guidelinePath);
  
  const fullPath = join(targetPath, guidelinePath);
  console.log('fullPath:', fullPath);
  
  const resolvedPath = resolve(fullPath);
  console.log('resolvedPath:', resolvedPath);
  
  const exists = await fileExists(fullPath);
  console.log('file exists:', exists);
  
  // Test current directory
  console.log('process.cwd():', process.cwd());
  console.log('__dirname:', __dirname);
}

testPathResolution().catch(console.error);