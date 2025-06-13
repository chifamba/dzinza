// src/services/api/genealogyService.ts
import { FamilyTree, FamilyMember, Relationship } from '../../types/genealogy'; // Adjust path as needed

const MOCK_DELAY = 500;

// Initial Mock Data
const mockTreeData: FamilyTree = {
  id: 'tree1',
  name: 'My Ancestry',
  ownerId: 'user1', // Corresponds to a logged-in user ideally
  members: [
    { id: 'p1', name: 'John Doe (Grandfather)', birthDate: '1930-01-15', deathDate: '2005-05-20', gender: 'male', parentIds: [], childIds: ['p3'], spouseIds: ['p2'] },
    { id: 'p2', name: 'Jane Doe (Grandmother)', birthDate: '1932-03-10', deathDate: '2008-11-01', gender: 'female', parentIds: [], childIds: ['p3'], spouseIds: ['p1'] },
    { id: 'p3', name: 'Michael Doe (Father)', birthDate: '1960-06-20', gender: 'male', parentIds: ['p1', 'p2'], childIds: ['p5'], spouseIds: ['p4'] },
    { id: 'p4', name: 'Sarah Smith (Mother)', birthDate: '1962-09-05', gender: 'female', parentIds: [], childIds: ['p5'], spouseIds: ['p3'] },
    { id: 'p5', name: 'Alex Doe (Me)', birthDate: '1990-12-01', gender: 'male', parentIds: ['p3', 'p4'], childIds: [], spouseIds: [] },
  ],
  relationships: [
    { id: 'r1', person1Id: 'p1', person2Id: 'p2', type: 'SPOUSE' },
    { id: 'r2', person1Id: 'p1', person2Id: 'p3', type: 'PARENT_CHILD' }, // John is parent of Michael
    { id: 'r3', person1Id: 'p2', person2Id: 'p3', type: 'PARENT_CHILD' }, // Jane is parent of Michael
    { id: 'r4', person1Id: 'p3', person2Id: 'p4', type: 'SPOUSE' },
    { id: 'r5', person1Id: 'p3', person2Id: 'p5', type: 'PARENT_CHILD' }, // Michael is parent of Alex
    { id: 'r6', person1Id: 'p4', person2Id: 'p5', type: 'PARENT_CHILD' }, // Sarah is parent of Alex
  ],
};

let nextPersonId = mockTreeData.members.length + 1;
let nextRelationshipId = mockTreeData.relationships.length + 1;

export const genealogyService = {
  getFamilyTree: (treeId: string): Promise<FamilyTree> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (treeId === mockTreeData.id) {
          // Return a deep copy to prevent direct mutation of mock data from outside
          resolve(JSON.parse(JSON.stringify(mockTreeData)));
        } else {
          reject(new Error('Family tree not found.'));
        }
      }, MOCK_DELAY);
    });
  },

  deleteRelationship: (
    treeId: string,
    person1Id: string,
    person2Id: string,
    type: 'SPOUSE' | 'PARENT_CHILD_PARENT_PERSPECTIVE' | 'PARENT_CHILD_CHILD_PERSPECTIVE'
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (treeId !== mockTreeData.id) {
          return reject(new Error('Family tree not found.'));
        }

        let relationshipIndex = -1;
        let actualRelType: Relationship['type'] = 'SPOUSE'; // Default, will be set

        if (type === 'SPOUSE') {
          actualRelType = 'SPOUSE';
          relationshipIndex = mockTreeData.relationships.findIndex(rel =>
            rel.type === 'SPOUSE' &&
            ((rel.person1Id === person1Id && rel.person2Id === person2Id) ||
             (rel.person1Id === person2Id && rel.person2Id === person1Id))
          );
        } else if (type === 'PARENT_CHILD_PARENT_PERSPECTIVE') { // person1 is parent, person2 is child
          actualRelType = 'PARENT_CHILD';
          relationshipIndex = mockTreeData.relationships.findIndex(rel =>
            rel.type === 'PARENT_CHILD' &&
            rel.person1Id === person1Id && // Parent
            rel.person2Id === person2Id    // Child
          );
        } else if (type === 'PARENT_CHILD_CHILD_PERSPECTIVE') { // person1 is child, person2 is parent
          actualRelType = 'PARENT_CHILD';
          relationshipIndex = mockTreeData.relationships.findIndex(rel =>
            rel.type === 'PARENT_CHILD' &&
            rel.person1Id === person2Id && // Parent
            rel.person2Id === person1Id    // Child
          );
        }

        if (relationshipIndex === -1) {
          return reject(new Error('Relationship not found.'));
        }

        // Remove relationship
        mockTreeData.relationships.splice(relationshipIndex, 1);

        // Update affected members
        const p1 = mockTreeData.members.find(m => m.id === person1Id);
        const p2 = mockTreeData.members.find(m => m.id === person2Id);

        if (p1 && p2) {
          if (actualRelType === 'SPOUSE') {
            p1.spouseIds = p1.spouseIds?.filter(id => id !== person2Id);
            p2.spouseIds = p2.spouseIds?.filter(id => id !== person1Id);
          } else if (actualRelType === 'PARENT_CHILD') {
            if (type === 'PARENT_CHILD_PARENT_PERSPECTIVE') { // p1 is parent, p2 is child
              p1.childIds = p1.childIds?.filter(id => id !== person2Id);
              p2.parentIds = p2.parentIds?.filter(id => id !== person1Id);
            } else { // p1 is child, p2 is parent
              p1.parentIds = p1.parentIds?.filter(id => id !== person2Id);
              p2.childIds = p2.childIds?.filter(id => id !== person1Id);
            }
          }
        }
        resolve();
      }, MOCK_DELAY);
    });
  },

  deletePersonFromTree: (treeId: string, personId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (treeId !== mockTreeData.id) {
          return reject(new Error('Family tree not found.'));
        }
        const personIndex = mockTreeData.members.findIndex(p => p.id === personId);
        if (personIndex === -1) {
          return reject(new Error('Person not found in tree.'));
        }

        // Remove person
        mockTreeData.members.splice(personIndex, 1);

        // Remove relationships involving the person
        mockTreeData.relationships = mockTreeData.relationships.filter(
          rel => rel.person1Id !== personId && rel.person2Id !== personId
        );

        // Clean up references in other members
        mockTreeData.members.forEach(member => {
          if (member.parentIds) {
            member.parentIds = member.parentIds.filter(id => id !== personId);
          }
          if (member.childIds) {
            member.childIds = member.childIds.filter(id => id !== personId);
          }
          if (member.spouseIds) {
            member.spouseIds = member.spouseIds.filter(id => id !== personId);
          }
        });

        // If the deleted person was the root, we might need to designate a new root
        // or handle it appropriately in the UI. For now, this is a basic removal.
        // If tree.rootPersonId was the deleted person, it should be cleared or updated.
        if (mockTreeData.rootPersonId === personId) {
            mockTreeData.rootPersonId = null; // Or find a new root if applicable
        }


        resolve();
      }, MOCK_DELAY);
    });
  },

  addPersonToTree: (treeId: string, personData: Omit<FamilyMember, 'id' | 'parentIds' | 'childIds' | 'spouseIds'>): Promise<FamilyMember> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (treeId !== mockTreeData.id) {
          reject(new Error('Family tree not found.'));
          return;
        }
        const newPerson: FamilyMember = {
          ...personData,
          id: `p${nextPersonId++}`,
          parentIds: [],
          childIds: [],
          spouseIds: [],
        };
        mockTreeData.members.push(newPerson);
        resolve(JSON.parse(JSON.stringify(newPerson)));
      }, MOCK_DELAY);
    });
  },

  updatePersonInTree: (treeId: string, personData: FamilyMember): Promise<FamilyMember> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (treeId !== mockTreeData.id) {
          reject(new Error('Family tree not found.'));
          return;
        }
        const index = mockTreeData.members.findIndex(p => p.id === personData.id);
        if (index !== -1) {
          mockTreeData.members[index] = { ...mockTreeData.members[index], ...personData };
          resolve(JSON.parse(JSON.stringify(mockTreeData.members[index])));
        } else {
          reject(new Error('Person not found in tree.'));
        }
      }, MOCK_DELAY);
    });
  },

  addRelationship: (treeId: string, relationshipData: Omit<Relationship, 'id'>): Promise<Relationship> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (treeId !== mockTreeData.id) {
          reject(new Error('Family tree not found.'));
          return;
        }
        const p1Exists = mockTreeData.members.some(m => m.id === relationshipData.person1Id);
        const p2Exists = mockTreeData.members.some(m => m.id === relationshipData.person2Id);

        if (!p1Exists || !p2Exists) {
          reject(new Error('One or both persons in the relationship not found.'));
          return;
        }

        const newRelationship: Relationship = {
          ...relationshipData,
          id: `r${nextRelationshipId++}`,
        };
        mockTreeData.relationships.push(newRelationship);

        // Optional: Update parentIds, childIds, spouseIds on the members themselves
        // This can get complex and depends on how you want to manage data consistency.
        // For PARENT_CHILD, person1Id is parent, person2Id is child.
        // For SPOUSE, they are spouses of each other.

        resolve(JSON.parse(JSON.stringify(newRelationship)));
      }, MOCK_DELAY);
    });
  }
};
