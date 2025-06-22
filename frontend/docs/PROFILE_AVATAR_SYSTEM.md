# Profile Avatar System

## Overview

The profile avatar system automatically generates realistic, human-like profile photos for users based on their demographic information. When users don't have a custom profile image, the system provides demographic-appropriate default avatars that are consistent, diverse, and professional-looking.

## Features

- **Realistic Human-like Avatars**: Uses external avatar generation services to create realistic profile photos instead of generic icons
- **Demographic-Aware**: Selects avatars based on age, gender, race, and skin tone
- **Consistent**: Same demographic inputs always generate the same avatar
- **Fallback Support**: Gracefully handles image loading errors
- **Customizable**: Easy to switch between different avatar generation services

## Components

### ProfileAvatar Component

The main component for displaying profile avatars with loading states and error handling.

```tsx
<ProfileAvatar
  imageUrl={user.profileImageUrl}
  name={user.name}
  age={user.age}
  sex={user.gender}
  race={user.race}
  skinTone={user.skinTone}
  size="lg"
  className="custom-class"
  onClick={handleClick}
/>
```

**Props:**

- `imageUrl`: User's uploaded profile image URL (optional)
- `name`: User's name for alt text
- `age`: Age for demographic-based avatar selection
- `sex`: Gender ('male', 'female', 'neutral')
- `race`: Ethnicity/race for avatar selection
- `skinTone`: Skin tone ('light', 'medium-light', 'medium', 'medium-dark', 'dark')
- `size`: Avatar size ('sm', 'md', 'lg', 'xl')
- `className`: Additional CSS classes
- `onClick`: Click handler function

### getDefaultAvatar Utility

Core utility function that selects the appropriate avatar based on demographic data.

```typescript
import { getDefaultAvatar } from "../utils/getDefaultAvatar";

const avatarUrl = getDefaultAvatar({
  age: 30,
  sex: "female",
  race: "asian",
  skinTone: "medium",
  imageUrl: user.profileImageUrl, // If user has uploaded image
});
```

## Avatar Generation Services

The system currently supports multiple avatar generation services:

### 1. DiceBear Personas (Default)

- **URL**: `https://api.dicebear.com/7.x/personas/svg`
- **Style**: Realistic human-like illustrations
- **Customization**: Gender-based generation
- **Format**: SVG (scalable)

### 2. Lorem Picsum (Alternative)

- **URL**: `https://picsum.photos`
- **Style**: Real photographs (generic)
- **Customization**: ID-based selection
- **Format**: JPEG

### 3. Pravatar (Alternative)

- **URL**: `https://i.pravatar.cc`
- **Style**: Real human faces
- **Customization**: Gender-based, seed-based
- **Format**: JPEG

## Demographic Parameters

### Age Groups

- **child**: < 13 years
- **teen**: 13-19 years
- **adult**: 20-59 years
- **senior**: 60+ years

### Gender Options

- **male**: Male presentation
- **female**: Female presentation
- **neutral**: Gender-neutral presentation

### Skin Tone Scale

Based on Fitzpatrick scale and emoji skin tone standards:

- **light**: Very light skin
- **medium-light**: Light-medium skin
- **medium**: Medium skin
- **medium-dark**: Medium-dark skin
- **dark**: Dark skin

### Race/Ethnicity

- **asian**: Asian descent
- **black**: African descent
- **white**: European descent
- **latino**: Latino/Hispanic descent
- **native**: Native American descent
- **middleeastern**: Middle Eastern descent
- **pacific**: Pacific Islander descent
- **neutral**: Mixed/unspecified

## Implementation

### In Family Tree Components

The system is integrated into family tree components like `TreePersonNode`, `PersonNode`, and `EditPersonForm`:

```tsx
// TreePersonNode.tsx
<ProfileAvatar
  imageUrl={memberForHandlers.profileImageUrl}
  name={personName}
  age={estimateAge(memberForHandlers.birthDate)}
  sex={memberForHandlers.gender}
  race={personAttributes?.race}
  skinTone={personAttributes?.skinTone}
  size="lg"
  className="mx-auto my-1"
/>
```

### In User Profiles

```tsx
// Profile page
<ProfileAvatar
  imageUrl={user.profileImageUrl}
  name={user.name}
  age={user.age}
  sex={user.gender}
  race={user.race}
  skinTone={user.skinTone}
  size="xl"
/>
```

## Customization

### Switching Avatar Services

To use a different avatar service, modify the `getDefaultAvatar` function in `/src/utils/getDefaultAvatar.ts`:

```typescript
// For more photorealistic faces
const faceId = (parseInt(seed) % 100) + 1;
return `https://picsum.photos/id/${faceId}/1024/1024`;

// For Pravatar
return `https://i.pravatar.cc/1024?u=${seed}${
  sexNorm !== "neutral" ? `&gender=${sexNorm}` : ""
}`;
```

### Adding New Demographic Parameters

1. Update the `AvatarOptions` interface
2. Add normalization functions
3. Include in seed generation
4. Update component prop types

## Performance Considerations

- **Lazy Loading**: Images use `loading="lazy"` attribute
- **Consistent Seeds**: Same demographic data generates same avatar URL for caching
- **Error Handling**: Fallback to generated avatar if user image fails
- **Loading States**: Shows placeholder while image loads

## Privacy & Ethics

- **No Real Photos**: Uses only generated/synthetic faces
- **Inclusive Representation**: Covers diverse demographics
- **Consistent Identity**: Users see the same avatar across sessions
- **Optional**: Users can always upload their own photos

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- SVG support for DiceBear avatars
- External image loading capabilities

## Future Enhancements

- Age progression/regression based on birth year
- Clothing/style variations
- Accessibility improvements
- Offline avatar generation
- Custom avatar creation tools
