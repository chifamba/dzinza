// src/services/api/authService.ts

// Ensure this UserData interface is consistent with authSlice.ts
export interface UserData { // Export if not already
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
}

interface LoginPayload {
  email: string;
  password?: string;
}

interface RegisterPayload extends LoginPayload {
  name: string;
}

interface AuthResponse {
  user: UserData;
  token: string;
}

const MOCK_DELAY = 1000;

// Mock user database - ensure users have 'id'
const mockUsers: UserData[] = [
  { id: '1', name: 'Test User', email: 'test@example.com', profileImageUrl: 'https://via.placeholder.com/150/0000FF/808080?Text=User1' },
  // Add more mock users if needed for testing getUserProfile with different IDs
];
let nextUserId = mockUsers.length > 0 ? Math.max(...mockUsers.map(u => parseInt(u.id))) + 1 : 1;


export const authService = {
  login: (payload: LoginPayload): Promise<AuthResponse> => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            const user = mockUsers.find(u => u.email === payload.email);
            // In a real app, you'd also check the password hash here
            if (user && payload.password === 'password') { // Mock password check
              resolve({
                user: { id: user.id, name: user.name, email: user.email, profileImageUrl: user.profileImageUrl },
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
              profileImageUrl: `https://via.placeholder.com/150/CCCCCC/808080?Text=${payload.name.substring(0,1)}`
            };
            mockUsers.push(newUser);

            resolve({
              user: newUser,
              token: `mock-jwt-token-for-${newUser.id}-${Date.now()}`,
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
              resolve({ message: 'If an account with this email exists, a reset link has been sent.' });
            }
          }, MOCK_DELAY);
        });
      },
  resetPassword: (token: string, newPassword: string): Promise<{ message: string }> => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
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
            console.log('User logged out (mock)');
            resolve();
          }, MOCK_DELAY / 2);
        });
      },

  // New mock service functions for profile
  getUserProfile: (userId: string): Promise<UserData> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = mockUsers.find(u => u.id === userId);
        if (user) {
          resolve(user);
        } else {
          reject(new Error('User not found.'));
        }
      }, MOCK_DELAY);
    });
  },

  updateUserProfile: (userId: string, data: Partial<UserData>): Promise<UserData> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const userIndex = mockUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          const updatedUser = { ...mockUsers[userIndex], ...data };
          mockUsers[userIndex] = updatedUser;
          resolve(updatedUser);
        } else {
          reject(new Error('User not found. Cannot update profile.'));
        }
      }, MOCK_DELAY);
    });
  }
};
