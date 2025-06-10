// src/components/family-tree/TreePersonNode.tsx
import React from 'react';
import { FamilyMember } from '../../types/genealogy';
import { Button, Card } from '../ui';
import { RawNodeDatum } from 'react-d3-tree';

interface TreePersonNodeProps {
  nodeDatum: RawNodeDatum;
  toggleNode: () => void;
  onEdit: (personAttributes: FamilyMember) => void;
  onConnectRelationship: (personAttributes: FamilyMember) => void;
  onDelete: (personAttributes: FamilyMember) => void;
  onDeleteRelationship: (person1Id: string, person2Id: string, type: 'SPOUSE' | 'PARENT_CHILD_PARENT_PERSPECTIVE' | 'PARENT_CHILD_CHILD_PERSPECTIVE') => void;
  allMembers: FamilyMember[]; // To resolve IDs to names
  onViewProfile: (person: FamilyMember) => void; // New prop for viewing profile
}

const TreePersonNode: React.FC<TreePersonNodeProps> = ({
  nodeDatum,
  toggleNode,
  onEdit,
  onConnectRelationship,
  onDelete,
  onDeleteRelationship,
  allMembers,
  onViewProfile,
}) => {
  const personAttributes = nodeDatum.attributes as FamilyMember & { Birthdate?: string; 'Death Date'?: string; Gender?: string };
  const personName = nodeDatum.name;
  const currentPersonId = nodeDatum.originalId!;

  const memberForHandlers: FamilyMember = {
    id: currentPersonId,
    name: personName,
    gender: personAttributes?.gender || personAttributes?.Gender || 'unknown',
    birthDate: personAttributes?.birthDate || personAttributes?.Birthdate,
    deathDate: personAttributes?.deathDate || personAttributes?.['Death Date'],
    profileImageUrl: personAttributes?.profileImageUrl,
    parentIds: personAttributes?.parentIds || [],
    childIds: personAttributes?.childIds || [],
    spouseIds: personAttributes?.spouseIds || [],
  };

  const getNameById = (id: string) => allMembers.find(m => m.id === id)?.name || 'Unknown';

  return (
    // Reduced max-width for the card, using w-full up to a point.
    <Card className="m-0.5 w-full max-w-[14rem] sm:max-w-xs md:max-w-[14rem] shadow-md" onClick={toggleNode} style={{ cursor: 'pointer' }}>
      <div className="p-1.5 sm:p-2 md:p-3">
        <h3 className="text-sm sm:text-base font-semibold text-blue-700 text-center truncate">{personName}</h3>
        {memberForHandlers.profileImageUrl && (
          <img
            src={memberForHandlers.profileImageUrl}
            alt={personName}
            className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full mx-auto my-1 object-cover border"
          />
        )}
        <div className="text-[0.6rem] sm:text-[0.65rem] md:text-xs text-gray-600 mb-1 text-center">
            {personAttributes?.Birthdate && <span className="block sm:inline">Born: {personAttributes.Birthdate}</span>}
            {personAttributes?.['Death Date'] && <span className="block sm:inline ml-0 sm:ml-1">Died: {personAttributes['Death Date']}</span>}
            {(!personAttributes?.Birthdate && !personAttributes?.['Death Date']) && <span className="italic">No dates</span>}
        </div>

        {/* Responsive button container: flex-wrap and adjust spacing/size */}
        <div className="mt-1.5 text-center space-x-0.5 sm:space-x-1 flex flex-wrap justify-center gap-0.5 sm:gap-1">
          <Button onClick={(e) => { e.stopPropagation(); onViewProfile(memberForHandlers); }} variant="info" className="text-[0.6rem] px-1 py-0.5 sm:text-xs sm:px-1.5 sm:py-1 md:px-2 md:py-1">View</Button>
          <Button onClick={(e) => { e.stopPropagation(); onEdit(memberForHandlers); }} variant="secondary" className="text-[0.6rem] px-1 py-0.5 sm:text-xs sm:px-1.5 sm:py-1 md:px-2 md:py-1">Edit</Button>
          <Button onClick={(e) => { e.stopPropagation(); onConnectRelationship(memberForHandlers); }} variant="ghost" className="text-[0.6rem] px-1 py-0.5 sm:text-xs sm:px-1.5 sm:py-1 md:px-2 md:py-1">Connect</Button>
          <Button onClick={(e) => { e.stopPropagation(); onDelete(memberForHandlers); }} variant="danger" className="text-[0.6rem] px-1 py-0.5 sm:text-xs sm:px-1.5 sm:py-1 md:px-2 md:py-1">Delete</Button>
        </div>

        {/* Relationships Display - make text smaller and buttons smaller */}
        <div className="mt-1.5 pt-1 border-t">
          {/* Parents */}
          {memberForHandlers.parentIds && memberForHandlers.parentIds.length > 0 && (
            <div className="mb-0.5">
              <h4 className="text-[0.7rem] sm:text-xs font-semibold">Parents:</h4>
              {memberForHandlers.parentIds.map(parentId => (
                <div key={parentId} className="flex justify-between items-center text-[0.6rem] sm:text-[0.65rem] md:text-xs">
                  <span className="truncate" title={getNameById(parentId)}>{getNameById(parentId)}</span>
                  <Button
                    variant="outlineDanger" className="text-[0.5rem] px-0.5 sm:text-[0.55rem] sm:px-1 md:text-xs"
                    onClick={(e) => { e.stopPropagation(); onDeleteRelationship(currentPersonId, parentId, 'PARENT_CHILD_CHILD_PERSPECTIVE'); }}
                  >X</Button>
                </div>
              ))}
            </div>
          )}

          {/* Spouses */}
          {memberForHandlers.spouseIds && memberForHandlers.spouseIds.length > 0 && (
            <div className="mb-0.5">
              <h4 className="text-[0.7rem] sm:text-xs font-semibold">Spouse(s):</h4>
              {memberForHandlers.spouseIds.map(spouseId => (
                <div key={spouseId} className="flex justify-between items-center text-[0.6rem] sm:text-[0.65rem] md:text-xs">
                  <span className="truncate" title={getNameById(spouseId)}>{getNameById(spouseId)}</span>
                  <Button
                    variant="outlineDanger" className="text-[0.5rem] px-0.5 sm:text-[0.55rem] sm:px-1 md:text-xs"
                    onClick={(e) => { e.stopPropagation(); onDeleteRelationship(currentPersonId, spouseId, 'SPOUSE'); }}
                  >X</Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {nodeDatum.children && nodeDatum.children.length > 0 && (
          <p className="text-[0.6rem] sm:text-[0.65rem] md:text-xs text-center mt-1 text-gray-500 italic">
            {nodeDatum.children.length} child node(s) in tree.
          </p>
        )}
      </div>
    </Card>
  );
};
export default TreePersonNode;
