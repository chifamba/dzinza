// src/components/family-tree/EditPersonForm.tsx
import React, { useState, useEffect } from 'react';
import { FamilyMember } from '../../types/genealogy'; // Adjust path
import { Input, Button } from '../ui'; // Adjust path
import PersonEventsList from '../../components/events/PersonEventsList'; // Import PersonEventsList

interface EditPersonFormProps {
  person: FamilyMember;
  onUpdatePerson: (personData: FamilyMember) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error?: string | null;
  initialMode?: 'view' | 'edit';
  allMembers?: FamilyMember[]; // Added for displaying relationship names
}

const EditPersonForm: React.FC<EditPersonFormProps> = ({
  person,
  onUpdatePerson,
  onCancel,
  isLoading,
  error,
  initialMode = 'edit',
  allMembers = [], // Default to empty array
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);

  const getNameById = (id: string) => allMembers?.find(m => m.id === id)?.name || 'Unknown';

  // Form field states
  const [name, setName] = useState(person.name);
  const [birthDate, setBirthDate] = useState(person.birthDate || '');
  const [deathDate, setDeathDate] = useState(person.deathDate || '');
  const [gender, setGender] = useState(person.gender || 'unknown');
  const [profileImageUrl, setProfileImageUrl] = useState(person.profileImageUrl || '');

  const resetFormFields = (p: FamilyMember) => {
    setName(p.name);
    setBirthDate(p.birthDate || '');
    setDeathDate(p.deathDate || '');
    setGender(p.gender || 'unknown');
    setProfileImageUrl(p.profileImageUrl || '');
  };

  useEffect(() => {
    resetFormFields(person);
    setMode(initialMode);
  }, [person, initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'edit') {
      const updatedPersonData: FamilyMember = {
        ...person,
        name,
        birthDate: birthDate || undefined,
        deathDate: deathDate || undefined,
        gender: gender as FamilyMember['gender'],
        profileImageUrl: profileImageUrl || undefined,
      };
      await onUpdatePerson(updatedPersonData);
    }
  };

  if (mode === 'view') {
    return (
      <div className="space-y-3 p-2">
        {profileImageUrl && (
          <div className="flex justify-center my-4">
            <img
              src={profileImageUrl}
              alt={name}
              className="w-32 h-32 rounded-full object-cover border-2 border-gray-300 shadow"
            />
          </div>
        )}
        <div className="text-center mb-4">
            <h3 className="text-xl font-semibold">{name}</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div><strong className="font-medium text-gray-600">Gender:</strong> <span className="capitalize">{gender}</span></div>
            {birthDate && <div><strong className="font-medium text-gray-600">Birth Date:</strong> {birthDate}</div>}
            {deathDate && <div><strong className="font-medium text-gray-600">Death Date:</strong> {deathDate}</div>}
        </div>

        {/* Relationships Display */}
        <div className="mt-3 pt-3 border-t">
          <h4 className="text-md font-semibold text-gray-800 mb-2">Relationships</h4>
          {person.parentIds && person.parentIds.length > 0 && (
            <div className="mb-2">
              <h5 className="font-medium text-gray-600 text-sm">Parents:</h5>
              <ul className="list-disc list-inside text-sm text-gray-500 ml-4">
                {person.parentIds.map(id => <li key={id}>{getNameById(id)}</li>)}
              </ul>
            </div>
          )}
          {person.spouseIds && person.spouseIds.length > 0 && (
            <div className="mb-2">
              <h5 className="font-medium text-gray-600 text-sm">Spouse(s):</h5>
              <ul className="list-disc list-inside text-sm text-gray-500 ml-4">
                {person.spouseIds.map(id => <li key={id}>{getNameById(id)}</li>)}
              </ul>
            </div>
          )}
          {person.childIds && person.childIds.length > 0 && (
            <div className="mb-2">
              <h5 className="font-medium text-gray-600 text-sm">Children:</h5>
              <ul className="list-disc list-inside text-sm text-gray-500 ml-4">
                {person.childIds.map(id => <li key={id}>{getNameById(id)}</li>)}
              </ul>
            </div>
          )}
          {(!person.parentIds || person.parentIds.length === 0) &&
           (!person.spouseIds || person.spouseIds.length === 0) &&
           (!person.childIds || person.childIds.length === 0) && (
            <p className="text-xs text-gray-400 italic">No relationships defined.</p>
          )}
        </div>

        {/* Related Stories & Events Section */}
        <div className="mt-3 pt-3 border-t">
          <h4 className="text-md font-semibold text-gray-800 mb-2">Related Stories & Events</h4>
          <PersonEventsList personId={person.id} />
        </div>

        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        <div className="flex justify-end space-x-3 pt-4 mt-4 border-t">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Close
          </Button>
          <Button type="button" variant="primary" onClick={() => setMode('edit')}>
            Edit Profile
          </Button>
        </div>
      </div>
    );
  }

  // Edit Mode Form (existing structure adapted)
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Full Name"
        name="name"
        type="text"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={isLoading}
      />
      <Input
        label="Birth Date (YYYY-MM-DD)"
        name="birthDate"
        type="text"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        disabled={isLoading}
      />
      <Input
        label="Death Date (YYYY-MM-DD)"
        name="deathDate"
        type="text"
        value={deathDate}
        onChange={(e) => setDeathDate(e.target.value)}
        disabled={isLoading}
      />
      <div>
        <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
        <select
          id="gender"
          name="gender"
          value={gender}
          onChange={(e) => setGender(e.target.value as FamilyMember['gender'])}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          disabled={isLoading}
        >
          <option value="unknown">Unknown</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>
      <Input
        label="Profile Image URL (Optional)"
        name="profileImageUrl"
        type="text"
        value={profileImageUrl}
        onChange={(e) => setProfileImageUrl(e.target.value)}
        disabled={isLoading}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end space-x-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (initialMode === 'view') {
              resetFormFields(person); // Reset data to original
              setMode('view');
            } else {
              onCancel();
            }
          }}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};

export default EditPersonForm;
