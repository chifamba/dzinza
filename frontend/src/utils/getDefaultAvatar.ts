// Utility to select the correct default avatar based on demographic info
// Usage: getDefaultAvatar({ age, sex, race, skinTone, imageUrl })

interface AvatarOptions {
  age?: number;
  sex?: string;
  race?: string;
  skinTone?: string;
  imageUrl?: string;
}

function getAgeGroup(age?: number): string {
  if (!age) return 'adult';
  if (age < 13) return 'child';
  if (age < 20) return 'teen';
  if (age < 60) return 'adult';
  return 'senior';
}

function normalizeSex(sex?: string): string {
  if (!sex) return 'neutral';
  const s = sex.toLowerCase();
  if (s === 'male' || s === 'm') return 'male';
  if (s === 'female' || s === 'f') return 'female';
  return 'neutral';
}

function normalizeRace(race?: string): string {
  if (!race) return 'neutral';
  const r = race.toLowerCase();
  if (['asian', 'black', 'white', 'latino', 'hispanic', 'native', 'middleeastern', 'pacific'].includes(r)) return r;
  return 'neutral';
}

function normalizeSkinTone(skinTone?: string): string {
  if (!skinTone) return 'medium';
  const t = skinTone.toLowerCase();
  if (['light', 'medium', 'dark', 'mediumdark', 'mediumlight'].includes(t)) return t;
  // Map Fitzpatrick scale or hex to closest
  if (t.includes('1') || t.includes('2')) return 'light';
  if (t.includes('3') || t.includes('4')) return 'medium';
  if (t.includes('5') || t.includes('6')) return 'dark';
  return 'medium';
}

// Generate a seed based on demographic info for consistent avatars
function generateSeed(ageGroup: string, sex: string, race: string, skinTone: string): string {
  return `${ageGroup}-${sex}-${race}-${skinTone}`.replace(/[^a-zA-Z0-9-]/g, '');
}

export function getDefaultAvatar({ age, sex, race, skinTone, imageUrl }: AvatarOptions): string {
  if (imageUrl) return imageUrl;
  
  const ageGroup = getAgeGroup(age);
  const sexNorm = normalizeSex(sex);
  const raceNorm = normalizeRace(race);
  const skinNorm = normalizeSkinTone(skinTone);
  
  const seed = generateSeed(ageGroup, sexNorm, raceNorm, skinNorm);
  
  // Use DiceBear API for realistic human-like avatars
  // You can also use other services like Pravatar, RoboHash, or UI Avatars
  const baseUrl = 'https://api.dicebear.com/7.x/personas/svg';
  const params = new URLSearchParams({
    seed: seed,
    size: '1024',
    backgroundColor: 'transparent',
    ...(sexNorm !== 'neutral' && { gender: sexNorm === 'male' ? 'male' : 'female' }),
  });
  
  return `${baseUrl}?${params.toString()}`;
  
  // Alternative: For more photorealistic faces (uncomment to use):
  // const faceId = (parseInt(seed) % 100) + 1;
  // return `https://picsum.photos/id/${faceId}/1024/1024`;
  
  // Alternative: Pravatar for simple realistic faces:
  // return `https://i.pravatar.cc/1024?u=${seed}${sexNorm !== 'neutral' ? `&gender=${sexNorm}` : ''}`;
}
