# Development Guidelines

## Code Standards

### TypeScript Guidelines

#### Naming Conventions
```typescript
// Use PascalCase for components, types, and interfaces
interface UserProfile {
  firstName: string;
  lastName: string;
}

// Use camelCase for variables and functions
const userName = 'john_doe';
const getUserProfile = (id: string) => { ... };

// Use UPPER_SNAKE_CASE for constants
const API_BASE_URL = 'https://api.dzinza.com';
const DEFAULT_PAGE_SIZE = 20;
```

#### Type Definitions
```typescript
// Always define explicit types for function parameters and return values
function calculateAge(birthDate: Date): number {
  return new Date().getFullYear() - birthDate.getFullYear();
}

// Use strict type checking
interface Person {
  id: string;
  name: string;
  birthDate: Date;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
}

// Avoid 'any' type - use 'unknown' or proper types
const parseApiResponse = (data: unknown): Person[] => {
  // Type guards for validation
  if (Array.isArray(data)) {
    return data.filter(isValidPerson);
  }
  return [];
};
```

### React Guidelines

#### Component Structure
```typescript
// Use function components with TypeScript
interface PersonCardProps {
  person: Person;
  onEdit: (person: Person) => void;
  isEditing?: boolean;
}

export const PersonCard: React.FC<PersonCardProps> = ({
  person,
  onEdit,
  isEditing = false
}) => {
  // Use custom hooks for complex logic
  const { isVisible, toggle } = useToggle(false);
  
  // Group related state
  const [editState, setEditState] = useState({
    isLoading: false,
    error: null
  });

  return (
    <div className="person-card">
      {/* Component JSX */}
    </div>
  );
};
```

#### Custom Hooks
```typescript
// Create reusable custom hooks
export const usePersonData = (personId: string) => {
  const [person, setPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerson(personId)
      .then(setPerson)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [personId]);

  return { person, isLoading, error };
};
```

### CSS/Styling Guidelines

#### Tailwind CSS Usage
```typescript
// Use semantic class groupings
const cardClasses = [
  // Layout
  'flex flex-col',
  // Spacing
  'p-6 m-4',
  // Colors
  'bg-white border border-gray-200',
  // Typography
  'text-gray-900',
  // Effects
  'shadow-sm rounded-lg hover:shadow-md',
  // Responsive
  'sm:p-8 md:p-10'
].join(' ');

// Use CSS variables for dynamic values
const dynamicStyles = {
  '--progress-width': `${progress}%`,
  '--tree-depth': depth
} as React.CSSProperties;
```

#### Component Variants
```typescript
// Use cva (class-variance-authority) for component variants
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

## Git Workflow

### Branch Strategy
```bash
# Main branches
main          # Production-ready code
develop       # Integration branch for features

# Feature branches
feature/auth-system
feature/family-tree-visualization
feature/dna-matching

# Release branches
release/v1.0.0
release/v1.1.0

# Hotfix branches
hotfix/security-patch
hotfix/critical-bug-fix
```

### Commit Convention
```bash
# Format: <type>(<scope>): <description>
feat(auth): add JWT token refresh mechanism
fix(family-tree): resolve rendering issue with large trees
docs(api): update authentication endpoint documentation
style(ui): improve button component styling
refactor(database): optimize query performance
test(auth): add unit tests for login functionality
chore(deps): update React to v18.2.0

# Breaking changes
feat(api)!: remove deprecated user profile endpoints
```

### Pull Request Process
1. **Create feature branch from develop**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/new-feature
   ```

2. **Make changes with proper commits**
   ```bash
   git add .
   git commit -m "feat(feature): implement new functionality"
   ```

3. **Push and create PR**
   ```bash
   git push origin feature/new-feature
   # Create PR to develop branch
   ```

4. **PR Requirements**
   - [ ] All tests pass
   - [ ] Code review approved
   - [ ] Documentation updated
   - [ ] No merge conflicts

## Testing Standards

### Unit Testing
```typescript
// Use React Testing Library for component tests
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonCard } from './PersonCard';

describe('PersonCard', () => {
  const mockPerson = {
    id: '1',
    name: 'John Doe',
    birthDate: new Date('1990-01-01'),
    gender: 'male' as const
  };

  it('renders person information correctly', () => {
    render(<PersonCard person={mockPerson} onEdit={jest.fn()} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Male')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const mockOnEdit = jest.fn();
    render(<PersonCard person={mockPerson} onEdit={mockOnEdit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(mockOnEdit).toHaveBeenCalledWith(mockPerson);
  });
});
```

### API Testing
```typescript
// Use Supertest for API endpoint testing
import request from 'supertest';
import app from '../app';

describe('Auth Endpoints', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
```

### E2E Testing
```typescript
// Use Playwright for end-to-end tests
import { test, expect } from '@playwright/test';

test.describe('Family Tree', () => {
  test('user can create a new family tree', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click create new tree button
    await page.click('text=Create New Tree');
    
    // Fill in family tree details
    await page.fill('[data-testid=tree-name]', 'Smith Family');
    await page.click('[data-testid=create-tree-submit]');
    
    // Verify tree was created
    await expect(page.locator('text=Smith Family')).toBeVisible();
  });
});
```

## Performance Guidelines

### Frontend Performance
```typescript
// Use React.memo for expensive components
export const FamilyTreeNode = React.memo<FamilyTreeNodeProps>(({ person, onSelect }) => {
  return (
    <div className="family-tree-node">
      {/* Component content */}
    </div>
  );
});

// Use useMemo for expensive calculations
const familyStats = useMemo(() => {
  return calculateFamilyStatistics(familyData);
}, [familyData]);

// Use useCallback for stable function references
const handlePersonSelect = useCallback((person: Person) => {
  setSelectedPerson(person);
  onPersonSelect?.(person);
}, [onPersonSelect]);
```

### Code Splitting
```typescript
// Lazy load heavy components
const FamilyTreeVisualization = lazy(() => import('./FamilyTreeVisualization'));
const DNAAnalysis = lazy(() => import('./DNAAnalysis'));

// Use Suspense for loading states
<Suspense fallback={<LoadingSpinner />}>
  <FamilyTreeVisualization />
</Suspense>
```

## Security Guidelines

### Input Validation
```typescript
// Validate all user inputs
import { z } from 'zod';

const PersonSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  birthDate: z.date().max(new Date()),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say'])
});

// Use schema validation in API endpoints
app.post('/api/persons', async (req, res) => {
  try {
    const validatedData = PersonSchema.parse(req.body);
    // Process validated data
  } catch (error) {
    return res.status(400).json({ error: 'Invalid input data' });
  }
});
```

### Authentication
```typescript
// Protect sensitive routes
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

## Documentation Standards

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
 * // Returns: 'cousin' | 'sibling' | 'parent' | null
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
```typescript
/**
 * @swagger
 * /api/persons:
 *   post:
 *     summary: Create a new person in the family tree
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Person'
 *     responses:
 *       201:
 *         description: Person created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Person'
 */
```

## Error Handling

### Frontend Error Boundaries
```typescript
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>We apologize for the inconvenience. Please try refreshing the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Backend Error Handling
```typescript
// Global error handler
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  const message = error.message || 'Internal server error';

  // Log error for debugging
  console.error('API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
};
```
