# Security Policy

## Supported Versions

Currently, only the latest version of InnoVision is supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest| :x:                |

## Reporting a Vulnerability

We take the security of InnoVision seriously. If you believe you have found a security vulnerability, please report it to us as follows:

1. **Email the maintainer**: Send an email to [vikas.ambalazari@gmail.com](mailto:vikas.ambalazari@gmail.com).
2. **Provide details**: Include a detailed description of the vulnerability, steps to reproduce, and potential impact.
3. **Wait for response**: Please give us 48-72 hours to respond and acknowledge your report.

**Please do not open a public GitHub issue for security vulnerabilities.**

## Our Response Process

1. **Acknowledgment**: We will acknowledge your report within 3 business days.
2. **Evaluation**: We will evaluate the report and determine the severity.
3. **Fix**: If valid, we will work on a fix and release it as soon as possible.
4. **Disclosure**: Once fixed, we will coordinate a public disclosure if appropriate.

## Security Best Practices for Contributors

- Never commit secrets (API keys, tokens, credentials).
- Use environment variables for all sensitive configuration.
- Sanitize user inputs to prevent XSS and SQL injection.
- Keep dependencies up to date.

Thank you for helping keep InnoVision secure!
