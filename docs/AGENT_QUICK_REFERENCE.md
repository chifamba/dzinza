# Agent Quick Reference Guide

## Overview

This is a quick reference guide for AI agents working on the Dzinza project. Use this for fast lookups during development tasks.

## Rule Hierarchy (Quick Lookup)

| Layer | Priority | Override | Examples |
|-------|----------|----------|----------|
| **0: Fundamental Laws** | Absolute | Never | Security, safety, legal compliance |
| **1: Core Principles** | High | Rarely | User experience, performance, maintainability |
| **2: Project Standards** | Medium | With justification | Technology stack, architecture patterns |
| **3: Implementation** | Low | Context-dependent | Code standards, documentation |
| **4: Style Preferences** | Flexible | Freely | Formatting, naming conventions |

## Decision Quick Guide

### 🚨 Critical Decisions (Layer 0-1)
- Security vulnerability → Fix immediately, Layer 0
- User safety issue → Layer 0 rules apply
- Major performance problem → Layer 1, prioritize user impact
- Accessibility violation → Layer 1, must fix

### 🔧 Technical Decisions (Layer 2-3)
- Technology choice → Check Layer 2 standards first
- Code pattern → Follow Layer 3 guidelines
- Architecture change → Document in ADR, get approval
- API design → Follow REST standards (Layer 2)

### 🎨 Style Decisions (Layer 4)
- Code formatting → Follow existing patterns
- Naming convention → Be consistent with codebase
- File organization → Follow project structure

## Technology Stack Quick Reference

### Frontend
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS
- **Build**: Vite
- **Testing**: Vitest + Playwright
- **State**: React Query + Zustand
- **i18n**: React-i18next (English, Shona, Ndebele)

### Backend
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js or Fastify
- **Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Auth**: JWT with refresh tokens

### Development
- **Linting**: ESLint + TypeScript
- **Formatting**: Prettier
- **Git**: Git Flow branching
- **CI/CD**: GitHub Actions

## Common Patterns

### Error Handling
```typescript
// API Errors
try {
  const result = await apiCall();
  return result;
} catch (error) {
  logger.error('Operation failed', { error });
  throw new ServiceError('Operation failed');
}

// React Components
const [error, setError] = useState<string | null>(null);
// Handle error in UI
```

### API Responses
```typescript
// Success
{ data: T, message: string, success: true }

// Error
{ error: { code: string, message: string, details?: any }, success: false }
```

### Component Structure
```tsx
const Component: React.FC<Props> = ({ prop1, prop2 }) => {
  const { t } = useTranslation('namespace');
  
  // State
  const [state, setState] = useState();
  
  // Effects
  useEffect(() => {}, []);
  
  // Handlers
  const handleEvent = () => {};
  
  // Render
  return <div>{t('key')}</div>;
};
```

## Security Checklist

### Authentication
- [ ] JWT tokens with expiration
- [ ] Refresh token rotation
- [ ] Multi-factor for admin users
- [ ] Rate limiting on auth endpoints

### Data Protection
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (output encoding)
- [ ] HTTPS everywhere
- [ ] Encrypt PII at rest

### Authorization
- [ ] Role-based access control (RBAC)
- [ ] Principle of least privilege
- [ ] Resource-level permissions
- [ ] API endpoint authorization

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Page Load | < 3s on 3G | < 5s |
| API Response | < 200ms | < 500ms |
| Database Query | < 100ms | < 300ms |
| Time to Interactive | < 5s | < 8s |

## Code Quality Gates

### Required
- [ ] TypeScript strict mode
- [ ] ESLint passes
- [ ] Tests pass (80%+ coverage)
- [ ] Security scan passes
- [ ] Code review approved
- [ ] Internationalization keys defined
- [ ] Default language content provided

### Recommended
- [ ] Prettier formatting
- [ ] Performance analysis
- [ ] Accessibility audit
- [ ] Documentation updated

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build
```

### Database
```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Open Prisma Studio
npx prisma studio
```

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/DZ-123-description

# Commit with conventional format
git commit -m "feat(auth): add JWT refresh token rotation"

# Push and create PR
git push origin feature/DZ-123-description
```

## Emergency Procedures

### Security Incident
1. **Immediate**: Stop the threat (block access, disable feature)
2. **Assess**: Determine scope and impact
3. **Fix**: Apply security patch
4. **Communicate**: Notify stakeholders
5. **Document**: Create incident report

### Production Issue
1. **Triage**: Assess severity and user impact
2. **Mitigate**: Implement quick fix or rollback
3. **Investigate**: Find root cause
4. **Fix**: Implement proper solution
5. **Post-mortem**: Document lessons learned

### Performance Issue
1. **Monitor**: Check metrics and logs
2. **Identify**: Find bottleneck (database, API, frontend)
3. **Quick Fix**: Apply immediate optimization
4. **Long-term**: Plan proper performance improvements
5. **Verify**: Confirm resolution with metrics

## Escalation Contacts

| Issue Type | Contact | When |
|------------|---------|------|
| Security | Security Team | Vulnerabilities, breaches |
| Architecture | Senior Developer | Major design decisions |
| Performance | DevOps Team | Infrastructure issues |
| Business Logic | Product Owner | Requirements clarification |
| Code Quality | Team Lead | Standards questions |

## Quick Decision Tree

```
Is it a safety/security issue?
├─ Yes → Apply Layer 0 rules immediately
└─ No ↓

Will this significantly affect users?
├─ Yes → Apply Layer 1 principles
└─ No ↓

Is this an architecture/technology decision?
├─ Yes → Check Layer 2 standards
└─ No ↓

Is this about code quality/implementation?
├─ Yes → Follow Layer 3 guidelines
└─ No → Apply Layer 4 preferences
```

## Documentation Links

- [Full Agent Rules](./AGENT_RULES.md)
- [Core Principles](./CORE_PRINCIPLES.md)
- [Development Rules](./DEVELOPMENT_RULES.md)
- [Code Standards](./CODE_STANDARDS.md)
- [Decision Framework](./DECISION_FRAMEWORK.md)
- [Project Overview](./PROJECT_OVERVIEW.md)
- [API Documentation](./API_DOCUMENTATION.md)

## Contact Information

- **Project Repository**: [GitHub](https://github.com/dzinza/dzinza)
- **Documentation**: [docs folder](./README.md)
- **Issue Tracking**: GitHub Issues
- **Team Communication**: [Specify team communication channels]

---

**Remember**: When in doubt, prioritize user safety and security. Document your decisions and ask for help when needed.
