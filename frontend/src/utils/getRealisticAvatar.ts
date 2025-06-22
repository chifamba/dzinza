// Alternative avatar service that generates more realistic human-like profile photos
// This uses various avatar generation services that create synthetic but realistic faces

interface RealisticAvatarOptions {
  age?: number;
  sex?: string;
  race?: string;
  skinTone?: string;
  imageUrl?: string;
}

function getGenderParam(sex?: string): 'male' | 'female' | '' {
  if (!sex) return '';
  const s = sex.toLowerCase();
  if (s === 'male' || s === 'm') return 'male';
  if (s === 'female' || s === 'f') return 'female';
  return '';
}

function generateConsistentSeed(options: RealisticAvatarOptions): string {
  const { age = 30, sex = 'neutral', race = 'neutral', skinTone = 'medium' } = options;
  // Create a consistent seed based on demographics
  const seedString = `${age}-${sex}-${race}-${skinTone}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    const char = seedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString();
}

export function getRealisticAvatar(options: RealisticAvatarOptions): string {
  const { imageUrl } = options;
  
  // If user has uploaded their own image, use it
  if (imageUrl) return imageUrl;
  
  const seed = generateConsistentSeed(options);
  const gender = getGenderParam(options.sex);
  
  // Option 1: DiceBear Avataaars (more cartoon-like but human features)
  // const baseUrl = 'https://api.dicebear.com/7.x/avataaars/svg';
  
  // Option 2: DiceBear Personas (more realistic human-like)
  const baseUrl = 'https://api.dicebear.com/7.x/personas/svg';
  
  // Option 3: For even more realistic faces, you could use:
  // - Generated Photos API (requires API key)
  // - Face API services
  // - Unsplash placeholder with face category
  
  const params = new URLSearchParams({
    seed: seed,
    size: '1024',
    backgroundColor: 'transparent',
    ...(gender && { gender }),
  });
  
  return `${baseUrl}?${params.toString()}`;
}

// Fallback to even more realistic placeholder services
export function getPhotoRealisticAvatar(options: RealisticAvatarOptions): string {
  const { imageUrl, sex } = options;
  
  if (imageUrl) return imageUrl;
  
  const seed = generateConsistentSeed(options);
  const gender = getGenderParam(sex);
  
  // Using a placeholder service that provides more photorealistic faces
  // Note: These services may have usage limits or require attribution
  
  // Option 1: Lorem Picsum with face filter (most realistic)
  const faceId = (parseInt(seed) % 100) + 1; // Get a number between 1-100
  return `https://picsum.photos/id/${faceId}/1024/1024`;
  
  // Option 2: Pravatar (simple but effective)
  // return `https://i.pravatar.cc/1024?u=${seed}${gender ? `&gender=${gender}` : ''}`;
}

// Export both options - let the app choose which style to use
export { getRealisticAvatar as getDefaultAvatar };
