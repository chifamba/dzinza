import mongoose, { Schema, Document } from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Person:
 *       type: object
 *       required:
 *         - firstName
 *         - familyTreeId
 *         - userId
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated unique identifier
 *         firstName:
 *           type: string
 *           description: Person's first name
 *         middleName:
 *           type: string
 *           description: Person's middle name
 *         lastName:
 *           type: string
 *           description: Person's last name
 *         maidenName:
 *           type: string
 *           description: Person's maiden name (if applicable)
 *         gender:
 *           type: string
 *           enum: [male, female, other, unknown]
 *           description: Person's gender
 *         birthDate:
 *           type: object
 *           properties:
 *             date:
 *               type: string
 *               format: date
 *             approximate:
 *               type: boolean
 *             accuracy:
 *               type: string
 *               enum: [exact, estimated, before, after, circa]
 *         deathDate:
 *           type: object
 *           properties:
 *             date:
 *               type: string
 *               format: date
 *             approximate:
 *               type: boolean
 *             accuracy:
 *               type: string
 *               enum: [exact, estimated, before, after, circa]
 *         birthPlace:
 *           type: object
 *           properties:
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             country:
 *               type: string
 *             coordinates:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                 longitude:
 *                   type: number
 *         deathPlace:
 *           type: object
 *           properties:
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             country:
 *               type: string
 *             coordinates:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                 longitude:
 *                   type: number
 *         profilePhoto:
 *           type: string
 *           description: URL to profile photo
 *         photos:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of photo URLs
 *         occupation:
 *           type: string
 *           description: Person's occupation
 *         biography:
 *           type: string
 *           description: Person's life story
 *         familyTreeId:
 *           type: string
 *           description: Reference to the family tree this person belongs to
 *         userId:
 *           type: string
 *           description: Reference to the user who created this person
 *         isLiving:
 *           type: boolean
 *           description: Whether the person is still living
 *         privacy:
 *           type: string
 *           enum: [public, family, private]
 *           description: Privacy level for this person's information
 *         sources:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               url:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *         facts:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [birth, death, marriage, divorce, education, military, immigration, census]
 *               date:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                   approximate:
 *                     type: boolean
 *               place:
 *                 type: object
 *                 properties:
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *               description:
 *                 type: string
 *               sources:
 *                 type: array
 *                 items:
 *                   type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export interface IPerson extends Document {
  firstName: string;
  middleName?: string;
  lastName?: string;
  maidenName?: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: {
    date?: Date;
    approximate?: boolean;
    accuracy?: 'exact' | 'estimated' | 'before' | 'after' | 'circa';
  };
  deathDate?: {
    date?: Date;
    approximate?: boolean;
    accuracy?: 'exact' | 'estimated' | 'before' | 'after' | 'circa';
  };
  birthPlace?: {
    city?: string;
    state?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  deathPlace?: {
    city?: string;
    state?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  profilePhoto?: string;
  photos: string[];
  occupation?: string;
  biography?: string;
  familyTreeId: mongoose.Types.ObjectId;
  userId: string;
  isLiving: boolean;
  privacy: 'public' | 'family' | 'private';
  sources: Array<{
    title: string;
    url?: string;
    description?: string;
    date?: Date;
  }>;
  facts: Array<{
    type: 'birth' | 'death' | 'marriage' | 'divorce' | 'education' | 'military' | 'immigration' | 'census';
    date?: {
      date?: Date;
      approximate?: boolean;
    };
    place?: {
      city?: string;
      state?: string;
      country?: string;
    };
    description?: string;
    sources?: string[];
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const PersonSchema: Schema = new Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  middleName: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  maidenName: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'unknown'],
    default: 'unknown',
  },
  birthDate: {
    date: Date,
    approximate: {
      type: Boolean,
      default: false,
    },
    accuracy: {
      type: String,
      enum: ['exact', 'estimated', 'before', 'after', 'circa'],
      default: 'exact',
    },
  },
  deathDate: {
    date: Date,
    approximate: {
      type: Boolean,
      default: false,
    },
    accuracy: {
      type: String,
      enum: ['exact', 'estimated', 'before', 'after', 'circa'],
      default: 'exact',
    },
  },
  birthPlace: {
    city: String,
    state: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  deathPlace: {
    city: String,
    state: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  profilePhoto: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Profile photo must be a valid image URL',
    },
  },
  photos: [{
    type: String,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Photo must be a valid image URL',
    },
  }],
  occupation: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  biography: {
    type: String,
    maxlength: 5000,
  },
  familyTreeId: {
    type: Schema.Types.ObjectId,
    ref: 'FamilyTree',
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  isLiving: {
    type: Boolean,
    default: true,
  },
  privacy: {
    type: String,
    enum: ['public', 'family', 'private'],
    default: 'family',
  },
  sources: [{
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    url: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Source URL must be a valid URL',
      },
    },
    description: {
      type: String,
      maxlength: 500,
    },
    date: Date,
  }],
  facts: [{
    type: {
      type: String,
      enum: ['birth', 'death', 'marriage', 'divorce', 'education', 'military', 'immigration', 'census'],
      required: true,
    },
    date: {
      date: Date,
      approximate: {
        type: Boolean,
        default: false,
      },
    },
    place: {
      city: String,
      state: String,
      country: String,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    sources: [String],
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
PersonSchema.index({ familyTreeId: 1, userId: 1 });
PersonSchema.index({ firstName: 1, lastName: 1 });
PersonSchema.index({ 'birthDate.date': 1 });
PersonSchema.index({ 'deathDate.date': 1 });
PersonSchema.index({ 'birthPlace.country': 1, 'birthPlace.state': 1 });

// Virtual for full name
PersonSchema.virtual('fullName').get(function(this: IPerson) {
  const parts = [this.firstName];
  if (this.middleName) parts.push(this.middleName);
  if (this.lastName) parts.push(this.lastName);
  return parts.join(' ');
});

// Virtual for age
PersonSchema.virtual('age').get(function(this: IPerson) {
  if (!this.birthDate?.date) return null;
  
  const endDate = this.deathDate?.date || new Date();
  const birthYear = this.birthDate.date.getFullYear();
  const endYear = endDate.getFullYear();
  
  let age = endYear - birthYear;
  
  // Adjust for birthday not yet occurred this year
  const birthMonth = this.birthDate.date.getMonth();
  const birthDay = this.birthDate.date.getDate();
  const endMonth = endDate.getMonth();
  const endDay = endDate.getDate();
  
  if (endMonth < birthMonth || (endMonth === birthMonth && endDay < birthDay)) {
    age--;
  }
  
  return age;
});

// Pre-save middleware
PersonSchema.pre('save', function(next) {
  // If person has a death date, mark as not living
  if (this.deathDate?.date && this.isLiving) {
    this.isLiving = false;
  }
  
  // If person is marked as not living but no death date, add estimated death date
  if (!this.isLiving && !this.deathDate?.date && this.birthDate?.date) {
    const estimatedDeathYear = this.birthDate.date.getFullYear() + 85; // Average life expectancy
    this.deathDate = {
      date: new Date(estimatedDeathYear, 0, 1),
      approximate: true,
      accuracy: 'estimated',
    };
  }
  
  next();
});

export const Person = mongoose.model<IPerson>('Person', PersonSchema);
