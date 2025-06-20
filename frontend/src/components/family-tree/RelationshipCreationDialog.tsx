// src/components/family-tree/RelationshipCreationDialog.tsx
import React, { useState } from "react";
import { FamilyMember } from "../../types/genealogy";
import { Button, Modal } from "../ui";

interface RelationshipCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  person1: FamilyMember;
  person2: FamilyMember;
  onCreateRelationship: (
    person1Id: string,
    person2Id: string,
    relationshipType: string
  ) => void;
  isSubmitting: boolean;
  error: string | null;
}

const RelationshipCreationDialog: React.FC<RelationshipCreationDialogProps> = ({
  isOpen,
  onClose,
  person1,
  person2,
  onCreateRelationship,
  isSubmitting,
  error,
}) => {
  const [relationshipType, setRelationshipType] = useState<string>("");

  const relationshipOptions = [
    {
      value: "SPOUSE",
      label: "Spouse/Partner",
      description: `${person1.name} and ${person2.name} are married or partners`,
      icon: "💕",
    },
    {
      value: "PARENT_CHILD_P1_PARENT",
      label: `${person1.name} is parent of ${person2.name}`,
      description: `${person1.name} is the parent and ${person2.name} is the child`,
      icon: "👥",
    },
    {
      value: "PARENT_CHILD_P2_PARENT",
      label: `${person2.name} is parent of ${person1.name}`,
      description: `${person2.name} is the parent and ${person1.name} is the child`,
      icon: "👥",
    },
    {
      value: "SIBLING",
      label: "Siblings",
      description: `${person1.name} and ${person2.name} are siblings`,
      icon: "🤝",
    },
  ];

  const handleSubmit = () => {
    if (!relationshipType) return;

    let finalType = relationshipType;
    let finalPerson1Id = person1.id;
    let finalPerson2Id = person2.id;

    // Handle the parent-child relationships with proper perspective
    if (relationshipType === "PARENT_CHILD_P1_PARENT") {
      finalType = "PARENT_CHILD";
      // person1 is parent, person2 is child - keep as is
    } else if (relationshipType === "PARENT_CHILD_P2_PARENT") {
      finalType = "PARENT_CHILD";
      // person2 is parent, person1 is child - swap them
      finalPerson1Id = person2.id;
      finalPerson2Id = person1.id;
    }

    onCreateRelationship(finalPerson1Id, finalPerson2Id, finalType);
  };

  const handleClose = () => {
    setRelationshipType("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-6 max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-4">
          🔗
          <h2 className="text-xl font-semibold">Create Relationship</h2>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <div className="text-center">
              <div className="font-medium text-blue-600">{person1.name}</div>
              <div className="text-sm text-gray-500">
                {person1.gender &&
                  `${
                    person1.gender.charAt(0).toUpperCase() +
                    person1.gender.slice(1)
                  }`}
                {person1.birthDate && ` • Born ${person1.birthDate}`}
              </div>
            </div>
            <div className="px-4">🔗</div>
            <div className="text-center">
              <div className="font-medium text-green-600">{person2.name}</div>
              <div className="text-sm text-gray-500">
                {person2.gender &&
                  `${
                    person2.gender.charAt(0).toUpperCase() +
                    person2.gender.slice(1)
                  }`}
                {person2.birthDate && ` • Born ${person2.birthDate}`}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relationship Type
          </label>
          <div className="space-y-2">
            {relationshipOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="relationshipType"
                  value={option.value}
                  checked={relationshipType === option.value}
                  onChange={(e) => setRelationshipType(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {option.icon}
                    <span className="font-medium">{option.label}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-700 text-sm">{error}</div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleClose}
            variant="secondary"
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            className="flex-1"
            disabled={!relationshipType || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Relationship"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RelationshipCreationDialog;
