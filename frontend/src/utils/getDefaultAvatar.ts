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
  if (!age) return "adult";
  if (age < 13) return "child";
  if (age < 20) return "teen";
  if (age < 60) return "adult";
  return "senior";
}

function normalizeSex(sex?: string): string {
  if (!sex) return "neutral";
  const s = sex.toLowerCase().trim();

  // Handle common variations of male
  if (s === "male" || s === "m" || s === "man" || s === "masculine")
    return "male";

  // Handle common variations of female
  if (s === "female" || s === "f" || s === "woman" || s === "feminine")
    return "female";

  // Everything else defaults to neutral
  return "neutral";
}

function normalizeRace(race?: string): string {
  if (!race) return "neutral";
  const r = race.toLowerCase();
  if (
    [
      "asian",
      "black",
      "white",
      "latino",
      "hispanic",
      "native",
      "middleeastern",
      "pacific",
    ].includes(r)
  )
    return r;
  return "neutral";
}

function normalizeSkinTone(skinTone?: string): string {
  if (!skinTone) return "medium";
  const t = skinTone.toLowerCase();
  if (["light", "medium", "dark", "mediumdark", "mediumlight"].includes(t))
    return t;
  // Map Fitzpatrick scale or hex to closest
  if (t.includes("1") || t.includes("2")) return "light";
  if (t.includes("3") || t.includes("4")) return "medium";
  if (t.includes("5") || t.includes("6")) return "dark";
  return "medium";
}

// Generate a seed based on demographic info for consistent avatars
function generateSeed(
  ageGroup: string,
  sex: string,
  race: string,
  skinTone: string
): string {
  // Create a deterministic seed that ensures same demographics always get same avatar
  const baseString = `${ageGroup}-${sex}-${race}-${skinTone}`;

  // Add some variation but keep it deterministic
  let hash = 0;
  for (let i = 0; i < baseString.length; i++) {
    const char = baseString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert hash to positive number and create readable seed
  const positiveHash = Math.abs(hash);
  return `${baseString}-${positiveHash}`.replace(/[^a-zA-Z0-9-]/g, "");
}

export function getDefaultAvatar({
  age,
  sex,
  race,
  skinTone,
  imageUrl,
}: AvatarOptions): string {
  if (imageUrl) return imageUrl;

  const ageGroup = getAgeGroup(age);
  const sexNorm = normalizeSex(sex);
  const raceNorm = normalizeRace(race);
  const skinNorm = normalizeSkinTone(skinTone);

  // Create a more specific seed that ensures proper demographic representation
  const baseSeed = generateSeed(ageGroup, sexNorm, raceNorm, skinNorm);

  // Use different avatar styles based on age group for better representation
  let avatarStyle = "avataaars"; // Good for adults with clear gender distinctions
  let additionalParams: Record<string, string> = {};

  if (ageGroup === "child") {
    avatarStyle = "fun-emoji"; // More child-friendly style
    additionalParams = {
      mouth: ["happy", "smile", "laughing"][
        Math.abs(baseSeed.charCodeAt(0)) % 3
      ],
      eyes: ["happy", "wink", "hearts"][Math.abs(baseSeed.charCodeAt(1)) % 3],
    };
  } else if (ageGroup === "teen") {
    avatarStyle = "avataaars-neutral"; // Teen-appropriate style
    additionalParams = {
      accessoriesChance: "20",
      clothingGraphic: "none",
    };
  } else if (ageGroup === "senior") {
    avatarStyle = "personas"; // More mature/sophisticated style
    additionalParams = {
      beard:
        sexNorm === "male"
          ? ["light", "medium"][Math.abs(baseSeed.charCodeAt(2)) % 2]
          : "none",
      hair: ["short", "medium"][Math.abs(baseSeed.charCodeAt(3)) % 2],
    };
  } else {
    // Adult - use avataaars with explicit gender styling
    avatarStyle = "avataaars";
    if (sexNorm === "male") {
      additionalParams = {
        topType: [
          "ShortHairShortCurly",
          "ShortHairShortFlat",
          "ShortHairShortRound",
          "ShortHairSides",
        ][Math.abs(baseSeed.charCodeAt(0)) % 4],
        facialHairType: [
          "Blank",
          "BeardMedium",
          "BeardLight",
          "MoustacheFancy",
        ][Math.abs(baseSeed.charCodeAt(1)) % 4],
        clothingType: ["BlazerShirt", "Hoodie", "ShirtCrewNeck"][
          Math.abs(baseSeed.charCodeAt(2)) % 3
        ],
      };
    } else if (sexNorm === "female") {
      additionalParams = {
        topType: [
          "LongHairStraight",
          "LongHairCurly",
          "LongHairBigHair",
          "LongHairBob",
        ][Math.abs(baseSeed.charCodeAt(0)) % 4],
        facialHairType: "Blank",
        clothingType: ["BlazerSweater", "Hoodie", "ShirtCrewNeck"][
          Math.abs(baseSeed.charCodeAt(2)) % 3
        ],
        accessoriesType: ["Blank", "Prescription01", "Sunglasses"][
          Math.abs(baseSeed.charCodeAt(3)) % 3
        ],
      };
    }
  }

  const baseUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg`;
  const params = new URLSearchParams({
    seed: baseSeed,
    size: "1024",
    backgroundColor: "transparent",
    // Clear gender specification
    ...(sexNorm === "male" && { gender: "male" }),
    ...(sexNorm === "female" && { gender: "female" }),
    // Add age-appropriate and gender-appropriate styling
    ...additionalParams,
  });

  console.log(`Generated avatar for ${ageGroup} ${sexNorm}:`, {
    url: `${baseUrl}?${params.toString()}`,
    params: Object.fromEntries(params.entries()),
    demographics: { ageGroup, sexNorm, raceNorm, skinNorm },
  });

  return `${baseUrl}?${params.toString()}`;
}
