# Security Policy

OpenAnalytics handles analytics data and deployment secrets, so security reports are taken seriously.

## Supported Versions

Until the project has a formal stable release policy, security fixes are handled on the latest maintained code line.

Use the latest release or the latest `main` branch unless a release note says otherwise.

## Reporting a Vulnerability

Please do not report security vulnerabilities in public GitHub issues.

Report them privately through GitHub: [open a security advisory](https://github.com/every-app/private-open-analytics/security/advisories/new).

Include as much detail as possible:

- Affected version, commit, or deployment method
- A description of the issue and potential impact
- Steps to reproduce
- Any proof-of-concept code or logs that help confirm the issue
- Whether the issue is already public

We will acknowledge valid reports as soon as practical and coordinate a fix before public disclosure.

## Scope

Security-sensitive areas include:

- Access control: organization scoping, roles and public share links
- Analytics data ingestion and storage
- Cloudflare Worker, D1, KV, and Durable Object configuration
- Deployment secrets and environment variables
- MCP tools exposed to agents
- Privacy guarantees such as visitor identification and IP handling

## Public Disclosure

Please give the maintainers time to investigate and release a fix before publishing details publicly.
