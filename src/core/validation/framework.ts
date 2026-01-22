/**
 * Validation Framework
 * Structured, extensible validation beyond regex patterns
 */

export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface ValidationIssue {
  severity: ValidationSeverity;
  rule: string;
  message: string;
  location?: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100 quality score
  issues: ValidationIssue[];
}

/**
 * Base validator interface
 */
export interface IValidator<T> {
  name: string;
  validate(input: T): ValidationResult;
}

/**
 * Composable validator that combines multiple validators
 */
export class CompositeValidator<T> implements IValidator<T> {
  name: string;
  private validators: IValidator<T>[];

  constructor(name: string, validators: IValidator<T>[]) {
    this.name = name;
    this.validators = validators;
  }

  validate(input: T): ValidationResult {
    const allIssues: ValidationIssue[] = [];
    let minScore = 100;

    for (const validator of this.validators) {
      const result = validator.validate(input);
      allIssues.push(...result.issues);
      minScore = Math.min(minScore, result.score);
    }

    // Check if any errors exist
    const hasErrors = allIssues.some(i => i.severity === ValidationSeverity.ERROR);

    return {
      valid: !hasErrors,
      score: this.calculateCompositeScore(allIssues),
      issues: allIssues
    };
  }

  private calculateCompositeScore(issues: ValidationIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case ValidationSeverity.ERROR:
          score -= 20;
          break;
        case ValidationSeverity.WARNING:
          score -= 5;
          break;
        case ValidationSeverity.INFO:
          score -= 1;
          break;
      }
    }

    return Math.max(0, score);
  }
}

/**
 * Rule-based validator
 */
export abstract class RuleBasedValidator<T> implements IValidator<T> {
  abstract name: string;
  protected abstract rules: ValidationRule<T>[];

  validate(input: T): ValidationResult {
    const issues: ValidationIssue[] = [];

    for (const rule of this.rules) {
      if (!rule.condition(input)) {
        issues.push({
          severity: rule.severity,
          rule: rule.name,
          message: rule.message,
          location: rule.getLocation?.(input),
          suggestion: rule.suggestion
        });
      }
    }

    const hasErrors = issues.some(i => i.severity === ValidationSeverity.ERROR);
    const score = this.calculateScore(issues);

    return {
      valid: !hasErrors,
      score,
      issues
    };
  }

  private calculateScore(issues: ValidationIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case ValidationSeverity.ERROR:
          score -= 20;
          break;
        case ValidationSeverity.WARNING:
          score -= 5;
          break;
        case ValidationSeverity.INFO:
          score -= 1;
          break;
      }
    }

    return Math.max(0, score);
  }
}

/**
 * Validation rule definition
 */
export interface ValidationRule<T> {
  name: string;
  severity: ValidationSeverity;
  condition: (input: T) => boolean;
  message: string;
  suggestion?: string;
  getLocation?: (input: T) => string;
}

/**
 * Helper to create validation rules
 */
export function createRule<T>(
  name: string,
  severity: ValidationSeverity,
  condition: (input: T) => boolean,
  message: string,
  suggestion?: string
): ValidationRule<T> {
  return { name, severity, condition, message, suggestion };
}
