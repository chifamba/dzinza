import React, { useState, useEffect } from 'react';
import { UserData } from '../../store/slices/authSlice'; // Assuming UserData includes all editable fields
import { UpdateProfileData } from '../../services/api/auth'; // API type for update payload
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
// Assuming a Select component exists or using a native select
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';


interface EditProfileFormProps {
  currentUser: UserData;
  onUpdateProfile: (data: UpdateProfileData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({
  currentUser,
  onUpdateProfile,
  onCancel,
  isLoading,
  error,
}) => {
  const [firstName, setFirstName] = useState(currentUser.firstName || '');
  const [lastName, setLastName] = useState(currentUser.lastName || '');
  // Ensure dateOfBirth is handled correctly, it might be a string or Date object
  // For input type="date", it needs to be in "yyyy-MM-dd" format.
  const formatDateForInput = (dateString?: string | Date): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };
  const [dateOfBirth, setDateOfBirth] = useState(formatDateForInput(currentUser.dateOfBirth));
  const [preferredLanguage, setPreferredLanguage] = useState(currentUser.preferredLanguage || 'en');

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Pre-fill form when currentUser changes (e.g., after a fetch)
    setFirstName(currentUser.firstName || '');
    setLastName(currentUser.lastName || '');
    setDateOfBirth(formatDateForInput(currentUser.dateOfBirth));
    setPreferredLanguage(currentUser.preferredLanguage || 'en');
  }, [currentUser]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!firstName.trim()) newErrors.firstName = 'First name is required.';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required.';
    // Optional: Add date validation if needed, e.g., not in future
    if (dateOfBirth && isNaN(new Date(dateOfBirth).getTime())) {
        newErrors.dateOfBirth = 'Invalid date format.';
    }
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const updateData: UpdateProfileData = {
      firstName,
      lastName,
      // Only include dateOfBirth if it's a valid date string and not empty
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth).toISOString() }),
      preferredLanguage: preferredLanguage as 'en' | 'sn' | 'nd',
    };
    await onUpdateProfile(updateData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={isLoading}
        />
        {formErrors.firstName && <p className="text-red-500 text-sm mt-1">{formErrors.firstName}</p>}
      </div>

      <div>
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          disabled={isLoading}
        />
        {formErrors.lastName && <p className="text-red-500 text-sm mt-1">{formErrors.lastName}</p>}
      </div>

      <div>
        <Label htmlFor="dateOfBirth">Date of Birth</Label>
        <Input
          id="dateOfBirth"
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          disabled={isLoading}
        />
        {formErrors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{formErrors.dateOfBirth}</p>}
      </div>

      <div>
        <Label htmlFor="preferredLanguage">Preferred Language</Label>
        <select // Using native select for simplicity, replace with custom Select if available
          id="preferredLanguage"
          value={preferredLanguage}
          onChange={(e) => setPreferredLanguage(e.target.value as 'en' | 'sn' | 'nd')}
          disabled={isLoading}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="en">English</option>
          <option value="sn">Shona</option>
          <option value="nd">Ndebele</option>
        </select>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex justify-end space-x-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading}>
          Save Changes
        </Button>
      </div>
    </form>
  );
};

export default EditProfileForm;
