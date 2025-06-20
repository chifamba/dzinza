// src/components/family-tree/AddPersonForm.tsx
import React, { useState } from "react";
import { FamilyMember } from "../../types/genealogy"; // Adjust path
import { Input, Button } from "../ui"; // Adjust path

interface AddPersonFormProps {
  onSubmit: (
    personData: Omit<
      FamilyMember,
      "id" | "parentIds" | "childIds" | "spouseIds"
    >
  ) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  error?: string | null;
  context?: {
    relativeToId: string;
    relationType: "parent" | "child" | "spouse";
  } | null;
}

const AddPersonForm: React.FC<AddPersonFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting,
  error,
  context,
}) => {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "unknown">(
    "unknown"
  );
  const [profileImageUrl, setProfileImageUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const personData = { 
      name, 
      birthDate: birthDate || undefined, 
      deathDate: deathDate || undefined, 
      gender, 
      profileImageUrl: profileImageUrl || undefined 
    };
    await onSubmit(personData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {context && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-700">
            Adding {context.relationType} to selected family member
          </p>
        </div>
      )}
      
      <Input
        label="Full Name"
        name="name"
        type="text"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="John Doe"
        disabled={isSubmitting}
      />
      
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
          onChange={(e) => setGender(e.target.value as "male" | "female" | "other" | "unknown")}
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
          disabled={isSubmitting || !name.trim()}
        >
          {isSubmitting ? "Adding..." : "Add Family Member"}
        </Button>
      </div>
    </form>
  );
};

export default AddPersonForm;
