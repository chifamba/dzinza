// src/components/family-tree/EditPersonForm.tsx
import React, { useState, useEffect } from 'react';
import { FamilyMember } from '../../types/genealogy'; // Adjust path
import { Input, Button } from '../ui'; // Adjust path

interface EditPersonFormProps {
  person: FamilyMember; // Current person data to edit
  onUpdatePerson: (personData: FamilyMember) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error?: string | null;
}

const EditPersonForm: React.FC<EditPersonFormProps> = ({ person, onUpdatePerson, onCancel, isLoading, error }) => {
  const [name, setName] = useState(person.name);
  const [birthDate, setBirthDate] = useState(person.birthDate || '');
  const [deathDate, setDeathDate] = useState(person.deathDate || '');
  const [gender, setGender] = useState(person.gender || 'unknown');
  const [profileImageUrl, setProfileImageUrl] = useState(person.profileImageUrl || '');

  useEffect(() => {
    setName(person.name);
    setBirthDate(person.birthDate || '');
    setDeathDate(person.deathDate || '');
    setGender(person.gender || 'unknown');
    setProfileImageUrl(person.profileImageUrl || '');
  }, [person]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPersonData: FamilyMember = {
      ...person, // Keep existing fields like id, parentIds etc.
      name,
      birthDate: birthDate || undefined, // Store as undefined if empty
      deathDate: deathDate || undefined,
      gender: gender as FamilyMember['gender'],
      profileImageUrl: profileImageUrl || undefined,
    };
    await onUpdatePerson(updatedPersonData);
  };

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
          onChange={(e) => setGender(e.target.value as any)}
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
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
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
