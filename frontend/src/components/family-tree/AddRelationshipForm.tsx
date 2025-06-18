// src/components/family-tree/AddRelationshipForm.tsx
import React, { useState } from 'react';
import { FamilyMember, Relationship } from '../../types/genealogy'; // Adjust path
import { Button
} from '../ui'; // Adjust path

interface AddRelationshipFormProps {
  sourcePerson: FamilyMember;
  potentialTargets: FamilyMember[]; // All other members in the tree
  onAddRelationship: (targetId: string, type: Relationship['type']) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error?: string | null;
}

const AddRelationshipForm: React.FC<AddRelationshipFormProps> = ({
  sourcePerson,
  potentialTargets,
  onAddRelationship,
  onCancel,
  isLoading,
  error
}) => {
  const [targetPersonId, setTargetPersonId] = useState<string>('');
  const [relationshipType, setRelationshipType] = useState<Relationship['type']>('SPOUSE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPersonId) {
      alert('Please select a person to connect.'); // Basic validation
      return;
    }
    console.log(`Attempting to add relationship: ${sourcePerson.name} -> ${relationshipType} -> ${potentialTargets.find(p=>p.id === targetPersonId)?.name}`);
    // Actual call to onAddRelationship will be for future implementation that updates state/backend
    // For now, we just log it or can call a placeholder onAddRelationship.
    await onAddRelationship(targetPersonId, relationshipType);
  };

  // Filter out the source person from the list of targets
  const selectableTargets = potentialTargets.filter(p => p.id !== sourcePerson.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-700">Connect: {sourcePerson.name}</p>
      </div>
      <div>
        <label htmlFor="relationshipType" className="block text-sm font-medium text-gray-700 mb-1">Relationship Type</label>
        <select
          id="relationshipType"
          name="relationshipType"
          value={relationshipType}
          onChange={(e) => setRelationshipType(e.target.value as Relationship['type'])}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          disabled={isLoading}
        >
          <option value="SPOUSE">Spouse</option>
          <option value="PARENT_CHILD">This person is PARENT of (selected person)</option>
          {/* For PARENT_CHILD, sourcePerson is parent, target is child. Or vice-versa depending on UI flow.
              Let's assume for this form: sourcePerson is PARENT of targetPerson.
              If you want to set sourcePerson as CHILD of targetPerson, the UI/labeling might need adjustment
              or the service layer would handle the directionality.
          */}
        </select>
      </div>
      <div>
        <label htmlFor="targetPerson" className="block text-sm font-medium text-gray-700 mb-1">With Person</label>
        <select
          id="targetPerson"
          name="targetPerson"
          value={targetPersonId}
          onChange={(e) => setTargetPersonId(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          disabled={isLoading || selectableTargets.length === 0}
        >
          <option value="">-- Select a Person --</option>
          {selectableTargets.map(person => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
        {selectableTargets.length === 0 && <p className="text-xs text-gray-500 mt-1">No other people available to connect.</p>}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end space-x-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading || !targetPersonId}>
          {isLoading ? 'Connecting...' : 'Add Connection'}
        </Button>
      </div>
    </form>
  );
};

export default AddRelationshipForm;
