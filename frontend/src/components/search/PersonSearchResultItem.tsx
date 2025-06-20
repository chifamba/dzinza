import React from "react";
import { Link } from "react-router-dom"; // Or Next.js Link
import { SearchResultItem, PersonData } from "../../types/search"; // Adjust path
import { UserCircle, MapPin, CalendarDays, TextQuote } from "lucide-react"; // Example icons
import { createSanitizedHTML } from "../../utils/sanitize";

interface PersonSearchResultItemProps {
  item: SearchResultItem;
}

// Helper to format dates or get year
const getYear = (dateString?: string): string | null => {
  if (!dateString) return null;
  try {
    return new Date(dateString).getFullYear().toString();
  } catch {
    return null; // Or return original string if it's not a valid date
  }
};

const PersonSearchResultItem: React.FC<PersonSearchResultItemProps> = ({
  item,
}) => {
  const person = item._source as PersonData; // Cast _source to PersonData

  const birthYear = getYear(person.birthDate);
  const deathYear = getYear(person.deathDate);
  const lifeSpan =
    birthYear && deathYear
      ? `${birthYear}–${deathYear}`
      : birthYear || deathYear || "";

  const biographyContent = item.highlight?.biography?.[0] ? (
    <span
      dangerouslySetInnerHTML={createSanitizedHTML(item.highlight.biography[0])}
    />
  ) : person.biography ? (
    person.biography.substring(0, 150) +
    (person.biography.length > 150 ? "..." : "")
  ) : (
    "No biography available."
  );

  const displayName = item.highlight?.fullName?.[0] ? (
    <span
      dangerouslySetInnerHTML={createSanitizedHTML(item.highlight.fullName[0])}
    />
  ) : (
    person.fullName ||
    `${person.firstName || ""} ${person.lastName || ""}`.trim() ||
    "Unknown Person"
  );

  // Construct name, preferring highlighted parts if fullName isn't highlighted directly or not preferred.
  // This example prioritizes highlighted fullName if available, otherwise constructs from parts.
  // If individual firstName/lastName highlights are preferred, adjust logic here.
  const nameElement = displayName; // Simplified: using displayName which already checks highlight.fullName

  return (
    <div className="p-4 my-2 bg-white dark:bg-gray-800 shadow rounded-lg hover:shadow-md transition-shadow">
      {/* Use item._id for link as it's the ES document ID, which should match MongoDB _id */}
      <Link to={`/persons/${item._id}`} className="group">
        <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 group-hover:underline mb-1">
          <UserCircle size={20} className="inline mr-2 opacity-75" />
          {nameElement}
        </h3>
      </Link>

      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-2">
        {lifeSpan && (
          <p className="flex items-center">
            <CalendarDays size={14} className="inline mr-1.5 opacity-70" />{" "}
            Lifespan: {lifeSpan}
          </p>
        )}
        {person.birthPlaceName && ( // Highlighting for place names can also be added if configured in ES
          <p className="flex items-center">
            <MapPin size={14} className="inline mr-1.5 opacity-70" /> Born:
            {item.highlight?.birthPlaceName?.[0] ? (
              <span
                dangerouslySetInnerHTML={createSanitizedHTML(
                  item.highlight.birthPlaceName[0]
                )}
              />
            ) : (
              person.birthPlaceName
            )}
          </p>
        )}
        {person.deathPlaceName && (
          <p className="flex items-center">
            <MapPin size={14} className="inline mr-1.5 opacity-70" /> Died:
            {item.highlight?.deathPlaceName?.[0] ? (
              <span
                dangerouslySetInnerHTML={createSanitizedHTML(
                  item.highlight.deathPlaceName[0]
                )}
              />
            ) : (
              person.deathPlaceName
            )}
          </p>
        )}
      </div>

      {(person.biography || item.highlight?.biography) && (
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <TextQuote
            size={14}
            className="inline mr-1 opacity-60 transform -scale-x-100"
          />
          {biographyContent}
        </p>
      )}
    </div>
  );
};

export default PersonSearchResultItem;
