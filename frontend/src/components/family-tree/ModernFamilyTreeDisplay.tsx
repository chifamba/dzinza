// src/components/family-tree/ModernFamilyTreeDisplay.tsx
import React, { useEffect, useState } from "react";
import { FamilyTree, FamilyMember } from "../../types/genealogy";
import { genealogyService } from "../../services/api/genealogyService";
import { Button, Modal, Card } from "../ui";
import AddPersonForm from "./AddPersonForm";
import SimpleEditPersonForm from "./SimpleEditPersonForm";
import PersonCard from "./PersonCard";
import FamilyTreeStats from "./FamilyTreeStats";
import FamilyUnit from "./FamilyUnit";
import { organizeFamilyTree } from "./FamilyTreeOrganizer";

const ModernFamilyTreeDisplay: React.FC = () => {
  const [tree, setTree] = useState<FamilyTree | Partial<FamilyTree> | null>(null); // Allow Partial for initial load
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noTreeFound, setNoTreeFound] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [submitAddError, setSubmitAddError] = useState<string | null>(null);
  const [addPersonContext, setAddPersonContext] = useState<{
    relativeToId: string;
    relationType: "parent" | "child" | "spouse";
  } | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<FamilyMember | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [submitEditError, setSubmitEditError] = useState<string | null>(null);

  // Load family tree data
  useEffect(() => {
    loadFamilyTree();
  }, []);

  const loadFamilyTree = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setNoTreeFound(false); // Reset no tree found state
      console.log("Loading family tree...");
      const familyTreeData = await genealogyService.getFamilyTree();

      if (familyTreeData) {
        console.log("Family tree loaded:", familyTreeData);
        setTree(familyTreeData);
      } else {
        console.log("No family tree found for the user.");
        setTree(null);
        setNoTreeFound(true);
      }
    } catch (err) {
      console.error("Failed to load family tree:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load family tree."
      );
      setTree(null); // Ensure tree is null on error
    } finally {
      setIsLoading(false);
    }
  };

  // Handle adding a new person
  const handleAddPerson = async (
    personData: Omit<
      FamilyMember,
      "id" | "parentIds" | "childIds" | "spouseIds"
    >
  ) => {
    try {
      setIsSubmittingAdd(true);
      setSubmitAddError(null);

      console.log("Adding person with data:", personData);
      console.log("Add person context:", addPersonContext);

      // Create the new person
      const newPerson = await genealogyService.addFamilyMember(personData);
      console.log("New person created:", newPerson);

      // Create relationship if context exists
      if (addPersonContext) {
        const { relativeToId, relationType } = addPersonContext;

        let relationshipData: {
          person1Id: string;
          person2Id: string;
          type: "SPOUSE" | "PARENT_CHILD" | "SIBLING";
        };

        if (relationType === "parent") {
          // New person is parent of existing person
          relationshipData = {
            person1Id: newPerson.id,
            person2Id: relativeToId,
            type: "PARENT_CHILD",
          };
        } else if (relationType === "child") {
          // New person is child of existing person
          relationshipData = {
            person1Id: relativeToId,
            person2Id: newPerson.id,
            type: "PARENT_CHILD",
          };
        } else if (relationType === "spouse") {
          // New person is spouse of existing person
          relationshipData = {
            person1Id: relativeToId,
            person2Id: newPerson.id,
            type: "SPOUSE",
          };
        } else {
          throw new Error(`Unknown relationship type: ${relationType}`);
        }

        console.log("Creating relationship:", relationshipData);
        const relationship = await genealogyService.createRelationship(
          relationshipData
        );
        console.log("Relationship created:", relationship);
      }

      // Refresh the tree to show the new person and relationship
      await loadFamilyTree();
      setIsAddModalOpen(false);
      setAddPersonContext(null);

      console.log("Person and relationship added successfully");
    } catch (err) {
      console.error("Failed to add person:", err);
      setSubmitAddError(
        err instanceof Error ? err.message : "Failed to add person."
      );
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handle editing a person
  const handleEditPerson = async (personData: Partial<FamilyMember>) => {
    if (!editingPerson) return;

    try {
      setIsSubmittingEdit(true);
      setSubmitEditError(null);

      await genealogyService.updatePersonInTree(editingPerson.id, personData);
      await loadFamilyTree(); // Refresh the tree
      setIsEditModalOpen(false);
      setEditingPerson(null);
    } catch (err) {
      console.error("Failed to edit person:", err);
      setSubmitEditError(
        err instanceof Error ? err.message : "Failed to edit person."
      );
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle adding a person with relationship context
  const handleAddWithRelationship = (
    relativeTo: FamilyMember,
    relationType: "parent" | "child" | "spouse"
  ) => {
    console.log("handleAddWithRelationship called with:", {
      relativeTo: relativeTo.name,
      relationType,
    });
    setAddPersonContext({
      relativeToId: relativeTo.id,
      relationType,
    });
    setIsAddModalOpen(true);
    console.log("Modal state set to open");
  };

  // Handle editing a person
  const handleEditClick = (person: FamilyMember) => {
    setEditingPerson(person);
    setIsEditModalOpen(true);
  };

  // Filter members based on search and generation
  const filteredMembers =
    tree?.members?.filter((member) => {
      const matchesSearch =
        !searchTerm ||
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.lastName?.toLowerCase().includes(searchTerm.toLowerCase());

      // For now, show all generations. In the future, we could implement generation filtering
      return matchesSearch;
    }) || [];

  // Group members by family relationships for better organization
  const organizedData = React.useMemo(() => {
    if (!tree?.members || !tree?.relationships) {
      console.log("No tree data or relationships available", { tree });
      return { familyUnits: [], individuals: filteredMembers };
    }

    const { familyUnits, individuals } = organizeFamilyTree(
      filteredMembers,
      tree.relationships
    );

    console.log("Organized family data:", {
      familyUnits,
      individuals,
      filteredMembers,
    });
    return { familyUnits, individuals };
  }, [filteredMembers, tree]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading family tree...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md mx-auto">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Error Loading Family Tree
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadFamilyTree}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (noTreeFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
         <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-12 h-12 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
            </svg>
          </div>
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-3">No Family Tree Found</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          It looks like you don't have any family trees yet, or we couldn't load one.
        </p>
        <Button
          onClick={() => setIsAddModalOpen(true)} // Assuming this opens a modal to create a tree or add first person
          className="bg-blue-600 hover:bg-blue-700"
        >
          Create Your First Family Tree
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-700 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
                {tree?.name || "Family Tree"}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1 transition-colors duration-200">
                Manage and explore your family connections
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add Family Member
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 transition-colors duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search family members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors duration-200"
                />
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 transition-colors duration-200">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <svg
                  className="w-4 h-4 mr-1 inline"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
                Grid
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <svg
                  className="w-4 h-4 mr-1 inline"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Section */}
        {tree && <FamilyTreeStats tree={tree} />}

        {/* Family Members Section */}
        {tree && tree.members && tree.members.length > 0 ? (
          <div className="mt-8">
            {/* Family Units */}
            {organizedData.familyUnits.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Family Units
                </h2>
                <div className="space-y-8">
                  {organizedData.familyUnits.map((familyUnit) => (
                    <FamilyUnit
                      key={familyUnit.id}
                      parents={familyUnit.parents}
                      children={familyUnit.children}
                      onEdit={handleEditClick}
                      onAddRelative={handleAddWithRelationship}
                      compact={viewMode === "list"}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Individual Members */}
            {organizedData.individuals.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {organizedData.familyUnits.length > 0
                    ? "Other Family Members"
                    : "Family Members"}
                </h2>
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                      : "space-y-4"
                  }
                >
                  {organizedData.individuals.map((member) => (
                    <PersonCard
                      key={member.id}
                      person={member}
                      onEdit={() => handleEditClick(member)}
                      onAddRelative={(
                        relationType: "parent" | "child" | "spouse"
                      ) => handleAddWithRelationship(member, relationType)}
                      compact={viewMode === "list"}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No family members yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start building your family tree by adding your first family
              member.
            </p>
            <Button
              onClick={() => {
                console.log("Add first family member button clicked");
                setIsAddModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add First Family Member
            </Button>
          </div>
        )}
      </div>

      {/* Add Person Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setAddPersonContext(null);
          setSubmitAddError(null);
        }}
        title="Add Family Member"
      >
        <AddPersonForm
          onSubmit={handleAddPerson}
          onCancel={() => {
            setIsAddModalOpen(false);
            setAddPersonContext(null);
            setSubmitAddError(null);
          }}
          isSubmitting={isSubmittingAdd}
          error={submitAddError}
          context={addPersonContext}
        />
      </Modal>

      {/* Edit Person Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPerson(null);
          setSubmitEditError(null);
        }}
        title="Edit Family Member"
      >
        {editingPerson && (
          <SimpleEditPersonForm
            person={editingPerson}
            onSubmit={handleEditPerson}
            onCancel={() => {
              setIsEditModalOpen(false);
              setEditingPerson(null);
              setSubmitEditError(null);
            }}
            isSubmitting={isSubmittingEdit}
            error={submitEditError}
          />
        )}
      </Modal>
    </div>
  );
};

export default ModernFamilyTreeDisplay;
