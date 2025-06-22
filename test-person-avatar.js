// Simple test to create a family member with avatar
const testPerson = {
  id: "test-person-1",
  name: "Sarah Johnson",
  age: 32,
  gender: "female",
  race: "black",
  skinTone: "dark",
  birthDate: "1993-05-15",
  profileImageUrl: null, // Will use generated avatar
};

console.log("Test person data:", testPerson);

// Simulate the avatar generation
function getAgeFromBirthDate(birthDate) {
  if (!birthDate) return undefined;
  const birth = new Date(birthDate);
  const now = new Date();
  return now.getFullYear() - birth.getFullYear();
}

const age = getAgeFromBirthDate(testPerson.birthDate);
console.log("Calculated age:", age);

// Simulate the avatar URL generation
function simulateAvatarGeneration(person) {
  const ageGroup =
    age < 13 ? "child" : age < 20 ? "teen" : age < 60 ? "adult" : "senior";
  const gender =
    person.gender === "male"
      ? "male"
      : person.gender === "female"
      ? "female"
      : "neutral";

  const seedString = `${ageGroup}-${gender}-${person.race}-${person.skinTone}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash = hash & hash;
  }
  const seed = Math.abs(hash);

  return `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&size=1024&backgroundColor=transparent&gender=${gender}`;
}

const avatarUrl = simulateAvatarGeneration(testPerson);
console.log("Generated avatar URL:", avatarUrl);
console.log("This URL should show a realistic avatar for a Black female adult");
