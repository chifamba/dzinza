// src/components/family-tree/PersonNode.tsx
import React from "react";
import { FamilyMember } from "../../types/genealogy";
import { Button, Card } from "../ui";
import ProfileAvatar from "../ProfileAvatar";

interface PersonNodeProps {
  person: FamilyMember;
  onEdit: (person: FamilyMember) => void;
  onConnectRelationship: (person: FamilyMember) => void; // New prop
}

const PersonNode: React.FC<PersonNodeProps> = ({
  person,
  onEdit,
  onConnectRelationship,
}) => {
  return (
    <Card className="m-2 w-64">
      <div className="p-3">
        {/* ... existing person details ... */}
        <h3 className="text-lg font-semibold text-blue-700">{person.name}</h3>
        <div className="flex justify-center my-2">
          <ProfileAvatar
            imageUrl={person.profileImageUrl}
            name={person.name}
            age={
              person.birthDate
                ? new Date().getFullYear() -
                  new Date(person.birthDate).getFullYear()
                : undefined
            }
            sex={person.gender}
            size="lg"
          />
        </div>
        <p className="text-xs text-gray-600">ID: {person.id}</p>
        {person.birthDate && (
          <p className="text-sm">Born: {person.birthDate}</p>
        )}
        {person.deathDate && (
          <p className="text-sm">Died: {person.deathDate}</p>
        )}
        {person.gender && (
          <p className="text-sm capitalize">Gender: {person.gender}</p>
        )}

        <div className="mt-3 text-center space-x-2">
          {" "}
          {/* Added space-x-2 for button spacing */}
          <Button onClick={() => onEdit(person)} variant="secondary" size="sm">
            Edit
          </Button>
          <Button
            onClick={() => onConnectRelationship(person)}
            variant="ghost"
            size="sm"
          >
            {" "}
            {/* New Button */}
            Connect
          </Button>
        </div>
      </div>
    </Card>
  );
};
export default PersonNode;
