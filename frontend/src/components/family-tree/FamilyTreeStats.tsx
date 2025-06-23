// src/components/family-tree/FamilyTreeStats.tsx
import React from "react";
import { FamilyTree } from "../../types/genealogy";
import { Card } from "../ui";

interface FamilyTreeStatsProps {
  tree: FamilyTree;
}

const FamilyTreeStats: React.FC<FamilyTreeStatsProps> = ({ tree }) => {
  const totalMembers = tree.members?.length || 0;

  // Calculate generations (simplified - could be more sophisticated)
  const generations = React.useMemo(() => {
    if (!tree.members || !tree.relationships) return 1;

    // Count parent-child relationships to estimate generations
    const parentChildRels = tree.relationships.filter(
      (rel) => rel.type === "PARENT_CHILD"
    );
    return Math.max(
      1,
      Math.ceil(parentChildRels.length / Math.max(1, totalMembers / 3))
    );
  }, [tree.members, tree.relationships, totalMembers]);

  // Calculate marriages
  const marriages =
    tree.relationships?.filter((rel) => rel.type === "SPOUSE").length || 0;

  // Calculate living vs deceased
  const livingMembers =
    tree.members?.filter((member) => !member.deathDate).length || 0;

  const stats = [
    {
      label: "Total Members",
      value: totalMembers,
      icon: (
        <svg
          className="w-6 h-6"
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
      ),
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Living",
      value: livingMembers,
      icon: (
        <svg
          className="w-6 h-6"
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
      ),
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "Marriages",
      value: marriages,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-50 dark:bg-pink-900/20",
    },
    {
      label: "Generations",
      value: generations,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="p-0">
          <div className="p-6">
            <div className="flex items-center">
              <div
                className={`p-3 rounded-lg ${stat.bgColor} ${stat.color} mr-4 transition-colors duration-200`}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors duration-200">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default FamilyTreeStats;
