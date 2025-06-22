import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";

const AvatarTestPage: React.FC = () => {
  const testUsers = [
    {
      name: "John Smith",
      age: 35,
      sex: "male",
      race: "white",
      skinTone: "light",
      profileImageUrl: undefined,
    },
    {
      name: "Maria Garcia",
      age: 28,
      sex: "female",
      race: "latino",
      skinTone: "medium",
      profileImageUrl: undefined,
    },
    {
      name: "Chen Wei",
      age: 42,
      sex: "male",
      race: "asian",
      skinTone: "medium",
      profileImageUrl: undefined,
    },
    {
      name: "Aisha Johnson",
      age: 31,
      sex: "female",
      race: "black",
      skinTone: "dark",
      profileImageUrl: undefined,
    },
    {
      name: "Alex Thompson",
      age: 26,
      sex: "neutral",
      race: "white",
      skinTone: "mediumlight",
      profileImageUrl: undefined,
    },
    {
      name: "Sarah Davis",
      age: 67,
      sex: "female",
      race: "white",
      skinTone: "light",
      profileImageUrl: undefined,
    },
    {
      name: "Miguel Santos",
      age: 15,
      sex: "male",
      race: "latino",
      skinTone: "mediumdark",
      profileImageUrl: undefined,
    },
    {
      name: "Emma Wilson",
      age: 8,
      sex: "female",
      race: "white",
      skinTone: "light",
      profileImageUrl: undefined,
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">
        ProfileAvatar Test Page
      </h1>
      <p className="text-center text-gray-600 mb-8">
        Testing realistic avatar generation based on demographic data
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {testUsers.map((user, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md p-4 text-center"
          >
            <ProfileAvatar
              imageUrl={user.profileImageUrl}
              name={user.name}
              age={user.age}
              sex={user.sex}
              race={user.race}
              skinTone={user.skinTone}
              size="xl"
              className="mb-3"
            />
            <h3 className="font-semibold text-lg">{user.name}</h3>
            <div className="text-sm text-gray-600 mt-2">
              <p>Age: {user.age}</p>
              <p>Gender: {user.sex}</p>
              <p>Race: {user.race}</p>
              <p>Skin: {user.skinTone}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Avatar System Features:</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>
            Realistic human-like avatars generated via DiceBear Personas API
          </li>
          <li>
            Demographic-aware selection based on age, gender, race, and skin
            tone
          </li>
          <li>
            Consistent avatars - same demographics always generate the same
            image
          </li>
          <li>Graceful fallback when user images fail to load</li>
          <li>Loading states and error handling</li>
          <li>Multiple size options (sm, md, lg, xl)</li>
        </ul>
      </div>
    </div>
  );
};

export default AvatarTestPage;
