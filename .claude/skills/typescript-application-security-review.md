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
- [ ] Ensure all validation logic is executed on the server-side

**Common Vulnerabilities**:
❌ BAD: 
```typescript
// example of vulnerable code
const userInput = req.body.username;
if (userInput.includes('admin')) {
  // grant admin access
}
```
✅ GOOD: 
```typescript
// example of secure code using zod
import { z } from 'zod';

const userInputSchema = z.string().min(1).max(50);
const userInput = userInputSchema.parse(req.body.username);
```

**Why It Matters**: Input validation prevents attacks like SQL injection, cross-site scripting (XSS), and command injection by ensuring that user-provided data conforms to expected formats and does not contain malicious content.

### Authentication & Authorization
**Guideline**: backend/dependency-injection.md

**Check for**:
- [ ] Implement authentication using a secure library like `passport.js`
- [ ] Use role-based access control (RBAC) for authorization
- [ ] Validate user sessions and tokens on each request

**Common Vulnerabilities**:
❌ BAD: 
```typescript
// example of vulnerable code
if (req.body.username === 'admin' && req.body.password === 'password123') {
  // grant admin access
}
```
✅ GOOD: 
```typescript
// example of secure code using passport.js
import passport from 'passport';

passport.authenticate('local', (err, user, info) => {
  if (err || !user) {
    return res.status(401).send({ message: 'Invalid credentials' });
  }
  req.logIn(user, (err) => {
    if (err) {
      return res.status(500).send({ message: 'Error logging in' });
    }
    res.send({ message: 'Logged in successfully' });
  });
});
```

**Why It Matters**: Secure authentication and authorization prevent unauthorized access to sensitive data and functionality, reducing the risk of data breaches and privilege escalation attacks.

### Data Protection
**Check for**:
- [ ] Use HTTPS (TLS) for encrypting data in transit
- [ ] Store sensitive data encrypted using a library like `crypto-js`
- [ ] Implement secure password hashing using a library like `bcrypt`

**Common Vulnerabilities**:
❌ BAD: 
```typescript
// example of vulnerable code
const sensitiveData = 'secretKey';
res.send(sensitiveData);
```
✅ GOOD: 
```typescript
// example of secure code using crypto-js
import CryptoJS from 'crypto-js';

const sensitiveData = 'secretKey';
const encryptedData = CryptoJS.AES.encrypt(sensitiveData, 'secretKey').toString();
res.send(encryptedData);
```

**Why It Matters**: Data protection measures prevent sensitive information from being intercepted, accessed, or exploited by unauthorized parties, reducing the risk of data breaches and identity theft.

### Dependency Management
**Check for**:
- [ ] Keep dependencies up-to-date using `npm audit` or `yarn audit`
- [ ] Use a dependency management tool like `snyk` or `npm-shrinkwrap`
- [ ] Avoid using deprecated or vulnerable dependencies

**Common Vulnerabilities**:
❌ BAD: 
```typescript
// example of vulnerable code
const express = require('express@4.17.1'); // outdated version
```
✅ GOOD: 
```typescript
// example of secure code using npm audit
import express from 'express';

// run npm audit regularly to keep dependencies up-to-date
```

**Why It Matters**: Dependency management helps prevent vulnerabilities in third-party libraries from being exploited, reducing the risk of supply chain attacks and dependency-based vulnerabilities.

### Error Handling
**Check for**:
- [ ] Implement error handling using a library like `errorhandler`
- [ ] Log errors securely using a library like `winston`
- [ ] Avoid exposing sensitive information in error messages

**Common Vulnerabilities**:
❌ BAD: 
```typescript
// example of vulnerable code
try {
  // code that may throw an error
} catch (err) {
  res.send(err.stack);
}
```
✅ GOOD: 
```typescript
// example of secure code using errorhandler
import errorhandler from 'errorhandler';

app.use(errorhandler({
  handler: (err, req, res, next) => {
    res.status(500).send('Internal Server Error');
  },
}));
```

**Why It Matters**: Error handling prevents sensitive information from being exposed in error messages, reducing the risk of information disclosure and debugging attacks.

### Logging
**Check for**:
- [ ] Implement logging using a library like `winston`
- [ ] Log sensitive information securely
- [ ] Monitor logs regularly for security incidents

**Common Vulnerabilities**:
❌ BAD: 
```typescript
// example of vulnerable code
console.log('Sensitive data: ' + sensitiveData);
```
✅ GOOD: 
```typescript
// example of secure code using winston
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

logger.info('Sensitive data: ' + sensitiveData);
```

**Why It Matters**: Logging helps detect and respond to security incidents, reducing the risk of undetected attacks and data breaches.

## Common Pitfalls
- Using outdated or vulnerable dependencies
- Exposing sensitive information in error messages or logs
- Failing to validate user input or implement authentication and authorization
- Not using HTTPS (TLS) for encrypting data in transit
- Not monitoring logs regularly for security incidents

## Automated Tools
Recommend running these security scanners:
- `npm audit` for dependency vulnerabilities
- `snyk` for dependency vulnerabilities and license compliance
- `Bearer` for API security testing

## Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [TypeScript Security Guide](https://www.typescriptlang.org/docs/handbook/security.html)
- [Node.js Security Guide](https://nodejs.org/en/docs/guides/security/)