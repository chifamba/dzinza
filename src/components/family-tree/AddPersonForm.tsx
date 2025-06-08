// src/components/family-tree/AddPersonForm.tsx
import React, { useState } from 'react';
import { FamilyMember } from '../../types/genealogy'; // Adjust path
import { Input, Button } from '../ui'; // Adjust path

interface AddPersonFormProps {
  onAddPerson: (personData: Omit<FamilyMember, 'id' | 'parentIds' | 'childIds' | 'spouseIds'>) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error?: string | null;
}

const AddPersonForm: React.FC<AddPersonFormProps> = ({ onAddPerson, onCancel, isLoading, error }) => {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'unknown'>('unknown');
  const [profileImageUrl, setProfileImageUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const personData = { name, birthDate, deathDate, gender, profileImageUrl };
    await onAddPerson(personData);
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
        placeholder="John Doe"
        disabled={isLoading}
      />
      <Input
        label="Birth Date (YYYY-MM-DD)"
        name="birthDate"
        type="text" // Could be date type, but text is simpler for now
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        placeholder="1990-01-01"
        disabled={isLoading}
      />
      <Input
        label="Death Date (YYYY-MM-DD)"
        name="deathDate"
        type="text"
        value={deathDate}
        onChange={(e) => setDeathDate(e.target.value)}
        placeholder="2050-01-01"
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
        placeholder="https://example.com/image.jpg"
        disabled={isLoading}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end space-x-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? 'Adding...' : 'Add Person'}
        </Button>
      </div>
    </form>
  );
};

export default AddPersonForm;
