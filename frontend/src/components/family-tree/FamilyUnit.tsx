// src/components/family-tree/FamilyUnit.tsx
import React, { useRef, useEffect, useState } from "react";
import { FamilyMember } from "../../types/genealogy";
import PersonCard from "./PersonCard";

interface FamilyUnitProps {
  parents: FamilyMember[];
  children: FamilyMember[];
  onEdit: (person: FamilyMember) => void;
  onAddRelative: (
    person: FamilyMember,
    relationType: "parent" | "child" | "spouse"
  ) => void;
  compact?: boolean;
}

const FamilyUnit: React.FC<FamilyUnitProps> = ({
  parents,
  children,
  onEdit,
  onAddRelative,
  compact = false,
}) => {
  const isMarriedCouple = parents.length === 2;
  const childrenContainerRef = useRef<HTMLDivElement>(null);
  const [childPositions, setChildPositions] = useState<number[]>([]);

  // Calculate child card positions for accurate line connections
  useEffect(() => {
    const calculatePositions = () => {
      if (children.length > 0 && childrenContainerRef.current && !compact) {
        const container = childrenContainerRef.current;
        const childElements = container.querySelectorAll("[data-child-card]");
        const containerRect = container.getBoundingClientRect();

        if (childElements.length === 0 || containerRect.width === 0) return;

        const positions: number[] = [];
        childElements.forEach((element) => {
          const elementRect = element.getBoundingClientRect();
          const relativeLeft = elementRect.left - containerRect.left;
          const centerPosition = relativeLeft + elementRect.width / 2;
          const percentagePosition =
            (centerPosition / containerRect.width) * 100;
          positions.push(Math.max(0, Math.min(100, percentagePosition))); // Clamp between 0-100%
        });

        setChildPositions(positions);
      }
    };

    // Calculate positions initially and after layout changes
    const timer = setTimeout(calculatePositions, 100);

    // Recalculate on window resize
    const handleResize = () => {
      clearTimeout(timer);
      setTimeout(calculatePositions, 100);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [children.length, compact]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700 border border-gray-200 dark:border-gray-700 p-6 max-w-7xl mx-auto transition-colors duration-200">
      {/* Parents Section */}
      <div className="mb-8">
        {isMarriedCouple ? (
          <>
            {/* Marriage Header */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-pink-50 dark:bg-pink-900/20 px-3 py-1 rounded-full transition-colors duration-200">
                <svg
                  className="w-4 h-4 text-pink-500 dark:text-pink-400"
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
                <span>Married</span>
              </div>
            </div>

            {/* Marriage Connection */}
            <div className="relative max-w-4xl mx-auto">
              {/* Visual Connection Line */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-0.5 bg-gradient-to-r from-pink-300 via-pink-400 to-pink-300 z-10"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-pink-500 rounded-full z-20 shadow-sm"></div>

              {/* Parents Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-items-center">
                {parents.map((parent) => (
                  <div key={parent.id} className="relative w-full max-w-sm">
                    <PersonCard
                      person={parent}
                      onEdit={() => onEdit(parent)}
                      onAddRelative={(relationType) =>
                        onAddRelative(parent, relationType)
                      }
                      compact={compact}
                      showMarriageIndicator={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Single Parent */
          <div className="max-w-sm mx-auto">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 transition-colors duration-200 px-3 py-1 rounded-full">
                <svg
                  className="w-4 h-4 text-blue-500 dark:text-blue-400"
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
                <span>Parent</span>
              </div>
            </div>
            {parents.map((parent) => (
              <PersonCard
                key={parent.id}
                person={parent}
                onEdit={() => onEdit(parent)}
                onAddRelative={(relationType) =>
                  onAddRelative(parent, relationType)
                }
                compact={compact}
                showMarriageIndicator={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Children Section */}
      {children.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          {/* Children Header */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 transition-colors duration-200 px-3 py-1 rounded-full">
              <svg
                className="w-4 h-4 text-green-500 dark:text-green-400"
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
              <span>
                {children.length} Child{children.length !== 1 ? "ren" : ""}
              </span>
            </div>
          </div>

          {/* Vertical Connection from Parents */}
          <div className="flex justify-center mb-4">
            <div className="w-0.5 h-8 bg-gradient-to-b from-gray-400 to-gray-300"></div>
          </div>

          {/* Single Child Direct Connection */}
          {children.length === 1 && !compact && (
            <div className="flex justify-center mb-6">
              <div className="w-0.5 h-4 bg-gray-300"></div>
            </div>
          )}

          {/* Horizontal Line for Multiple Children */}
          {children.length > 1 && !compact && (
            <div className="flex justify-center mb-6">
              <div className="relative w-full max-w-6xl">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                {childPositions.length > 0
                  ? // Use calculated positions for accurate alignment
                    childPositions.map((position, index) => (
                      <div
                        key={index}
                        className="absolute w-0.5 h-4 bg-gray-300"
                        style={{
                          left: `${position}%`,
                          transform: "translateX(-50%)",
                        }}
                      ></div>
                    ))
                  : // Fallback to estimated positions during initial render
                    children.map((_, index) => {
                      const totalChildren = children.length;
                      let leftPosition;

                      if (totalChildren === 2) {
                        // For 2 children: 30% and 70% positions work well with gap-6
                        leftPosition = index === 0 ? 30 : 70;
                      } else if (totalChildren === 3) {
                        // For 3 children: evenly spaced at 25%, 50%, 75%
                        leftPosition = [25, 50, 75][index];
                      } else if (totalChildren === 4) {
                        // For 4 children: 20%, 40%, 60%, 80%
                        leftPosition = [20, 40, 60, 80][index];
                      } else {
                        // For more children: dynamic spacing with margins
                        const availableWidth = 90; // Leave 5% margin on each side
                        const spacing = availableWidth / (totalChildren - 1);
                        leftPosition = 5 + spacing * index;
                      }

                      return (
                        <div
                          key={index}
                          className="absolute w-0.5 h-4 bg-gray-300"
                          style={{
                            left: `${leftPosition}%`,
                            transform: "translateX(-50%)",
                          }}
                        ></div>
                      );
                    })}
              </div>
            </div>
          )}

          {/* Children Cards */}
          <div
            ref={childrenContainerRef}
            className={
              compact
                ? "flex flex-col items-center space-y-3"
                : children.length === 1
                ? "flex justify-center"
                : children.length === 2
                ? "flex justify-center gap-6"
                : children.length === 3
                ? "flex flex-wrap justify-center gap-4 max-w-4xl mx-auto"
                : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 justify-items-center max-w-6xl mx-auto"
            }
          >
            {children.map((child, index) => (
              <div
                key={child.id}
                className="relative w-full max-w-sm"
                data-child-card
                data-child-index={index}
              >
                <PersonCard
                  person={child}
                  onEdit={() => onEdit(child)}
                  onAddRelative={(relationType) =>
                    onAddRelative(child, relationType)
                  }
                  compact={compact}
                  showMarriageIndicator={false}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyUnit;
