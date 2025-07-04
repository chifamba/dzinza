// src/components/family-tree/SimpleEditPersonForm.tsx
import React, { useState } from "react";
import { FamilyMember } from "../../types/genealogy"; // Adjust path
import { Input, Button } from "../ui"; // Adjust path

interface SimpleEditPersonFormProps {
  person: FamilyMember;
  onSubmit: (personData: Partial<FamilyMember>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  error?: string | null;
}

const SimpleEditPersonForm: React.FC<SimpleEditPersonFormProps> = ({
  person,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}) => {
  const [firstName, setFirstName] = useState(person.firstName || "");
  const [middleName, setMiddleName] = useState(person.middleName || "");
  const [lastName, setLastName] = useState(person.lastName || "");
  const [birthDate, setBirthDate] = useState(person.birthDate || "");
  const [deathDate, setDeathDate] = useState(person.deathDate || "");
  const [gender, setGender] = useState<"male" | "female" | "other" | "unknown">(
    person.gender || "unknown"
  );
  const [profileImageUrl, setProfileImageUrl] = useState(
    person.profileImageUrl || ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Generate full name from components
    const fullName = [firstName, middleName, lastName]
      .filter((name) => name.trim())
      .join(" ");

    const personData = {
      name: fullName,
      firstName: firstName.trim() || undefined,
      middleName: middleName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      birthDate: birthDate || undefined,
      deathDate: deathDate || undefined,
      gender,
      profileImageUrl: profileImageUrl || undefined,
    };
    await onSubmit(personData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name Fields */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Name Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="First Name"
            name="firstName"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            disabled={isSubmitting}
          />
          <Input
            label="Middle Name (Optional)"
            name="middleName"
            type="text"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
            placeholder="Michael"
            disabled={isSubmitting}
          />
          <Input
            label="Last Name"
            name="lastName"
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            disabled={isSubmitting}
          />
        </div>

        {/* Show preview of full name */}
        {(firstName.trim() || lastName.trim()) && (
          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
            <span className="font-medium">Full Name Preview: </span>
            {[firstName, middleName, lastName]
              .filter((name) => name.trim())
              .join(" ") || "Enter at least first or last name"}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Birth Date"
          name="birthDate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          disabled={isSubmitting}
        />
        <Input
          label="Death Date (Optional)"
          name="deathDate"
          type="date"
          value={deathDate}
          onChange={(e) => setDeathDate(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Gender
        </label>
        <select
          value={gender}
          onChange={(e) =>
            setGender(e.target.value as "male" | "female" | "other" | "unknown")
          }
          disabled={isSubmitting}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        type="url"
        value={profileImageUrl}
        onChange={(e) => setProfileImageUrl(e.target.value)}
        placeholder="https://example.com/photo.jpg"
        disabled={isSubmitting}
      />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || (!firstName.trim() && !lastName.trim())}
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
};

export default SimpleEditPersonForm;
