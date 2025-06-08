// src/services/api/genealogyService.ts
import { FamilyTree, FamilyMember, Relationship } from '../../types/genealogy'; // Adjust path as needed

const MOCK_DELAY = 500;

// Initial Mock Data
let mockTreeData: FamilyTree = {
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
