import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { User, IUser } from '../models/User';
import { logger } from '../utils/logger';
// import { v4 as uuidv4 } from 'uuid'; // No longer needed here directly
// import bcrypt from 'bcryptjs'; // No longer needed here directly
import { handleGoogleUser } from '../utils/socialAuthHandler'; // Import the new handler

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
  logger.error('Google OAuth environment variables are not set. GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL must be defined.');
  // Depending on strictness, you might want to throw an error or exit
  // throw new Error('Google OAuth environment variables are not set.');
}

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID!,
  clientSecret: GOOGLE_CLIENT_SECRET!,
  callbackURL: GOOGLE_CALLBACK_URL!,
},
async (accessToken: string, refreshToken: string, profile: Profile, done: (error: any, user?: any) => void) => {
  try {
    const user = await handleGoogleUser(profile);
    return done(null, user);
  } catch (error: any) { // Explicitly type error as any or Error
    logger.error('Error in Google OAuth strategy verify callback', { error: error.message, stack: error.stack });
    return done(error, false);
  }
}));

// Serialize user to store in session (if sessions were used)
// For JWT-based auth, this is less critical but good Passport practice.
passport.serializeUser((user: any, done) => {
  done(null, user._id); // Use user._id from Mongoose
});

// Deserialize user from session (if sessions were used)
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    logger.error('Error deserializing user', { error, userId: id });
    done(error, null);
  }
});

export default passport;
}));
