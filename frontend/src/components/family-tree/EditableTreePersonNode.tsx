// src/components/family-tree/EditableTreePersonNode.tsx
import React, { useState } from "react";
import { FamilyMember } from "../../types/genealogy";
import { Button, Card } from "../ui";
import { RawNodeDatum } from "react-d3-tree";
import { Plus, Link, Edit3, Trash2, Eye, UserPlus } from "lucide-react";

interface EditableTreePersonNodeProps {
  nodeDatum: RawNodeDatum;
  toggleNode: () => void;
  onEdit: (personAttributes: FamilyMember) => void;
  onConnectRelationship: (personAttributes: FamilyMember) => void;
  onDelete: (personAttributes: FamilyMember) => void;
  onDeleteRelationship: (
    person1Id: string,
    person2Id: string,
    type:
      | "SPOUSE"
      | "PARENT_CHILD_PARENT_PERSPECTIVE"
      | "PARENT_CHILD_CHILD_PERSPECTIVE"
  ) => void;
  allMembers: FamilyMember[];
  onViewProfile: (person: FamilyMember) => void;
  onAddPerson: (
    relativeToId: string,
    relationType: "parent" | "child" | "spouse"
  ) => void;
  onStartRelationshipCreation: (person: FamilyMember) => void;
  isAuthenticated: boolean;
  isEditMode: boolean;
  isRelationshipCreationMode: boolean;
  selectedPersonForRelationship?: FamilyMember | null;
}

const EditableTreePersonNode: React.FC<EditableTreePersonNodeProps> = ({
  nodeDatum,
  toggleNode,
  onEdit,
  onConnectRelationship,
  onDelete,
  onDeleteRelationship,
  allMembers,
  onViewProfile,
  onAddPerson,
  onStartRelationshipCreation,
  isAuthenticated,
  isEditMode,
  isRelationshipCreationMode,
  selectedPersonForRelationship,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const personAttributes = nodeDatum.attributes as FamilyMember & {
    Birthdate?: string;
    "Death Date"?: string;
    Gender?: string;
  };
  const personName = nodeDatum.name;
  const currentPersonId = nodeDatum.originalId!;

  const memberForHandlers: FamilyMember = {
    id: currentPersonId,
    name: personName,
    gender: personAttributes?.gender || personAttributes?.Gender || "unknown",
    birthDate: personAttributes?.birthDate || personAttributes?.Birthdate,
    deathDate: personAttributes?.deathDate || personAttributes?.["Death Date"],
    profileImageUrl: personAttributes?.profileImageUrl,
    parentIds: personAttributes?.parentIds || [],
    childIds: personAttributes?.childIds || [],
    spouseIds: personAttributes?.spouseIds || [],
  };

  const getNameById = (id: string) =>
    allMembers.find((m) => m.id === id)?.name || "Unknown";

  const isSelectedForRelationship =
    selectedPersonForRelationship?.id === currentPersonId;

  const handleAddPerson = (relationType: "parent" | "child" | "spouse") => {
    onAddPerson(currentPersonId, relationType);
  };

  const handleRelationshipClick = () => {
    if (
      isRelationshipCreationMode &&
      selectedPersonForRelationship &&
      selectedPersonForRelationship.id !== currentPersonId
    ) {
      // Complete the relationship creation
      onConnectRelationship(memberForHandlers);
    } else {
      // Start relationship creation
      onStartRelationshipCreation(memberForHandlers);
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Plus icons for adding new people (only visible when authenticated and in edit mode) */}
      {isAuthenticated && isEditMode && isHovered && (
        <>
          {/* Parent plus icon */}
          <button
            className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center z-10 transition-all duration-200 shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              handleAddPerson("parent");
            }}
            title="Add Parent"
          >
            <Plus size={14} />
          </button>

          {/* Child plus icon */}
          <button
            className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center z-10 transition-all duration-200 shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              handleAddPerson("child");
            }}
            title="Add Child"
          >
            <Plus size={14} />
          </button>

          {/* Spouse plus icon */}
          <button
            className="absolute top-1/2 -right-8 transform -translate-y-1/2 w-6 h-6 bg-purple-500 hover:bg-purple-600 text-white rounded-full flex items-center justify-center z-10 transition-all duration-200 shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              handleAddPerson("spouse");
            }}
            title="Add Spouse"
          >
            <Plus size={14} />
          </button>

          {/* Relationship creation icon */}
          <button
            className={`absolute top-1/2 -left-8 transform -translate-y-1/2 w-6 h-6 text-white rounded-full flex items-center justify-center z-10 transition-all duration-200 shadow-lg ${
              isRelationshipCreationMode && isSelectedForRelationship
                ? "bg-orange-500 hover:bg-orange-600 animate-pulse"
                : "bg-gray-500 hover:bg-gray-600"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleRelationshipClick();
            }}
            title={
              isRelationshipCreationMode && selectedPersonForRelationship
                ? "Click another person to create relationship"
                : "Start creating relationship"
            }
          >
            <Link size={14} />
          </button>
        </>
      )}

      {/* Main person card */}
      <Card
        className={`m-0.5 w-full max-w-[14rem] sm:max-w-xs md:max-w-[14rem] shadow-md transition-all duration-200 ${
          isSelectedForRelationship
            ? "ring-2 ring-orange-500 bg-orange-50"
            : isRelationshipCreationMode
            ? "hover:ring-2 hover:ring-orange-300 hover:bg-orange-25 cursor-pointer"
            : ""
        } ${isHovered ? "shadow-lg transform scale-105" : ""}`}
        onClick={toggleNode}
        style={{ cursor: "pointer" }}
      >
        <div className="p-1.5 sm:p-2 md:p-3">
          <h3 className="text-sm sm:text-base font-semibold text-blue-700 text-center truncate">
            {personName}
          </h3>

          {memberForHandlers.profileImageUrl && (
            <img
              src={memberForHandlers.profileImageUrl}
              alt={personName}
              className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full mx-auto my-1 object-cover border"
            />
          )}

          <div className="text-[0.6rem] sm:text-[0.65rem] md:text-xs text-gray-600 mb-1 text-center">
            {personAttributes?.Birthdate && (
              <span className="block sm:inline">
                Born: {personAttributes.Birthdate}
              </span>
            )}
            {personAttributes?.["Death Date"] && (
              <span className="block sm:inline ml-0 sm:ml-1">
                Died: {personAttributes["Death Date"]}
              </span>
            )}
            {!personAttributes?.Birthdate &&
              !personAttributes?.["Death Date"] && (
                <span className="italic">No dates</span>
              )}
          </div>

          {/* Action buttons - show different sets based on mode */}
          <div className="mt-1.5 text-center space-x-0.5 sm:space-x-1 flex flex-wrap justify-center gap-0.5 sm:gap-1">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onViewProfile(memberForHandlers);
              }}
              variant="ghost"
              className="text-[0.6rem] px-1 py-0.5 sm:text-xs sm:px-1.5 sm:py-1 md:px-2 md:py-1 flex items-center gap-1"
            >
              <Eye size={10} />
              View
            </Button>

            {isAuthenticated && (
              <>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(memberForHandlers);
                  }}
                  variant="secondary"
                  className="text-[0.6rem] px-1 py-0.5 sm:text-xs sm:px-1.5 sm:py-1 md:px-2 md:py-1 flex items-center gap-1"
                >
                  <Edit3 size={10} />
                  Edit
                </Button>

                {isEditMode ? (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(memberForHandlers);
                    }}
                    variant="destructive"
                    className="text-[0.6rem] px-1 py-0.5 sm:text-xs sm:px-1.5 sm:py-1 md:px-2 md:py-1 flex items-center gap-1"
                  >
                    <Trash2 size={10} />
                    Delete
                  </Button>
                ) : (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onConnectRelationship(memberForHandlers);
                    }}
                    variant="ghost"
                    className="text-[0.6rem] px-1 py-0.5 sm:text-xs sm:px-1.5 sm:py-1 md:px-2 md:py-1 flex items-center gap-1"
                  >
                    <UserPlus size={10} />
                    Connect
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Relationships Display */}
          <div className="mt-1.5 pt-1 border-t">
            {/* Parents */}
            {memberForHandlers.parentIds &&
              memberForHandlers.parentIds.length > 0 && (
                <div className="mb-0.5">
                  <h4 className="text-[0.7rem] sm:text-xs font-semibold">
                    Parents:
                  </h4>
                  {memberForHandlers.parentIds.map((parentId) => (
                    <div
                      key={parentId}
                      className="flex justify-between items-center text-[0.6rem] sm:text-[0.65rem] md:text-xs"
                    >
                      <span className="truncate" title={getNameById(parentId)}>
                        {getNameById(parentId)}
                      </span>
                      {isAuthenticated && isEditMode && (
                        <Button
                          variant="destructive"
                          className="text-[0.5rem] px-0.5 sm:text-[0.55rem] sm:px-1 md:text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRelationship(
                              currentPersonId,
                              parentId,
                              "PARENT_CHILD_CHILD_PERSPECTIVE"
                            );
                          }}
                        >
                          X
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

            {/* Spouses */}
            {memberForHandlers.spouseIds &&
              memberForHandlers.spouseIds.length > 0 && (
                <div className="mb-0.5">
                  <h4 className="text-[0.7rem] sm:text-xs font-semibold">
                    Spouse(s):
                  </h4>
                  {memberForHandlers.spouseIds.map((spouseId) => (
                    <div
                      key={spouseId}
                      className="flex justify-between items-center text-[0.6rem] sm:text-[0.65rem] md:text-xs"
                    >
                      <span className="truncate" title={getNameById(spouseId)}>
                        {getNameById(spouseId)}
                      </span>
                      {isAuthenticated && isEditMode && (
                        <Button
                          variant="destructive"
                          className="text-[0.5rem] px-0.5 sm:text-[0.55rem] sm:px-1 md:text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRelationship(
                              currentPersonId,
                              spouseId,
                              "SPOUSE"
                            );
                          }}
                        >
                          X
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

            {/* Children */}
            {memberForHandlers.childIds &&
              memberForHandlers.childIds.length > 0 && (
                <div>
                  <h4 className="text-[0.7rem] sm:text-xs font-semibold">
                    Children:
                  </h4>
                  {memberForHandlers.childIds.map((childId) => (
                    <div
                      key={childId}
                      className="flex justify-between items-center text-[0.6rem] sm:text-[0.65rem] md:text-xs"
                    >
                      <span className="truncate" title={getNameById(childId)}>
                        {getNameById(childId)}
                      </span>
                      {isAuthenticated && isEditMode && (
                        <Button
                          variant="destructive"
                          className="text-[0.5rem] px-0.5 sm:text-[0.55rem] sm:px-1 md:text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRelationship(
                              currentPersonId,
                              childId,
                              "PARENT_CHILD_PARENT_PERSPECTIVE"
                            );
                          }}
                        >
                          X
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EditableTreePersonNode;
