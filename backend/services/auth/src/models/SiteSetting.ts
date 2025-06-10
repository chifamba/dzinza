import mongoose, { Document, Schema, Model } from 'mongoose';

const GLOBAL_SETTINGS_ID = 'global_settings';

// Define available feature flags explicitly if possible, for better type safety
// For this example, we'll keep it as a generic Map.
// interface FeatureFlags {
//   newOnboarding?: boolean;
//   betaFeatureX?: boolean;
//   [key: string]: boolean | undefined;
// }

export interface ISiteSetting extends Document {
  _id: string; // Should always be GLOBAL_SETTINGS_ID
  siteName: string;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  defaultLanguage: 'en' | 'sn' | 'nd';
  contactEmail?: string;
  featureFlags: Map<string, boolean>;
  updatedBy?: mongoose.Types.ObjectId; // Reference to the User who last updated
  createdAt: Date;
  updatedAt: Date;
}

const SiteSettingSchema: Schema<ISiteSetting> = new Schema(
  {
    _id: {
      type: String,
      default: GLOBAL_SETTINGS_ID,
    },
    siteName: {
      type: String,
      trim: true,
      default: 'Dzinza Platform',
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    allowNewRegistrations: {
      type: Boolean,
      default: true,
    },
    defaultLanguage: {
      type: String,
      enum: ['en', 'sn', 'nd'],
      default: 'en',
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      optional: true, // Make it explicitly optional in schema if not always required
      // Basic email regex validation can be added here if desired,
      // but express-validator is also good for this at route level.
      // match: [/.+\@.+\..+/, 'Please fill a valid email address'],
    },
    featureFlags: {
      type: Map,
      of: Boolean,
      default: () => new Map(), // Ensure default is a new Map instance
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Assumes 'User' is the name of your User model
      nullable: true, // Mongoose doesn't have 'optional' for refs in this way, use 'required: false' or ensure it can be null/undefined
      required: false, // Explicitly not required
    },
  },
  {
    timestamps: true,
    // Ensure _id is not auto-generated if we are setting a default
    // However, Mongoose handles default _id string correctly without this typically.
    // _id: false
  }
);

// Ensure only one document can exist by overriding save or using a pre-save hook
// For simplicity with findOneAndUpdate and upsert:true, this might not be strictly needed
// if all operations correctly target the GLOBAL_SETTINGS_ID.

// Static method to get the settings, creating if not exist
SiteSettingSchema.statics.getSettings = async function () {
  let settings = await this.findById(GLOBAL_SETTINGS_ID);
  if (!settings) {
    // If no settings document exists, create one with defaults
    // This ensures that there's always a settings document to work with
    settings = new this({ _id: GLOBAL_SETTINGS_ID }); // Default values from schema will apply
    await settings.save();
  }
  return settings;
};


const SiteSetting: Model<ISiteSetting> & { getSettings: () => Promise<ISiteSetting> }
  = mongoose.model<ISiteSetting, Model<ISiteSetting> & { getSettings: () => Promise<ISiteSetting> }>('SiteSetting', SiteSettingSchema);

export { SiteSetting, GLOBAL_SETTINGS_ID };
