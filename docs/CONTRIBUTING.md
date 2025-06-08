# Contributing to Dzinza

We love your input! We want to make contributing to Dzinza as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Getting Started

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub, then:
   git clone https://github.com/YOUR_USERNAME/dzinza.git
   cd dzinza
   ```

2. **Set up development environment**
   ```bash
   npm install
   cp .env.example .env.local
   npm run dev
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-new-feature
   ```

### Making Changes

1. **Write code following our guidelines**
   - Follow the [Development Guidelines](./DEVELOPMENT_GUIDELINES.md)
   - Write tests for new functionality
   - Update documentation as needed

2. **Test your changes**
   ```bash
   npm run test:all
   npm run lint
   npm run type-check
   ```

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): add amazing new feature"
   ```

## Pull Request Process

1. **Ensure your PR is up to date**
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout feature/amazing-new-feature
   git rebase develop
   ```

2. **Push your branch**
   ```bash
   git push origin feature/amazing-new-feature
   ```

3. **Create a Pull Request**
   - Use our PR template
   - Link any related issues
   - Provide clear description of changes

### PR Requirements

Before your PR can be merged, it must:

- [ ] Pass all automated tests
- [ ] Have at least one approved review
- [ ] Follow coding standards (linting passes)
- [ ] Include tests for new functionality
- [ ] Update documentation if needed
- [ ] Have no merge conflicts

## Coding Standards

### TypeScript/JavaScript

```typescript
// ✅ Good
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

const getUserProfile = async (id: string): Promise<UserProfile> => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

// ❌ Bad
const getUserProfile = async (id: any) => {
  const response = await api.get('/users/' + id);
  return response.data;
};
```

### React Components

```typescript
// ✅ Good
interface PersonCardProps {
  person: Person;
  onEdit: (person: Person) => void;
  className?: string;
}

export const PersonCard: React.FC<PersonCardProps> = ({
  person,
  onEdit,
  className = ''
}) => {
  const handleEdit = useCallback(() => {
    onEdit(person);
  }, [person, onEdit]);

  return (
    <div className={`person-card ${className}`}>
      <h3>{person.name}</h3>
      <button onClick={handleEdit}>Edit</button>
    </div>
  );
};

// ❌ Bad
export const PersonCard = (props: any) => {
  return (
    <div>
      <h3>{props.person.name}</h3>
      <button onClick={() => props.onEdit(props.person)}>Edit</button>
    </div>
  );
};
```

### CSS/Styling

```css
/* ✅ Good - Use Tailwind utility classes */
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">

/* ✅ Good - Custom CSS with semantic names */
.family-tree-node {
  @apply relative p-3 bg-white border border-gray-200 rounded-lg;
}

.family-tree-node--selected {
  @apply border-blue-500 bg-blue-50;
}

/* ❌ Bad - Inline styles */
<div style={{display: 'flex', padding: '16px', backgroundColor: 'white'}}>
```

## Commit Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Examples

```bash
feat(auth): add OAuth login support
fix(family-tree): resolve node positioning bug
docs(api): update authentication endpoints
test(components): add tests for PersonCard component
refactor(database): optimize relationship queries
```

## Issue Reporting

### Bug Reports

Use our bug report template and include:

1. **Description:** Clear description of the bug
2. **Steps to reproduce:** Numbered steps to reproduce
3. **Expected behavior:** What should happen
4. **Actual behavior:** What actually happens
5. **Environment:** Browser, OS, Node version
6. **Screenshots:** If applicable

### Feature Requests

Use our feature request template and include:

1. **Problem statement:** What problem does this solve?
2. **Proposed solution:** How should it work?
3. **Alternatives considered:** Other solutions you've considered
4. **Additional context:** Mockups, examples, etc.

## Code Review Guidelines

### For Authors

- Keep PRs small and focused
- Write clear commit messages
- Add tests for new functionality
- Update documentation
- Respond to feedback promptly

### For Reviewers

- Be constructive and respectful
- Ask questions to understand intent
- Suggest improvements
- Check for edge cases
- Verify tests cover new code

### Review Checklist

- [ ] Code follows style guidelines
- [ ] Self-review has been performed
- [ ] Comments explain complex logic
- [ ] Tests cover new functionality
- [ ] Documentation is updated
- [ ] No console.log or debug code
- [ ] Security implications considered

## Testing Requirements

### New Features

All new features must include:

1. **Unit tests** for core functionality
2. **Integration tests** for API interactions
3. **E2E tests** for user workflows
4. **Documentation** updates

### Bug Fixes

All bug fixes must include:

1. **Test case** that reproduces the bug
2. **Fix** that makes the test pass
3. **Regression test** to prevent recurrence

## Documentation

### Code Documentation

```typescript
/**
 * Calculates the relationship between two people in a family tree
 * @param person1 - First person in the relationship
 * @param person2 - Second person in the relationship
 * @param familyTree - Complete family tree data
 * @returns The relationship type or null if no relationship exists
 * @example
 * ```typescript
 * const relationship = calculateRelationship(john, jane, familyTree);
 * console.log(relationship); // 'cousin' | 'sibling' | 'parent' | null
 * ```
 */
export function calculateRelationship(
  person1: Person,
  person2: Person,
  familyTree: FamilyTree
): RelationshipType | null {
  // Implementation
}
```

### API Documentation

Update OpenAPI/Swagger documentation for any API changes:

```yaml
/api/persons:
  post:
    summary: Create a new person
    description: Creates a new person in the family tree
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Person'
    responses:
      201:
        description: Person created successfully
```

## Community

### Communication Channels

- **GitHub Issues:** Bug reports and feature requests
- **GitHub Discussions:** General questions and ideas
- **Discord:** Real-time chat and community support
- **Email:** security@dzinza.com for security issues

### Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read our [Code of Conduct](./CODE_OF_CONDUCT.md).

### Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes for significant contributions
- Annual contributor appreciation post

## Getting Help

If you need help:

1. Check existing [documentation](./README.md)
2. Search [GitHub Issues](https://github.com/dzinza/dzinza/issues)
3. Ask in [GitHub Discussions](https://github.com/dzinza/dzinza/discussions)
4. Join our [Discord community](https://discord.gg/dzinza)

## License

By contributing to Dzinza, you agree that your contributions will be licensed under the same license as the project (MIT License).

## Additional Resources

- [Development Guidelines](./DEVELOPMENT_GUIDELINES.md)
- [Testing Strategy](./TESTING_STRATEGY.md)
- [System Architecture](./SYSTEM_ARCHITECTURE.md)
- [API Documentation](./API_DOCUMENTATION.md)
