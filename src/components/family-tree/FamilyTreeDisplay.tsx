// src/components/family-tree/FamilyTreeDisplay.tsx
import React, { useEffect, useState } from 'react';
import { FamilyTree, FamilyMember, Relationship } from '../../types/genealogy';
import { genealogyService } from '../../services/api/genealogyService';
import PersonNode from './PersonNode';
import { Button, Modal } from '../ui';
import AddPersonForm from './AddPersonForm';
import EditPersonForm from './EditPersonForm';
import AddRelationshipForm from './AddRelationshipForm'; // Import

const FamilyTreeDisplay: React.FC = () => {
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Person Modal State (existing)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [submitAddError, setSubmitAddError] = useState<string | null>(null);

  // Edit Person Modal State (existing)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<FamilyMember | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [submitEditError, setSubmitEditError] = useState<string | null>(null);

  // Add Relationship Modal State
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  const [sourcePersonForRelationship, setSourcePersonForRelationship] = useState<FamilyMember | null>(null);
  const [isSubmittingRelationship, setIsSubmittingRelationship] = useState(false);
  const [submitRelationshipError, setSubmitRelationshipError] = useState<string | null>(null);


  const fetchTreeData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await genealogyService.getFamilyTree('tree1');
      setTree(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load family tree.');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => { fetchTreeData(); }, []);

  const openAddPersonModal = () => {
    setSubmitAddError(null);
    setIsAddModalOpen(true);
  };
  const handleConfirmAddPerson = async (personData: Omit<FamilyMember, 'id' | 'parentIds' | 'childIds' | 'spouseIds'>) => {
    setIsSubmittingAdd(true);
    setSubmitAddError(null);
    try {
      await genealogyService.addPersonToTree('tree1', personData);
      setIsAddModalOpen(false);
      await fetchTreeData();
    } catch (err: any) {
      setSubmitAddError(err.message || 'Failed to add person.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const openEditPersonModal = (person: FamilyMember) => {
    setEditingPerson(person);
    setSubmitEditError(null);
    setIsEditModalOpen(true);
  };
  const handleConfirmUpdatePerson = async (personData: FamilyMember) => {
    if (!editingPerson) return;
    setIsSubmittingEdit(true);
    setSubmitEditError(null);
    try {
      await genealogyService.updatePersonInTree('tree1', personData);
      setIsEditModalOpen(false);
      setEditingPerson(null);
      await fetchTreeData();
    } catch (err: any) {
      setSubmitEditError(err.message || 'Failed to update person.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Add Relationship Logic
  const openRelationshipModal = (person: FamilyMember) => {
    setSourcePersonForRelationship(person);
    setSubmitRelationshipError(null);
    setIsRelationshipModalOpen(true);
  };

  const handleConfirmAddRelationship = async (targetId: string, type: Relationship['type']) => {
    if (!sourcePersonForRelationship) return;

    setIsSubmittingRelationship(true);
    setSubmitRelationshipError(null);
    console.log(
      `Placeholder: Connecting ${sourcePersonForRelationship.name} (ID: ${sourcePersonForRelationship.id})
       with person ID: ${targetId} as ${type}`
    );
    // Simulate API call
    try {
      // This is where you would call:
      // await genealogyService.addRelationship('tree1', {
      //   person1Id: sourcePersonForRelationship.id,
      //   person2Id: targetId,
      //   type
      // });
      await new Promise(resolve => setTimeout(resolve, 700)); // Mock delay
      console.log('Relationship (mock) added successfully.');
      setIsRelationshipModalOpen(false);
      setSourcePersonForRelationship(null);
      // await fetchTreeData(); // Eventually refresh tree to show new relationships
    } catch (err: any) {
      console.error("Failed to add relationship (mock):", err);
      setSubmitRelationshipError(err.message || 'Failed to add relationship.');
    } finally {
      setIsSubmittingRelationship(false);
    }
  };

  // Full return statement for FamilyTreeDisplay:
  if (isLoading && !tree) {
    return <div className="p-4 text-center">Loading family tree...</div>;
  }
  if (error && !tree) {
    return <div className="p-4 text-center text-red-600">Error: {error}</div>;
  }

  const currentMembers = tree?.members || [];

  if (currentMembers.length === 0 && !isLoading) { // Check isLoading to prevent flash of "No data"
    return (
      <div className="p-4 text-center">
        No family tree data found.
        <Button onClick={openAddPersonModal} className="ml-2" variant="primary">
          Add First Person
        </Button>
        {isAddModalOpen && (
          <Modal isOpen={isAddModalOpen} onClose={() => !isSubmittingAdd && setIsAddModalOpen(false)} title="Add New Person">
            <AddPersonForm
              onAddPerson={handleConfirmAddPerson}
              onCancel={() => setIsAddModalOpen(false)}
              isLoading={isSubmittingAdd}
              error={submitAddError}
            />
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">{tree?.name || 'Family Tree'}</h2>
        <Button onClick={openAddPersonModal} variant="primary">
          Add Person
        </Button>
      </div>
      {isLoading && tree && <p className="text-center text-sm text-gray-500 mb-4">Refreshing tree...</p>}
      {!isLoading && error && <p className="text-center text-sm text-red-500 mb-4">Error refreshing tree: {error}</p>}

      <div className="flex flex-wrap justify-center gap-4">
        {currentMembers.map((person) => (
          <PersonNode
            key={person.id}
            person={person}
            onEdit={openEditPersonModal}
            onConnectRelationship={openRelationshipModal}
          />
        ))}
      </div>

      {isAddModalOpen && (
        <Modal isOpen={isAddModalOpen} onClose={() => !isSubmittingAdd && setIsAddModalOpen(false)} title="Add New Person">
          <AddPersonForm
            onAddPerson={handleConfirmAddPerson}
            onCancel={() => setIsAddModalOpen(false)}
            isLoading={isSubmittingAdd}
            error={submitAddError}
          />
        </Modal>
      )}

      {editingPerson && isEditModalOpen && (
        <Modal isOpen={isEditModalOpen} onClose={() => !isSubmittingEdit && setIsEditModalOpen(false)} title={`Edit ${editingPerson.name}`}>
          <EditPersonForm
            person={editingPerson}
            onUpdatePerson={handleConfirmUpdatePerson}
            onCancel={() => setIsEditModalOpen(false)}
            isLoading={isSubmittingEdit}
            error={submitEditError}
          />
        </Modal>
      )}

      {sourcePersonForRelationship && isRelationshipModalOpen && (
        <Modal
          isOpen={isRelationshipModalOpen}
          onClose={() => !isSubmittingRelationship && setIsRelationshipModalOpen(false)}
          title={`Connect ${sourcePersonForRelationship.name} with...`}
        >
          <AddRelationshipForm
            sourcePerson={sourcePersonForRelationship}
            potentialTargets={currentMembers}
            onAddRelationship={handleConfirmAddRelationship}
            onCancel={() => setIsRelationshipModalOpen(false)}
            isLoading={isSubmittingRelationship}
            error={submitRelationshipError}
          />
        </Modal>
      )}
    </div>
  );
};
export default FamilyTreeDisplay;
