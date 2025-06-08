// src/services/api/authService.ts

// Define interfaces for payloads and responses (can be expanded)
interface LoginPayload {
  email: string;
  password?: string; // Password might not be needed for all auth strategies
}

interface RegisterPayload extends LoginPayload {
  name: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
}

interface AuthResponse {
  user: UserData;
  token: string;
}

const MOCK_DELAY = 1000; // 1 second delay

// Mock user database
const mockUsers: UserData[] = [
  { id: '1', name: 'Test User', email: 'test@example.com' },
];
let nextUserId = 2;

export const authService = {
  login: (payload: LoginPayload): Promise<AuthResponse> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = mockUsers.find(u => u.email === payload.email);
        // In a real app, you'd also check the password hash here
        if (user && payload.password === 'password') { // Mock password check
          resolve({
            user: { id: user.id, name: user.name, email: user.email },
            token: `mock-jwt-token-for-${user.id}-${Date.now()}`,
          });
        } else {
          reject(new Error('Invalid email or password.'));
        }
      }, MOCK_DELAY);
    });
  },

  register: (payload: RegisterPayload): Promise<AuthResponse> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (mockUsers.some(u => u.email === payload.email)) {
          reject(new Error('User with this email already exists.'));
          return;
        }

        const newUser: UserData = {
          id: String(nextUserId++),
          name: payload.name,
          email: payload.email,
        };
        mockUsers.push(newUser); // Add to our mock "database"

        // In a real app, password would be hashed and stored securely.
        // Here, we just simulate success.
        resolve({
          user: newUser,
          token: `mock-jwt-token-for-${newUser.id}-${Date.now()}`, // Or null if email verification is needed
        });
      }, MOCK_DELAY);
    });
  },

  forgotPassword: (email: string): Promise<{ message: string }> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const userExists = mockUsers.some(u => u.email === email);
        if (userExists) {
          console.log(`Simulating password reset email sent to ${email}`);
          resolve({ message: 'If an account with this email exists, a reset link has been sent.' });
        } else {
          // Silently succeed even if user doesn't exist, as per common practice
          resolve({ message: 'If an account with this email exists, a reset link has been sent.' });
        }
      }, MOCK_DELAY);
    });
  },

  resetPassword: (token: string, newPassword: string): Promise<{ message: string }> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // In a real app, you'd validate the token and then update the password.
        if (token && newPassword) {
          console.log(`Simulating password reset for token ${token} with new password.`);
          resolve({ message: 'Password has been reset successfully.' });
        } else {
          reject(new Error('Invalid token or password.'));
        }
      }, MOCK_DELAY);
    });
  },

  logout: (): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate clearing session, etc.
        console.log('User logged out (mock)');
        resolve();
      }, MOCK_DELAY / 2); // Shorter delay for logout
    });
  }
};

// Optional: Export types if they are needed by components directly
// export type { LoginPayload, RegisterPayload, UserData, AuthResponse };
