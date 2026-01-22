/**
 * Guideline validation logic
 * Legacy interface - forwards to new validation framework
 */

import type { GeneratedGuideline } from '@/types';
import { GuidelineValidator, ValidationSeverity } from '../../validation';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate guideline structure and content
 * Uses new validation framework under the hood
 */
export function validateGuideline(guideline: GeneratedGuideline): ValidationResult {
  const validator = new GuidelineValidator();
  const result = validator.validate(guideline);

  // Convert new format to legacy format
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const issue of result.issues) {
    const message = issue.suggestion
      ? `${issue.message} (${issue.suggestion})`
      : issue.message;

    if (issue.severity === ValidationSeverity.ERROR) {
      errors.push(message);
    } else if (issue.severity === ValidationSeverity.WARNING) {
      warnings.push(message);
    }
  }

  return {
    valid: result.valid,
    errors,
    warnings
  };
}

/**
 * Validate all guidelines
 */
export function validateAllGuidelines(guidelines: GeneratedGuideline[]): {
  valid: boolean;
  results: Map<string, ValidationResult>;
} {
  const results = new Map<string, ValidationResult>();
  let allValid = true;

  for (const guideline of guidelines) {
    const result = validateGuideline(guideline);
    results.set(`${guideline.domain}/${guideline.fileName}`, result);
    if (!result.valid) {
      allValid = false;
    }
  }

  return { valid: allValid, results };
}

/**
 * Check for duplicate guidelines
 */
export function checkDuplicates(guidelines: GeneratedGuideline[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const guideline of guidelines) {
    const key = `${guideline.domain}/${guideline.fileName}`;
    if (seen.has(key)) {
      duplicates.push(key);
    }
    seen.add(key);
  }

  return duplicates;
}
