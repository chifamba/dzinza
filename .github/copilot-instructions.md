# GitHub Copilot Guide — Dzinza Genealogy Platform

## Priorities

1. **Security First**: Always validate inputs, hash passwords, and avoid exposing sensitive data.
2. **User Experience**: Prioritize accessibility, performance, and maintainability.
3. **Compliance**: Follow legal/privacy requirements and internal architectural standards.

## Project Stack

**Frontend**: React 18+, TypeScript, Tailwind CSS, React Query, Zustand, i18next
**Backend**: Node.js 18+, Express/Fastify, PostgreSQL (Prisma), JWT Auth, Zod Validation

## Coding Guidelines

### Security

* ✅ Validate inputs (Zod)
* ✅ Hash passwords (bcrypt)
* ✅ Use secure headers (helmet, cors)
* ❌ Don’t log sensitive data

### React Components

* ✅ Use TypeScript interfaces
* ✅ React Query for data
* ✅ Error boundaries + loading states

### API Design

* ✅ RESTful routes with middleware
* ✅ Input validation, auth, clear responses

### Patterns to Follow

* ✅ Tailwind over inline styles
* ✅ `unknown` instead of `any`
* ✅ React state, avoid direct DOM manipulation

## Performance & Testing

* ✅ Lazy load large components
* ✅ Use `React.memo` for static renders
* ✅ Paginate large queries
* ✅ Write RTL/component & API tests

## Accessibility

* ✅ Use ARIA labels, semantic HTML
* ✅ Label inputs, support keyboard navigation


## Quick Decision Flow

* **Security-related?** Validate, auth, sanitize inputs
* **User-facing?** Use accessible, performant patterns
* **Style/structure?** Follow project conventions

## Need Help?

* Security → escalate immediately
* Architecture → `docs/SYSTEM_ARCHITECTURE.md`
* Code Standards → `docs/CODE_STANDARDS.md`

---

✅ Default to secure, maintainable, accessible code
❌ Never expose secrets, skip validation, or break conventions
