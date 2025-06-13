import { User, IUser } from '../models/User';
import { Profile as GoogleProfile } from 'passport-google-oauth20'; // Rename to avoid conflict if Profile is used locally
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { logger } from './logger';

/**
 * Handles user lookup or creation based on Google profile.
 * @param profile - Profile object from passport-google-oauth20.
 * @returns {Promise<IUser>} The found or created user.
 * @throws Error if email is missing or if there's an email conflict with a different Google ID.
 */
export async function handleGoogleUser(profile: GoogleProfile): Promise<IUser> {
  if (!profile.emails || profile.emails.length === 0) {
    logger.error('Google profile did not return email.', { googleId: profile.id });
    throw new Error('No email found in Google profile');
  }
  const email = profile.emails[0].value;
  const googleId = profile.id;

  let user = await User.findOne({ email });

  if (user) {
    // User exists with this email
    if (!user.googleId) {
      // Link Google account if not already linked
      user.googleId = googleId;
      // If user existed as 'local' and verified email, keep it verified.
      // If they existed as 'local' but email was not verified, Google now verifies it.
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
      }
      // Potentially update authProvider if they were 'local' before.
      // However, a user might have both local password and Google login.
      // For simplicity here, if they link Google, we mark it.
      // If they were 'local', they remain 'local' but also have 'googleId'.
      // The passport.ts created 'google' as authProvider. We can refine this.
      // Let's assume if googleId is set, it's a valid way to authenticate.
      // The authProvider could be an array or have a primary.
      // For now, matching the passport.ts logic:
      if (user.authProvider !== 'google') { // If it was local, now also google
        // user.authProvider = 'google'; // Or add to an array if multiple providers allowed
      }
      // The User model already has authProvider defaulting to 'local'.
      // If a user signs up with Google first, authProvider will be 'google'.
      // If they signed up locally, then link Google, we should probably keep authProvider as 'local'
      // and just use googleId for linking. Or, update authProvider to 'google' if we want
      // Google to be the primary method after linking.
      // For this implementation, let's assume linking googleId is enough and isEmailVerified is set.
      // The initial passport.ts set authProvider to 'google'. Let's stick to that for now when googleId is set.
      user.authProvider = 'google';

      await user.save();
      logger.info('Linked Google account to existing user', { userId: user._id, email });
    } else if (user.googleId !== googleId) {
      // User exists with this email, but googleId is different. This is a conflict.
      logger.error('Email conflict: User exists with this email but a different Google ID.', { email, existingGoogleId: user.googleId, newGoogleId: googleId });
      throw new Error('Email is associated with a different Google account.');
    }
    // If user.googleId === googleId, it's the same user logging in.
  } else {
    // No user with this email, create a new one
    const newUserPartial: Partial<IUser> = {
      // Mongoose generates _id by default if not provided as string _id: uuidv4()
      email,
      googleId,
      firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User',
      lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '',
      isEmailVerified: true, // Email from Google is considered verified
      authProvider: 'google', // New user via Google
      roles: ['user'], // Default role
    };

    // Handle password if schema requires it (even for social logins)
    // The User model was updated to make password conditional (required if authProvider === 'local')
    // So, this explicit password generation might not be needed if User model handles it.
    // However, if we want to ensure no validation error occurs before save:
    if (User.schema.path('password')?.isRequired && newUserPartial.authProvider !== 'local') {
        // This condition should not be met if password is not required for 'google' provider
    } else if (!User.schema.path('password')?.isRequired || newUserPartial.authProvider !== 'local') {
        // Password is not required or not a local auth, so no need to generate.
    } else { // Password is required and it's a local auth (should not happen for new Google user)
        const randomPassword = await bcrypt.hash(uuidv4(), 12);
        (newUserPartial as IUser).password = randomPassword;
    }

    user = await User.create(newUserPartial as IUser);
    logger.info('Created new user via Google OAuth', { userId: user._id, email });
  }
  return user;
}
