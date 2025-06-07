# Code Standards (Layer 3)

## Overview

This document defines the implementation guidelines and coding standards for the Dzinza project. These standards ensure consistency, readability, and maintainability across the codebase.

## General Coding Prin### React Component Standards

#### Component Structure
```tsx
// Use functional components with hooks
interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  onUpdate
}) => {
  const { t } = useTranslation('userProfile'); // Internationalization hook
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);ty Over Cleverness
- Write code that tells a story
- Prefer explicit over implicit
- Use meaningful names for variables, functions, and classes
- Avoid abbreviations unless they're widely understood
- Comment the "why," not the "what"

### Consistency
- Follow established patterns within the codebase
- Use consistent naming conventions
- Apply consistent formatting and style
- Maintain consistent error handling patterns
- Use consistent API response formats

### Simplicity
- Keep functions small and focused
- Avoid deep nesting (max 3 levels)
- Use early returns to reduce complexity
- Prefer composition over inheritance
- Extract complex logic into well-named functions

## TypeScript/JavaScript Standards

### Naming Conventions

#### Variables and Functions
```typescript
// Use camelCase for variables and functions
const userProfile = getUserProfile();
const calculateTotalPrice = (items: Item[]) => { /* ... */ };

// Use descriptive names
const isUserAuthenticated = checkAuthentication(); // Good
const flag = checkAuth(); // Avoid

// Boolean variables should be questions
const isVisible = true;
const hasPermission = false;
const canEdit = user.role === 'admin';
```

#### Classes and Interfaces
```typescript
// Use PascalCase for classes and interfaces
class UserService {
  // Use camelCase for methods
  async findUserById(id: string): Promise<User> { /* ... */ }
}

interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
}

// Prefix interfaces with 'I' only when needed for disambiguation
interface IUserRepository { /* ... */ } // Only if class UserRepository exists
```

#### Constants and Enums
```typescript
// Use SCREAMING_SNAKE_CASE for constants
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.dzinza.com';

// Use PascalCase for enums
enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}
```

### Function Guidelines

#### Function Size and Complexity
```typescript
// Keep functions small and focused (max 20 lines preferred)
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Extract complex logic into separate functions
const processUserRegistration = async (userData: UserData) => {
  validateUserData(userData);
  const hashedPassword = await hashPassword(userData.password);
  const user = await createUser({ ...userData, password: hashedPassword });
  await sendWelcomeEmail(user.email);
  return user;
};
```

#### Parameter Guidelines
```typescript
// Limit function parameters (max 4 preferred)
// Use objects for multiple parameters
const createUser = ({
  email,
  password,
  firstName,
  lastName,
  role = UserRole.USER
}: CreateUserParams) => {
  // Implementation
};

// Use default parameters instead of checking for undefined
const fetchUsers = (limit = 10, offset = 0) => {
  // Implementation
};
```

### Type Definitions

#### Type Safety
```typescript
// Use strict typing, avoid 'any'
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Use union types for known values
type Theme = 'light' | 'dark' | 'auto';

// Use generic types for reusable components
interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}
```

#### Type Organization
```typescript
// Export types from dedicated files
// types/user.ts
export interface User { /* ... */ }
export interface CreateUserRequest { /* ... */ }
export interface UpdateUserRequest { /* ... */ }

// Use barrel exports for easy importing
// types/index.ts
export * from './user';
export * from './project';
export * from './api';
```

### Error Handling

#### Exception Handling
```typescript
// Use specific error types
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Handle errors at appropriate levels
const processPayment = async (paymentData: PaymentData) => {
  try {
    validatePaymentData(paymentData);
    return await chargeCard(paymentData);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error; // Re-throw validation errors
    }
    // Log unexpected errors and throw generic error
    logger.error('Payment processing failed', { error, paymentData });
    throw new Error('Payment processing failed');
  }
};
```

#### Result Pattern for Expected Errors
```typescript
// Use Result pattern for operations that can fail
type Result<T, E> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

const parseUserInput = (input: string): Result<User, ValidationError> => {
  try {
    const user = JSON.parse(input);
    if (validateUser(user)) {
      return { success: true, data: user };
    }
    return { success: false, error: new ValidationError('Invalid user data') };
  } catch {
    return { success: false, error: new ValidationError('Invalid JSON') };
  }
};
```

### Async/Await Guidelines

```typescript
// Use async/await over Promises.then()
const fetchUserData = async (userId: string): Promise<User> => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
};

// Handle concurrent operations properly
const fetchUserAndProjects = async (userId: string) => {
  const [user, projects] = await Promise.all([
    userRepository.findById(userId),
    projectRepository.findByUserId(userId)
  ]);
  return { user, projects };
};

// Use proper error handling with async/await
const processAsyncOperation = async () => {
  try {
    const result = await someAsyncOperation();
    return result;
  } catch (error) {
    logger.error('Async operation failed', { error });
    throw error;
  }
};
```

## React Component Standards

### Component Structure
```tsx
// Use functional components with hooks
interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  onUpdate
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effects
  useEffect(() => {
    loadUser();
  }, [userId]);

  // Event handlers
  const handleUpdateUser = async (userData: Partial<User>) => {
    try {
      const updatedUser = await updateUser(userId, userData);
      setUser(updatedUser);
      onUpdate?.(updatedUser);
    } catch (err) {
      setError('Failed to update user');
    }
  };

  // Helper functions
  const loadUser = async () => {
    try {
      setLoading(true);
      const userData = await fetchUser(userId);
      setUser(userData);
    } catch (err) {
      setError('Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  // Render helpers
  const renderError = () => (
    <div className="error-message">
      {t('error.loadFailed', { defaultValue: error })}
    </div>
  );

  const renderLoading = () => (
    <div className="loading-spinner">
      {t('common.loading', { defaultValue: 'Loading...' })}
    </div>
  );

  // Main render
  if (loading) return renderLoading();
  if (error) return renderError();
  if (!user) return null;

  return (
    <div className="user-profile">
      {/* Component JSX */}
    </div>
  );
};

export default UserProfile;
```

### Hook Guidelines
```tsx
// Custom hooks for reusable logic
const useUser = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await fetchUser(userId);
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { user, loading, error, refetch };
};

// Use the hook in components
const UserComponent: React.FC<{ userId: string }> = ({ userId }) => {
  const { user, loading, error, refetch } = useUser(userId);
  
  // Component logic
};
```

### Props and State Management
```tsx
// Define clear prop interfaces
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// Use children prop appropriately
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({
  isOpen,
  onClose,
  children
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};
```

## CSS/Styling Standards

### Tailwind CSS Guidelines
```tsx
// Use semantic class names for complex combinations
const buttonClasses = cn(
  'px-4 py-2 rounded-md font-medium transition-colors',
  {
    'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
    'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
    'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
  },
  className
);

// Extract repeated patterns into components
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => (
  <div className={cn('bg-white rounded-lg shadow-md p-6', className)}>
    {children}
  </div>
);
```

### Responsive Design
```tsx
// Use Tailwind's responsive prefixes consistently
<div className="
  grid grid-cols-1 gap-4
  md:grid-cols-2 md:gap-6
  lg:grid-cols-3 lg:gap-8
">
  {/* Content */}
</div>

// Define breakpoint constants for consistency
const BREAKPOINTS = {
  mobile: '640px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px'
} as const;
```

## Testing Standards

### Unit Test Structure
```typescript
// Use descriptive test names
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'securePassword123',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Act
      const user = await userService.createUser(userData);

      // Assert
      expect(user).toMatchObject({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName
      });
      expect(user.id).toBeDefined();
      expect(user.password).not.toBe(userData.password); // Should be hashed
    });

    it('should throw ValidationError for invalid email', async () => {
      // Arrange
      const userData = {
        email: 'invalid-email',
        password: 'securePassword123',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
```

### Test Helpers and Fixtures
```typescript
// Create reusable test helpers
const createTestUser = (overrides?: Partial<User>): User => ({
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// Use factories for complex test data
const UserFactory = {
  build: (overrides?: Partial<User>) => createTestUser(overrides),
  buildMany: (count: number, overrides?: Partial<User>) =>
    Array.from({ length: count }, () => createTestUser(overrides))
};
```

## Documentation Standards

### Code Comments
```typescript
/**
 * Calculates the total price including taxes and discounts
 * 
 * @param items - Array of items to calculate price for
 * @param taxRate - Tax rate as decimal (e.g., 0.1 for 10%)
 * @param discountCode - Optional discount code to apply
 * @returns Object containing subtotal, tax, discount, and total
 * 
 * @example
 * ```typescript
 * const price = calculateTotal(
 *   [{ price: 100, quantity: 2 }],
 *   0.1,
 *   'SAVE10'
 * );
 * console.log(price.total); // 198 (200 - 10% discount + 10% tax)
 * ```
 */
const calculateTotal = (
  items: CartItem[],
  taxRate: number,
  discountCode?: string
): PriceCalculation => {
  // Implementation details...
};

// Use inline comments for complex business logic
const processPayment = async (amount: number) => {
  // Apply fraud detection before processing
  // This checks against our ML model for suspicious patterns
  const fraudScore = await fraudDetection.analyze(amount, userId);
  if (fraudScore > FRAUD_THRESHOLD) {
    throw new FraudDetectedError('Payment flagged for review');
  }
  
  // Process payment through payment gateway
  return await paymentGateway.charge(amount);
};
```

### README Documentation
```markdown
# Component/Module Name

Brief description of what this component/module does.

## Usage

```typescript
import { ComponentName } from './ComponentName';

const example = () => (
  <ComponentName prop1="value" prop2={123} />
);
```

## Props/Parameters

| Name | Type | Default | Description |
|------|------|---------|-------------|
| prop1 | string | - | Description of prop1 |
| prop2 | number | 0 | Description of prop2 |

## Examples

Provide real-world usage examples.

## Notes

Any important implementation details or gotchas.
```

## Performance Guidelines

### Optimization Strategies
```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }: { data: ComplexData }) => {
  // Expensive rendering logic
  return <div>{/* Complex JSX */}</div>;
});

// Use useMemo for expensive calculations
const ExpensiveCalculation: React.FC<{ items: Item[] }> = ({ items }) => {
  const expensiveValue = useMemo(() => {
    return items.reduce((acc, item) => acc + complexCalculation(item), 0);
  }, [items]);

  return <div>{expensiveValue}</div>;
};

// Use useCallback for event handlers passed to child components
const Parent: React.FC = () => {
  const [count, setCount] = useState(0);
  
  const handleClick = useCallback(() => {
    setCount(prev => prev + 1);
  }, []);

  return <Child onClick={handleClick} />;
};
```

### Database Query Optimization
```typescript
// Use proper indexing hints in queries
const findUsersByRole = async (role: UserRole) => {
  // This query should use the index on (role, active)
  return await db.user.findMany({
    where: {
      role,
      active: true
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true
      // Don't select unnecessary fields
    }
  });
};

// Use pagination for large datasets
const getUsersPaginated = async (page: number, limit: number = 20) => {
  const offset = (page - 1) * limit;
  return await db.user.findMany({
    skip: offset,
    take: limit,
    orderBy: { createdAt: 'desc' }
  });
};
```

---

**Remember**: These standards are guidelines to improve code quality and maintainability. When in doubt, prioritize clarity and consistency with the existing codebase.
