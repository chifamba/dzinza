// src/components/family-tree/PersonCard.tsx
import React from "react";
import { FamilyMember } from "../../types/genealogy";
import { Button } from "../ui";

interface PersonCardProps {
  person: FamilyMember;
  onEdit: () => void;
  onAddRelative: (relationType: "parent" | "child" | "spouse") => void;
  compact?: boolean;
  showMarriageIndicator?: boolean;
}

const PersonCard: React.FC<PersonCardProps> = ({
  person,
  onEdit,
  onAddRelative,
  compact = false,
  showMarriageIndicator: _showMarriageIndicator = true,
}) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getAge = () => {
    if (!person.birthDate) return null;

    const birth = new Date(person.birthDate);
    const end = person.deathDate ? new Date(person.deathDate) : new Date();
    const ageMs = end.getTime() - birth.getTime();
    const age = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));

    return age >= 0 ? age : null;
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {person.profileImageUrl ? (
              <img
                src={person.profileImageUrl}
                alt={person.name}
                className="w-12 h-12 rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div
              className={`w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-lg ${
                person.profileImageUrl ? "hidden" : ""
              }`}
            >
              {getInitials(person.name)}
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {person.name}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              {person.birthDate && (
                <span>Born {formatDate(person.birthDate)}</span>
              )}
              {getAge() !== null && (
                <span>
                  {person.deathDate
                    ? `Lived ${getAge()} years`
                    : `Age ${getAge()}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-gray-600 hover:text-gray-900"
          >
            Edit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header with Avatar and Basic Info */}
      <div className="p-6">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {person.profileImageUrl ? (
              <img
                src={person.profileImageUrl}
                alt={person.name}
                className="w-16 h-16 rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div
              className={`w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-xl ${
                person.profileImageUrl ? "hidden" : ""
              }`}
            >
              {getInitials(person.name)}
            </div>
          </div>

          {/* Basic Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">
              {person.name}
            </h3>

            {/* Birth/Death Info */}
            <div className="space-y-1 text-sm text-gray-600">
              {person.birthDate && (
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Born {formatDate(person.birthDate)}</span>
                </div>
              )}

              {person.deathDate && (
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Died {formatDate(person.deathDate)}</span>
                </div>
              )}

              {getAge() !== null && (
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    {person.deathDate
                      ? `Lived ${getAge()} years`
                      : `Age ${getAge()}`}
                  </span>
                </div>
              )}

              {person.gender && person.gender !== "unknown" && (
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2 text-purple-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span className="capitalize">{person.gender}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Relationship Summary */}
        {(person.parentIds?.length ||
          person.spouseIds?.length ||
          person.childIds?.length) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-3 text-sm">
              {person.parentIds && person.parentIds.length > 0 && (
                <div className="flex items-center text-gray-600">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {person.parentIds.length} parent
                  {person.parentIds.length !== 1 ? "s" : ""}
                </div>
              )}

              {person.spouseIds && person.spouseIds.length > 0 && (
                <div className="flex items-center text-gray-600">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  {person.spouseIds.length} spouse
                  {person.spouseIds.length !== 1 ? "s" : ""}
                </div>
              )}

              {person.childIds && person.childIds.length > 0 && (
                <div className="flex items-center text-gray-600">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    />
                  </svg>
                  {person.childIds.length} child
                  {person.childIds.length !== 1 ? "ren" : ""}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddRelative("parent")}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Parent
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddRelative("child")}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Child
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddRelative("spouse")}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Spouse
            </Button>
          </div>

          <Button variant="primary" size="sm" onClick={onEdit}>
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PersonCard;
