// src/components/family-tree/EditableFamilyTreeDisplay.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { FamilyTree, FamilyMember, Relationship } from "../../types/genealogy";
import { genealogyService } from "../../services/api/genealogyService";
import Tree, { RawNodeDatum, RenderCustomNodeElementFn } from "react-d3-tree";
import { Button, Modal } from "../ui";
import AddPersonForm from "./AddPersonForm";
import EditPersonForm from "./EditPersonForm";
import AddRelationshipForm from "./AddRelationshipForm";
import EditableTreePersonNode from "./EditableTreePersonNode";
import FamilyTreeToolbar from "./FamilyTreeToolbar";
import RelationshipCreationDialog from "./RelationshipCreationDialog";
import { RootState } from "../../store";

const EditableFamilyTreeDisplay: React.FC = () => {
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth state
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [isRelationshipCreationMode, setIsRelationshipCreationMode] =
    useState(false);
  const [selectedPersonForRelationship, setSelectedPersonForRelationship] =
    useState<FamilyMember | null>(null);
  const [pendingRelationshipPerson, setPendingRelationshipPerson] =
    useState<FamilyMember | null>(null);

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

  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  const [sourcePersonForRelationship, setSourcePersonForRelationship] =
    useState<FamilyMember | null>(null);
  const [isSubmittingRelationship, setIsSubmittingRelationship] =
    useState(false);
  const [submitRelationshipError, setSubmitRelationshipError] = useState<
    string | null
  >(null);

  // Enhanced relationship creation modal
  const [isEnhancedRelModalOpen, setIsEnhancedRelModalOpen] = useState(false);
  const [enhancedRelPerson1, setEnhancedRelPerson1] =
    useState<FamilyMember | null>(null);
  const [enhancedRelPerson2, setEnhancedRelPerson2] =
    useState<FamilyMember | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState<FamilyMember | null>(
    null
  );
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [submitDeleteError, setSubmitDeleteError] = useState<string | null>(
    null
  );

  const [isDeleteRelModalOpen, setIsDeleteRelModalOpen] = useState(false);
  const [deletingRelDetails, setDeletingRelDetails] = useState<{
    person1Id: string;
    person2Id: string;
    type:
      | "SPOUSE"
      | "PARENT_CHILD_PARENT_PERSPECTIVE"
      | "PARENT_CHILD_CHILD_PERSPECTIVE";
    person1Name?: string;
    person2Name?: string;
  } | null>(null);
  const [isSubmittingDeleteRel, setIsSubmittingDeleteRel] = useState(false);
  const [submitDeleteRelError, setSubmitDeleteRelError] = useState<
    string | null
  >(null);

  // Tree visualization state
  const [d3TreeData, setD3TreeData] = useState<RawNodeDatum | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [initialTranslate, setInitialTranslate] = useState({ x: 0, y: 0 });

  // Calculate initial center
  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const initialX = width / 2;
      const initialY = height * 0.1;
      setTranslate({ x: initialX, y: initialY });
      setInitialTranslate({ x: initialX, y: initialY });
    }
  }, []);

  // Zoom control functions
  const handleZoomIn = useCallback(() => {
    setZoom((prevZoom) => prevZoom * 1.2);
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prevZoom) => prevZoom / 1.2);
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setTranslate(initialTranslate);
  }, [initialTranslate]);

  // Edit mode handlers
  const handleToggleEditMode = () => {
    if (!isAuthenticated) return;
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      // Exit edit mode - reset relationship creation mode
      setIsRelationshipCreationMode(false);
      setSelectedPersonForRelationship(null);
      setPendingRelationshipPerson(null);
    }
  };

  const handleToggleRelationshipMode = () => {
    setIsRelationshipCreationMode(!isRelationshipCreationMode);
    setSelectedPersonForRelationship(null);
    setPendingRelationshipPerson(null);
  };

  const handleCancelRelationshipCreation = () => {
    setIsRelationshipCreationMode(false);
    setSelectedPersonForRelationship(null);
    setPendingRelationshipPerson(null);
  };

  const handleStartRelationshipCreation = (person: FamilyMember) => {
    if (
      isRelationshipCreationMode &&
      selectedPersonForRelationship &&
      selectedPersonForRelationship.id !== person.id
    ) {
      // Complete the relationship - open the enhanced dialog
      setEnhancedRelPerson1(selectedPersonForRelationship);
      setEnhancedRelPerson2(person);
      setIsEnhancedRelModalOpen(true);
      setIsRelationshipCreationMode(false);
      setSelectedPersonForRelationship(null);
    } else {
      // Start relationship creation
      setSelectedPersonForRelationship(person);
      setIsRelationshipCreationMode(true);
    }
  };

  const handleAddPerson = (
    relativeToId?: string,
    relationType?: "parent" | "child" | "spouse"
  ) => {
    if (relativeToId && relationType) {
      setAddPersonContext({ relativeToId, relationType });
    } else {
      setAddPersonContext(null);
    }
    setIsAddModalOpen(true);
  };

  // Tree data building function (simplified version)
  const buildTreeData = (
    members: FamilyMember[],
    relationships: Relationship[]
  ): RawNodeDatum | null => {
    if (!members || members.length === 0) {
      return { name: "No Data" };
    }

    const childrenMap = new Map<string, string[]>();
    const memberNodeMap = new Map<string, RawNodeDatum>();

    relationships.forEach((rel) => {
      if (rel.type === "PARENT_CHILD") {
        const children = childrenMap.get(rel.person1Id) || [];
        children.push(rel.person2Id);
        childrenMap.set(rel.person1Id, children);
      }
    });

    members.forEach((member) => {
      memberNodeMap.set(member.id, {
        name: member.name,
        attributes: {
          Gender: member.gender,
          Birthdate: member.birthDate || "N/A",
          ...(member.deathDate && { "Death Date": member.deathDate }),
          parentIds: member.parentIds || [],
          childIds: member.childIds || [],
          spouseIds: member.spouseIds || [],
          profileImageUrl: member.profileImageUrl,
        },
        originalId: member.id,
        children: [],
      });
    });

    const buildHierarchy = (
      personId: string,
      visited: Set<string>
    ): RawNodeDatum | null => {
      if (visited.has(personId)) return null;
      visited.add(personId);

      const node = memberNodeMap.get(personId);
      if (!node) return null;

      const childIds = childrenMap.get(personId) || [];
      node.children = childIds
        .map((childId) => buildHierarchy(childId, new Set(visited)))
        .filter((child) => child !== null) as RawNodeDatum[];

      return node;
    };

    const roots = members.filter(
      (member) => !member.parentIds || member.parentIds.length === 0
    );

    if (roots.length === 0 && members.length > 0) {
      return buildHierarchy(members[0].id, new Set());
    }

    if (roots.length === 1) {
      return buildHierarchy(roots[0].id, new Set());
    }

    return {
      name: "Family Trees",
      children: roots
        .map((root) => buildHierarchy(root.id, new Set()))
        .filter(Boolean) as RawNodeDatum[],
    };
  };

  // Custom node renderer
  const renderCustomNodeElement: RenderCustomNodeElementFn = ({
    nodeDatum,
  }) => (
    <EditableTreePersonNode
      nodeDatum={nodeDatum}
      toggleNode={() => {}}
      onEdit={handleEditPerson}
      onConnectRelationship={handleConnectRelationship}
      onDelete={handleDeletePerson}
      onDeleteRelationship={handleDeleteRelationship}
      allMembers={tree?.members || []}
      onViewProfile={handleViewProfile}
      onAddPerson={handleAddPerson}
      onStartRelationshipCreation={handleStartRelationshipCreation}
      isAuthenticated={isAuthenticated}
      isEditMode={isEditMode}
      isRelationshipCreationMode={isRelationshipCreationMode}
      selectedPersonForRelationship={selectedPersonForRelationship}
    />
  );

  // API handlers (existing logic)
  const loadFamilyTree = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedTree = await genealogyService.getFamilyTree();
      setTree(fetchedTree);

      if (fetchedTree && fetchedTree.members) {
        const treeData = buildTreeData(
          fetchedTree.members,
          fetchedTree.relationships || []
        );
        setD3TreeData(treeData);
      }
    } catch (err) {
      console.error("Error loading family tree:", err);
      setError("Failed to load family tree. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAddPerson = async (personData: any) => {
    try {
      setIsSubmittingAdd(true);
      setSubmitAddError(null);

      const newMember = await genealogyService.addFamilyMember({
        name: personData.name,
        gender: personData.gender,
        birthDate: personData.birthDate,
        deathDate: personData.deathDate,
        profileImageUrl: personData.profileImageUrl,
      });

      // Reload the family tree to show the new member
      await loadFamilyTree();

      // Close the modal
      setIsAddModalOpen(false);
      setAddPersonContext(null);
    } catch (err: any) {
      console.error("Error adding family member:", err);
      setSubmitAddError(err.message || "Failed to add family member");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleEditPerson = (person: FamilyMember) => {
    if (!isAuthenticated) return;
    setEditingPerson(person);
    setIsEditModalOpen(true);
  };

  const handleConnectRelationship = (person: FamilyMember) => {
    if (!isAuthenticated) return;
    if (
      isRelationshipCreationMode &&
      selectedPersonForRelationship &&
      selectedPersonForRelationship.id !== person.id
    ) {
      handleStartRelationshipCreation(person);
    } else {
      setSourcePersonForRelationship(person);
      setIsRelationshipModalOpen(true);
    }
  };

  const handleDeletePerson = (person: FamilyMember) => {
    if (!isAuthenticated) return;
    setDeletingPerson(person);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteRelationship = (
    person1Id: string,
    person2Id: string,
    type:
      | "SPOUSE"
      | "PARENT_CHILD_PARENT_PERSPECTIVE"
      | "PARENT_CHILD_CHILD_PERSPECTIVE"
  ) => {
    if (!isAuthenticated) return;
    const person1Name = tree?.members?.find((m) => m.id === person1Id)?.name;
    const person2Name = tree?.members?.find((m) => m.id === person2Id)?.name;
    setDeletingRelDetails({
      person1Id,
      person2Id,
      type,
      person1Name,
      person2Name,
    });
    setIsDeleteRelModalOpen(true);
  };

  const handleViewProfile = (person: FamilyMember) => {
    // Implementation for viewing profile
    console.log("View profile for:", person);
  };

  // Enhanced relationship creation handler
  const handleCreateEnhancedRelationship = async (
    person1Id: string,
    person2Id: string,
    relationshipType: string
  ) => {
    try {
      setIsSubmittingRelationship(true);
      setSubmitRelationshipError(null);

      await genealogyService.createRelationship({
        person1Id,
        person2Id,
        type: relationshipType as any,
      });

      await loadFamilyTree();
      setIsEnhancedRelModalOpen(false);
      setEnhancedRelPerson1(null);
      setEnhancedRelPerson2(null);
    } catch (err: any) {
      setSubmitRelationshipError(
        err.message || "Failed to create relationship"
      );
    } finally {
      setIsSubmittingRelationship(false);
    }
  };

  // Load tree on component mount
  useEffect(() => {
    loadFamilyTree();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Loading family tree...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  // Empty state - no family tree exists yet
  if (!tree || !tree.members || tree.members.length === 0) {
    return (
      <div className="relative w-full h-screen bg-gray-50">
        {/* Family Tree Toolbar - always show for consistency */}
        <FamilyTreeToolbar
          isAuthenticated={isAuthenticated}
          isEditMode={true} // Auto-enable edit mode for empty state
          isRelationshipCreationMode={isRelationshipCreationMode}
          selectedPersonForRelationship={selectedPersonForRelationship}
          onToggleEditMode={handleToggleEditMode}
          onToggleRelationshipMode={handleToggleRelationshipMode}
          onCancelRelationshipCreation={handleCancelRelationshipCreation}
          onAddPerson={() => handleAddPerson()}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
        />

        {/* Welcome/Empty State */}
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md px-6">
            <div className="mb-6">
              <svg
                className="mx-auto h-24 w-24 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Start Your Family Tree
            </h2>
            <p className="text-gray-600 mb-8">
              Welcome to your family tree canvas! Begin by adding your first
              family member. You can add parents, children, and spouses as you
              build your family history.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => handleAddPerson()}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add First Family Member
              </button>
              <div className="text-sm text-gray-500">
                <p>💡 Tip: Start with yourself or a central family member</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modals for adding first person - include Add Person Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setAddPersonContext(null);
            setSubmitAddError(null);
          }}
          title="Add Family Member"
          size="lg"
        >
          <AddPersonForm
            onSubmit={handleSubmitAddPerson}
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
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gray-50">
      {/* Family Tree Toolbar */}
      <FamilyTreeToolbar
        isAuthenticated={isAuthenticated}
        isEditMode={isEditMode}
        isRelationshipCreationMode={isRelationshipCreationMode}
        selectedPersonForRelationship={selectedPersonForRelationship}
        onToggleEditMode={handleToggleEditMode}
        onToggleRelationshipMode={handleToggleRelationshipMode}
        onCancelRelationshipCreation={handleCancelRelationshipCreation}
        onAddPerson={() => handleAddPerson()}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
      />

      {/* Tree Container */}
      <div ref={containerRef} className="w-full h-full">
        {d3TreeData && (
          <Tree
            data={d3TreeData}
            orientation="vertical"
            translate={translate}
            zoom={zoom}
            nodeSize={{ x: 280, y: 200 }}
            separation={{ siblings: 1, nonSiblings: 1.5 }}
            renderCustomNodeElement={renderCustomNodeElement}
            pathFunc="elbow"
            enableLegacyTransitions={false}
            draggable={false}
            zoomable={false}
            scaleExtent={{ min: 0.1, max: 3 }}
          />
        )}
      </div>

      {/* Enhanced Relationship Creation Modal */}
      {enhancedRelPerson1 && enhancedRelPerson2 && (
        <RelationshipCreationDialog
          isOpen={isEnhancedRelModalOpen}
          onClose={() => {
            setIsEnhancedRelModalOpen(false);
            setEnhancedRelPerson1(null);
            setEnhancedRelPerson2(null);
          }}
          person1={enhancedRelPerson1}
          person2={enhancedRelPerson2}
          onCreateRelationship={handleCreateEnhancedRelationship}
          isSubmitting={isSubmittingRelationship}
          error={submitRelationshipError}
        />
      )}

      {/* Add Person Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setAddPersonContext(null);
          setSubmitAddError(null);
        }}
        title="Add Family Member"
        size="lg"
      >
        <AddPersonForm
          onSubmit={handleSubmitAddPerson}
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

      {/* Other existing modals can be added here as needed */}
    </div>
  );
};

export default EditableFamilyTreeDisplay;
