---
name: security-review
description: Before committing code or during pull request review
---

# TypeScript Application Security Review

## When to Use
Before committing code or during pull request review, especially when:
* Modifying API endpoints
* Handling user input
* Implementing authentication and authorization
* Storing or retrieving sensitive data
* Updating dependencies

## Security Checklist

### Input Validation
**Guideline**: Refer to backend/dependency-injection.md for dependency injection best practices

**Check for**:
- [ ] Validate all user input using a whitelist approach
- [ ] Use a library like `zod` or `joi` for schema validation
- [ ] Ensure all input is sanitized and encoded

**Common Vulnerabilities**:
❌ BAD: 
```typescript
// example of vulnerable code
const userInput = req.body.username;
const query = `SELECT * FROM users WHERE username = '${userInput}'`;
```
✅ GOOD: 
```typescript
// example of secure code using zod for validation
import { z } from 'zod';

const userInputSchema = z.string().min(1).max(50);
const userInput = userInputSchema.parse(req.body.username);
const query = `SELECT * FROM users WHERE username = $1`;
const result = await db.query(query, [userInput]);
```
**Why It Matters**: Input validation prevents SQL injection and cross-site scripting (XSS) attacks, which can lead to data breaches and unauthorized access.

### Authentication & Authorization
**Guideline**: Implement authentication and authorization using established libraries like `passport.js` or `next-auth`

**Check for**:
- [ ] Use a secure password hashing algorithm like `bcrypt` or `argon2`
- [ ] Implement role-based access control (RBAC) for authorization
- [ ] Use secure protocols for authentication (e.g., HTTPS, OAuth)

**Common Vulnerabilities**:
❌ BAD: 
```typescript
// example of vulnerable code
const password = req.body.password;
const user = await User.findOne({ where: { username: req.body.username } });
if (user && user.password === password) {
  // authenticated
}
```
✅ GOOD: 
```typescript
// example of secure code using bcrypt for password hashing
import bcrypt from 'bcrypt';

const password = req.body.password;
const user = await User.findOne({ where: { username: req.body.username } });
if (user && await bcrypt.compare(password, user.password)) {
  // authenticated
}
```
**Why It Matters**: Weak authentication and authorization mechanisms can lead to unauthorized access, data breaches, and identity theft.

### Data Protection
**Guideline**: Use established libraries like `crypto` for encryption and decryption

**Check for**:
- [ ] Use secure encryption algorithms like `AES` or `RSA`
- [ ] Store sensitive data securely (e.g., environment variables, secure storage)
- [ ] Implement secure data transfer protocols (e.g., HTTPS, SFTP)

**Common Vulnerabilities**:
❌ BAD: 
```typescript
// example of vulnerable code
const sensitiveData = req.body.sensitiveData;
const encryptedData = sensitiveData.toString();
```
✅ GOOD: 
```typescript
// example of secure code using crypto for encryption
import crypto from 'crypto';

const sensitiveData = req.body.sensitiveData;
const encryptedData = crypto.createCipheriv('aes-256-cbc', process.env.SECRET_KEY, 'initVector').update(sensitiveData, 'utf8', 'hex');
```
**Why It Matters**: Inadequate data protection can lead to data breaches, identity theft, and unauthorized access to sensitive information.

### Dependency Management
**Guideline**: Refer to backend/dependency-injection.md for dependency injection best practices

**Check for**:
- [ ] Keep dependencies up-to-date
- [ ] Use a dependency management tool like `npm` or `yarn`
- [ ] Monitor dependencies for known vulnerabilities

**Common Vulnerabilities**:
❌ BAD: 
```typescript
// example of vulnerable code
const express = require('express@4.17.1');
```
✅ GOOD: 
```typescript
// example of secure code using npm for dependency management
import express from 'express';
```
**Why It Matters**: Outdated dependencies can lead to known vulnerabilities, which can be exploited by attackers.

### Error Handling
**Guideline**: Implement error handling using established libraries like `errorhandler` or `boom`

**Check for**:
- [ ] Handle errors securely (e.g., log errors, display generic error messages)
- [ ] Use a error handling middleware
- [ ] Implement retry mechanisms for failed operations

**Common Vulnerabilities**:
❌ BAD: 
```typescript
// example of vulnerable code
try {
  // code that may throw an error
} catch (error) {
  console.log(error);
  res.status(500).send(error.message);
}
```
✅ GOOD: 
```typescript
// example of secure code using errorhandler for error handling
import errorhandler from 'errorhandler';

try {
  // code that may throw an error
} catch (error) {
  console.log(error);
  res.status(500).send('Internal Server Error');
}
```
**Why It Matters**: Inadequate error handling can lead to information disclosure, which can be used by attackers to exploit vulnerabilities.

### Logging and Monitoring
**Guideline**: Implement logging and monitoring using established libraries like `winston` or `morgan`

**Check for**:
- [ ] Log security-related events (e.g., login attempts, access to sensitive data)
- [ ] Monitor logs for suspicious activity
- [ ] Implement alerting mechanisms for security incidents

**Common Vulnerabilities**:
❌ BAD: 
```typescript
// example of vulnerable code
console.log('Login attempt');
```
✅ GOOD: 
```typescript
// example of secure code using winston for logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/security.log' }),
  ],
});

logger.info('Login attempt');
```
**Why It Matters**: Inadequate logging and monitoring can lead to undetected security incidents, which can result in data breaches and unauthorized access.

## Common Pitfalls
- Using outdated dependencies
- Not validating user input
- Not implementing secure authentication and authorization mechanisms
- Not protecting sensitive data
- Not logging and monitoring security-related events

## Automated Tools
Recommend running these security scanners:
- `npm audit` for Node.js dependencies
- `snyk` for vulnerability scanning
- `Bearer` for API security testing

## Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Guide](https://nodejs.org/en/docs/guides/security/)
- [TypeScript Security Guide](https://www.typescriptlang.org/docs/handbook/security.html)