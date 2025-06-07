# Agent Rules & Guidelines System

## Overview

This document defines the hierarchical rule system that all AI agents working on the Dzinza project must follow. Rules are organized in layers with clear precedence to ensure consistent decision-making and behavior.

## Rule Hierarchy (Precedence Order)

### Layer 0: Fundamental Laws
**Status**: Immutable - Never override
- Safety and security first
- No harmful, illegal, or unethical actions
- Respect user privacy and data protection
- Follow applicable laws and regulations

### Layer 1: Core Principles
**Status**: Override only in exceptional circumstances
**Reference**: [CORE_PRINCIPLES.md](./CORE_PRINCIPLES.md)
- User-centric design
- Security by design
- Performance and reliability
- Maintainability and clarity
- Accessibility and inclusivity

### Layer 2: Project Standards
**Status**: Standard guidelines - may be overridden with justification
**Reference**: [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md)
- Development methodology
- Technology choices
- Architecture patterns
- Testing requirements

### Layer 3: Implementation Guidelines
**Status**: Preferred practices - flexible based on context
**References**: 
- [CODE_STANDARDS.md](./CODE_STANDARDS.md)
- [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md)
- Coding standards
- Documentation requirements
- Review processes

### Layer 4: Style Preferences
**Status**: Suggestions - adapt to context
- Code formatting
- Naming conventions
- File organization
- Comment styles

## Conflict Resolution

When rules from different layers conflict:

1. **Higher layer always wins** - Layer 0 > Layer 1 > Layer 2 > Layer 3 > Layer 4
2. **Within same layer**: Use [DECISION_FRAMEWORK.md](./DECISION_FRAMEWORK.md)
3. **Document exceptions**: Always explain why a lower layer rule was chosen
4. **Seek clarification**: When in doubt, ask the user

## Rule Application Process

### Before Making Decisions
1. Identify which layers apply to the current task
2. Check for potential conflicts between layers
3. Review project context and user requirements
4. Apply decision framework if needed

### During Implementation
1. Follow the highest applicable layer
2. Document any rule exceptions or deviations
3. Ensure consistency with previous decisions
4. Validate against security and safety requirements

### After Implementation
1. Review decisions for consistency
2. Update guidelines if patterns emerge
3. Document lessons learned
4. Share insights with other agents

## Quick Reference Guide

### Common Scenarios

| Scenario | Primary Layer | Key Considerations |
|----------|---------------|-------------------|
| Security vulnerability | Layer 0, 1 | Always prioritize security fixes |
| Performance optimization | Layer 1, 2 | Balance performance with maintainability |
| Code formatting | Layer 4 | Follow project standards, be consistent |
| Architecture decisions | Layer 2, 3 | Consider long-term maintainability |
| User interface changes | Layer 1, 2 | Prioritize user experience and accessibility |

### Decision Tree

```
Is it a safety/security issue?
├─ Yes → Apply Layer 0 rules
└─ No → Continue

Does it affect user experience significantly?
├─ Yes → Apply Layer 1 rules
└─ No → Continue

Is it an architectural/technology choice?
├─ Yes → Apply Layer 2 rules
└─ No → Continue

Is it about code quality/standards?
├─ Yes → Apply Layer 3 rules
└─ No → Apply Layer 4 rules
```

## Rule Updates

### Who Can Update Rules
- **Layer 0**: No updates allowed
- **Layer 1**: Project owner/lead architect only
- **Layer 2**: Senior team members with consensus
- **Layer 3**: Team leads with review
- **Layer 4**: Any team member with review

### Update Process
1. Propose change with justification
2. Review impact on existing code/decisions
3. Update documentation
4. Communicate changes to all agents
5. Update this master document

## Enforcement

### Automated Checks
- Linting and code analysis tools enforce Layer 3-4 rules
- Security scanners enforce Layer 0-1 rules
- Architecture tests enforce Layer 2 rules

### Review Process
- All code changes reviewed against applicable layers
- Escalate conflicts to appropriate layer authority
- Document exceptions in commit messages/PR descriptions

### Continuous Improvement
- Regular review of rule effectiveness
- Collect feedback from development process
- Update guidelines based on lessons learned
- Maintain consistency across all agents

## Agent Onboarding

New agents must:
1. Read and acknowledge this document
2. Review all referenced layer documents
3. Complete decision framework training
4. Practice with sample scenarios
5. Demonstrate understanding of conflict resolution

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-06-07 | Initial rule system creation | System |

---

**Remember**: When in doubt, prioritize safety, security, and user value. Document your reasoning and seek guidance when needed.
