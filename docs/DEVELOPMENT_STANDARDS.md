# Development Standards & Quality Controls

## Pre-Commit Checklist

Before any code changes, ensure:

### ✅ **Build & Type Safety**
- [ ] `npm run build` passes without errors or warnings
- [ ] `npm run lint` passes without issues  
- [ ] `npm run type-check` (if available) passes
- [ ] No TypeScript `any` types used
- [ ] All imports resolve correctly

### ✅ **Code Quality**
- [ ] No hardcoded values - use constants from `src/lib/config/constants.ts`
- [ ] Proper error handling with try/catch blocks
- [ ] No console.log statements in production code (use proper logging)
- [ ] React hooks called in correct order (no conditional hooks)
- [ ] Components follow single responsibility principle

### ✅ **Security**
- [ ] No secrets or API keys in code
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (use Prisma properly)
- [ ] XSS prevention (sanitize outputs)
- [ ] CSRF protection on state-changing operations

### ✅ **Performance**
- [ ] No unnecessary re-renders (proper useCallback/useMemo usage)
- [ ] Database queries optimized (select only needed fields)
- [ ] No N+1 query problems
- [ ] Proper loading states
- [ ] Error boundaries where needed

### ✅ **Shopify Standards**
- [ ] Polaris components used correctly (check current API)
- [ ] Embedded mode detection working
- [ ] App Bridge integration follows patterns
- [ ] GDPR compliance maintained
- [ ] Webhook signatures verified

## Root Cause Analysis Framework

When fixing bugs, always ask:

1. **What is the fundamental issue?** (not just the symptom)
2. **Why did this happen?** (process, validation, architecture)
3. **How can we prevent this category of issues?** (patterns, tooling, checks)
4. **What related areas might have the same problem?** (systematic review)

## Architecture Principles

### 🏗️ **Clean Architecture**
```
src/
├── app/                 # Next.js app router pages
├── components/          # Reusable UI components  
├── hooks/              # Custom React hooks
├── lib/                # Business logic & utilities
│   ├── config/         # Configuration constants
│   ├── services/       # External service integrations
│   ├── utils/          # Pure utility functions
│   └── middleware/     # Request/response handling
├── types/              # TypeScript type definitions
└── config/             # App-wide configuration
```

### 🔒 **Security First**
- Always validate inputs at API boundaries
- Use environment variables for secrets
- Implement rate limiting on public endpoints  
- Log security events for monitoring
- Regular dependency updates for vulnerabilities

### 📊 **Data Integrity**
- Database transactions for related operations
- Proper foreign key constraints
- Data validation at model level
- Backup and recovery procedures
- Audit trails for sensitive operations

### 🎯 **Performance Standards**
- Database queries < 100ms average
- Page load times < 2 seconds
- First paint < 1 second
- Cumulative layout shift < 0.1
- Lighthouse scores > 90

## Code Review Standards

### **Mandatory Checks:**

1. **Type Safety**: No `any` types, proper interfaces
2. **Error Handling**: All async operations wrapped in try/catch
3. **Security**: No exposed credentials, proper input validation
4. **Performance**: No unnecessary database calls or re-renders
5. **Testing**: Critical paths covered by tests
6. **Documentation**: Complex logic explained with comments

### **Red Flags** (must be fixed):
- Hardcoded configuration values
- Missing error handling
- Unvalidated user inputs  
- Direct database queries without Prisma
- Conditional React hooks
- Missing loading/error states
- Deprecated API usage

## Quality Gates

### **Stage 1: Development**
- ESLint/TypeScript checks pass
- Unit tests pass (when available)
- Manual testing completed
- Security review completed

### **Stage 2: Build**  
- Production build succeeds
- No build warnings
- Bundle size within limits
- Static analysis passes

### **Stage 3: Deployment**
- Integration tests pass
- Performance benchmarks met
- Security scan completed
- Database migrations successful

### **Stage 4: Post-Deploy**
- Health checks pass
- Error monitoring active
- Performance monitoring active
- User feedback tracking

## Testing Strategy

### **Unit Tests** (TODO)
- Pure functions tested
- Component rendering tested
- Hook behavior tested
- Error conditions tested

### **Integration Tests** (TODO)
- API endpoint functionality
- Database operations
- Shopify webhook handling
- Authentication flows

### **E2E Tests** (TODO)
- Critical user journeys
- Embedded vs standalone modes
- Error recovery flows
- Cross-browser compatibility

## Monitoring & Observability

### **Error Tracking**
- Sentry/error service integration
- Structured logging
- Performance monitoring
- User session tracking

### **Metrics to Track**
- API response times
- Database query performance
- User engagement
- Error rates
- Security events

## Dependencies Management

### **Package Updates**
- Regular security updates
- Test thoroughly before upgrading
- Pin exact versions for stability
- Document breaking changes

### **Adding New Dependencies**
- Evaluate necessity vs complexity
- Check security history
- Prefer established, maintained packages
- Consider bundle size impact

## Documentation Standards

### **Code Documentation**
- Complex business logic explained
- API contracts documented
- Security considerations noted
- Performance implications explained

### **Architecture Decisions**
- Document why, not just what
- Trade-offs explained
- Alternative approaches considered
- Future migration paths planned

## Emergency Protocols

### **Production Issues**
1. Immediate rollback if critical
2. Root cause analysis required
3. Post-mortem documentation
4. Process improvements implemented

### **Security Incidents**
1. Immediate access revocation
2. Impact assessment
3. User notification (if required)
4. Security hardening measures

---

**Remember**: Every line of code is a liability. Make it count.