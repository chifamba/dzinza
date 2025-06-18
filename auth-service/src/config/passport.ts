import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { v4 as uuidv4 } from "uuid"; // Import uuid v4
import { User } from "../models/User";

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists
          let user = await User.findByEmail(profile.emails?.[0]?.value || "");

          if (!user) {
            // Create new user
            user = await User.create({
              id: uuidv4(), // Use uuidv4
              email: profile.emails?.[0]?.value || "",
              password: "", // No password for OAuth users
              firstName: profile.name?.givenName || "",
              lastName: profile.name?.familyName || "",
              preferredLanguage: "en",
              emailVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
}

// Facebook OAuth Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: "/auth/facebook/callback",
        profileFields: ["id", "emails", "name"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Similar logic as Google strategy
          let user = await User.findByEmail(profile.emails?.[0]?.value || "");

          if (!user) {
            user = await User.create({
              id: uuidv4(), // Use uuidv4
              email: profile.emails?.[0]?.value || "",
              password: "",
              firstName: profile.name?.givenName || "",
              lastName: profile.name?.familyName || "",
              preferredLanguage: "en",
              emailVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
