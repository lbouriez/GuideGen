# ADR-004: Path Traversal Validation Strategy

**Status:** Accepted

**Date:** 2026-01-22

## Context

As a CLI tool that reads and writes files in user-specified directories, GuideGen is vulnerable to **path traversal attacks** where malicious inputs could access files outside the intended project directory.

### Threat Model

**Attack Vectors:**
1. **Directory traversal**: `../../etc/passwd`
2. **Absolute path escape**: `/etc/passwd`
3. **Symlink attacks**: Symlinks pointing outside project
4. **Unicode/encoding bypass**: `..%2F..%2Fetc%2Fpasswd`
5. **Mixed separators**: `..\..\/etc/passwd` (Windows + Unix)

**Risk:**
- **Severity**: HIGH - Could read/write sensitive system files
- **Likelihood**: MEDIUM - Requires attacker to control CLI arguments
- **Impact**: Data breach, system compromise, privilege escalation

### Example Vulnerable Code

```typescript
// VULNERABLE - no validation
export async function runSetupWorkflow(targetPath: string) {
  const files = await fs.readdir(targetPath); // Could read anywhere!
  // ...
}
```

## Decision

**Implement comprehensive path validation** using InputValidator with the following strategy:

1. **Normalize paths**: Resolve to absolute canonical form
2. **Validate boundaries**: Ensure path stays within allowed base directory
3. **Reject escape attempts**: Block `..`, absolute paths, symlink escapes
4. **Fail closed**: Reject suspicious paths by default
5. **Validate early**: Check at workflow entry points before any operations

### Implementation

```typescript
@injectable()
export class InputValidator implements IInputValidator {
  /**
   * Validate and normalize a file path
   * Throws PathTraversalError on suspicious paths
   */
  validatePath(inputPath: string, basePath?: string): string {
    // 1. Normalize to absolute path
    const resolved = path.resolve(inputPath);

    // 2. Detect escape attempts
    if (inputPath.includes('..')) {
      throw new PathTraversalError(
        `Path contains directory traversal: ${inputPath}`
      );
    }

    // 3. Validate against base directory if provided
    if (basePath) {
      const baseResolved = path.resolve(basePath);
      if (!resolved.startsWith(baseResolved)) {
        throw new PathTraversalError(
          `Path escapes base directory: ${inputPath}`
        );
      }
    }

    // 4. Check for absolute path escapes
    if (path.isAbsolute(inputPath) && basePath && !resolved.startsWith(path.resolve(basePath))) {
      throw new PathTraversalError(
        `Absolute path escapes base directory: ${inputPath}`
      );
    }

    return resolved;
  }
}
```

### Usage at Entry Points

```typescript
export async function runSetupWorkflow(
  targetPath: string,
  depth: AnalysisDepth = 'standard',
  onProgress?: (message: string) => void
): Promise<SetupWorkflowResult> {
  // VALIDATE FIRST - before any file operations
  const validator = new InputValidator();
  const validatedPath = validator.validatePath(targetPath);

  // Now safe to use validatedPath
  const discoveryResult = await runDiscoveryPhase(validatedPath, depth);
  // ...
}
```

## Consequences

### Positive

- **Security**: Prevents path traversal attacks
- **Early detection**: Fails fast at workflow entry
- **Clear error messages**: Users understand why path was rejected
- **Defense in depth**: Multiple validation checks
- **Auditability**: All path access goes through validator

### Negative

- **Slight performance overhead**: Path resolution and validation
- **User experience**: Legitimate use cases might be blocked
- **Complexity**: Additional validation logic in every workflow

### Neutral

- **Symlinks**: Resolved but checked against base (could be stricter)
- **Windows vs Unix**: path.resolve handles platform differences

## Validation Coverage

### Protected Workflows

All workflow entry points validate input paths:

| Workflow | Entry Point | Validation |
|----------|-------------|------------|
| Setup | `runSetupWorkflow()` | ✅ Line 30 |
| Guidelines | `runGuidelinesWorkflow()` | ✅ Line 28 |
| Indexes | `runIndexesWorkflow()` | ✅ Entry point |
| Claude Artifacts | `runClaudeArtifactsWorkflow()` | ✅ Entry point |

### Test Coverage

```typescript
describe('InputValidator', () => {
  it('should reject directory traversal', () => {
    const validator = new InputValidator();
    expect(() => {
      validator.validatePath('../../../etc/passwd');
    }).toThrow(PathTraversalError);
  });

  it('should reject absolute path escapes', () => {
    const validator = new InputValidator();
    expect(() => {
      validator.validatePath('/etc/passwd', '/home/user/project');
    }).toThrow(PathTraversalError);
  });

  it('should allow valid relative paths', () => {
    const validator = new InputValidator();
    const result = validator.validatePath('./src', '/home/user/project');
    expect(result).toMatch(/\/home\/user\/project\/src/);
  });
});
```

## Attack Scenarios Tested

### 1. Basic Traversal
```bash
guidegen setup ../../../etc/passwd
→ PathTraversalError: Path contains directory traversal
```

### 2. Absolute Path Escape
```bash
guidegen setup /etc/passwd
→ PathTraversalError: Path escapes base directory
```

### 3. Mixed Separators (Windows)
```bash
guidegen setup ..\..\/etc/passwd
→ PathTraversalError: Path contains directory traversal
```

### 4. Symlink to Sensitive File
```bash
ln -s /etc/passwd ./evil-link
guidegen setup ./evil-link
→ PathTraversalError: Path escapes base directory
```

## Security Best Practices

### 1. Fail Closed
- Reject suspicious paths by default
- Don't try to "sanitize" - reject entirely
- Log rejected attempts for security monitoring

### 2. Validate Early
- Check at entry points before file operations
- Don't rely on downstream validation
- Centralized validation in InputValidator

### 3. Defense in Depth
- Multiple checks (contains `..`, starts with base, etc.)
- Path normalization + boundary validation
- Error types distinguish attack vectors

### 4. Clear Errors
- `PathTraversalError` specifically for traversal attempts
- Error messages explain what was rejected
- Don't leak system path structure in errors

## Integration with CI/CD

### Security Scanning

```yaml
# .github/workflows/security.yml
- name: Run security tests
  run: npm test -- --grep "PathTraversal"

- name: SAST scan
  uses: github/codeql-action/analyze
```

### Dependency Audit

```bash
npm audit --production
```

## Compliance

### CWE Coverage

- ✅ **CWE-22**: Improper Limitation of a Pathname to a Restricted Directory
- ✅ **CWE-23**: Relative Path Traversal
- ✅ **CWE-36**: Absolute Path Traversal
- ✅ **CWE-59**: Improper Link Resolution Before File Access ('Link Following')

### OWASP Top 10

- ✅ **A01:2021 – Broken Access Control**: Path traversal prevented
- ✅ **A03:2021 – Injection**: Path injection blocked

## Alternatives Considered

### 1. Sandbox/Chroot
**Pros:** Strongest isolation
**Cons:** Complex, platform-specific, requires elevated privileges
**Rejected because:** Overkill for CLI tool, compatibility issues

### 2. Allowlist of Specific Paths
**Pros:** Very restrictive
**Cons:** Inflexible, hard to maintain
**Rejected because:** Too restrictive for project-agnostic tool

### 3. Canonicalization Only
**Pros:** Simple
**Cons:** Not sufficient - canonical path might still escape
**Rejected because:** Insufficient protection

### 4. Regex-Based Validation
**Pros:** Fast
**Cons:** Error-prone, platform-specific, easy to bypass
**Rejected because:** Hard to maintain, false sense of security

## Future Enhancements

1. **Rate limiting**: Limit file access attempts per second
2. **Audit logging**: Log all rejected paths to security log
3. **Configurable base paths**: Allow users to specify allowed directories
4. **Stricter symlink handling**: Option to reject all symlinks

## Related Decisions

- [ADR-005: Rate Limiting with Exponential Backoff](ADR-005-rate-limiting.md)

## References

- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [CWE-22: Path Traversal](https://cwe.mitre.org/data/definitions/22.html)
- [Node.js Path Security](https://nodejs.org/api/path.html#path_path_resolve_paths)
