// src/components/family-tree/FamilyTreeOrganizer.tsx
import React from "react";
import { FamilyTree, FamilyMember, Relationship } from "../../types/genealogy";

export interface FamilyTreeUnit {
  id: string;
  type: "married_couple" | "single_parent" | "individual";
  parents: FamilyMember[];
  children: FamilyMember[];
  marriageId?: string;
}

export const organizeFamilyTree = (
  members: FamilyMember[],
  relationships: Relationship[]
): {
  familyUnits: FamilyTreeUnit[];
  individuals: FamilyMember[];
} => {
  const processedMembers = new Set<string>();
  const familyUnits: FamilyTreeUnit[] = [];
  const individuals: FamilyMember[] = [];

  // Find all spouse relationships
  const spouseRelationships = relationships.filter(
    (rel) => rel.type === "SPOUSE"
  );
  const parentChildRelationships = relationships.filter(
    (rel) => rel.type === "PARENT_CHILD"
  );

  // Helper function to find children of a person or couple
  const findChildren = (parentIds: string[]): FamilyMember[] => {
    const childIds = new Set<string>();

    parentChildRelationships.forEach((rel) => {
      if (parentIds.includes(rel.person1Id)) {
        childIds.add(rel.person2Id);
      }
    });

    return members.filter((member) => childIds.has(member.id));
  };

  // Process married couples
  spouseRelationships.forEach((spouseRel, index) => {
    const spouse1 = members.find((m) => m.id === spouseRel.person1Id);
    const spouse2 = members.find((m) => m.id === spouseRel.person2Id);

    if (spouse1 && spouse2) {
      const children = findChildren([spouse1.id, spouse2.id]);

      familyUnits.push({
        id: `married-${index}`,
        type: "married_couple",
        parents: [spouse1, spouse2],
        children,
        marriageId: spouseRel.id,
      });

      // Mark all members as processed
      processedMembers.add(spouse1.id);
      processedMembers.add(spouse2.id);
      children.forEach((child) => processedMembers.add(child.id));
    }
  });

  // Process single parents (people with children but no spouse)
  const remainingMembers = members.filter(
    (member) => !processedMembers.has(member.id)
  );

  remainingMembers.forEach((member) => {
    const children = findChildren([member.id]);

    if (children.length > 0) {
      familyUnits.push({
        id: `single-parent-${member.id}`,
        type: "single_parent",
        parents: [member],
        children,
      });

      processedMembers.add(member.id);
      children.forEach((child) => processedMembers.add(child.id));
    }
  });

  // Remaining members are individuals
  members.forEach((member) => {
    if (!processedMembers.has(member.id)) {
      individuals.push(member);
    }
  });

  return { familyUnits, individuals };
};
