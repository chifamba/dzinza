// src/components/family-tree/FamilyTreeDisplay.tsx
import React, { useEffect, useState, useRef, useCallback } from "react"; // Added useRef, useCallback
import { FamilyTree, FamilyMember, Relationship } from "../../types/genealogy";
import { genealogyService } from "../../services/api/genealogyService";
import Tree, { RawNodeDatum, RenderCustomNodeElementFn } from "react-d3-tree"; // Import react-d3-tree
import { Button, Modal } from "../ui";
import AddPersonForm from "./AddPersonForm";
import TreePersonNode from "./TreePersonNode"; // Import the new TreePersonNode
import EditPersonForm from "./EditPersonForm";
import AddRelationshipForm from "./AddRelationshipForm"; // Import

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
  const [sourcePersonForRelationship, setSourcePersonForRelationship] =
    useState<FamilyMember | null>(null);
  const [isSubmittingRelationship, setIsSubmittingRelationship] =
    useState(false);
  const [submitRelationshipError, setSubmitRelationshipError] = useState<
    string | null
  >(null);

  // Delete Person Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState<FamilyMember | null>(
    null
  );
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [submitDeleteError, setSubmitDeleteError] = useState<string | null>(
    null
  );

  // Delete Relationship Modal State
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

  const [d3TreeData, setD3TreeData] = useState<RawNodeDatum | null>(null);
  const containerRef = useRef<HTMLDivElement>(null); // Ref for the tree container

  // State for zoom and pan/translate
  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [initialTranslate, setInitialTranslate] = useState({ x: 0, y: 0 }); // To store calculated initial center

  // Calculate initial center
  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const initialX = width / 2;
      const initialY = height * 0.1; // Start a bit from the top
      setTranslate({ x: initialX, y: initialY });
      setInitialTranslate({ x: initialX, y: initialY });
    }
  }, []); // Runs once on mount

  // Zoom control functions
  const handleZoomIn = useCallback(() => {
    setZoom((prevZoom) => prevZoom * 1.2);
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prevZoom) => prevZoom / 1.2);
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setTranslate(initialTranslate); // Reset to calculated initial center
  }, [initialTranslate]);

  /**
   * Converts flat arrays of members and relationships into a hierarchical structure
   * suitable for react-d3-tree.
   * @param members - Array of FamilyMember objects.
   * @param relationships - Array of Relationship objects.
   * @returns A single RawNodeDatum object (if a single root or synthetic root is formed)
   *          or an array of RawNodeDatum objects (if multiple roots are identified and returned directly),
   *          or null if data is insufficient.
   */
  const buildTreeData = (
    members: FamilyMember[],
    relationships: Relationship[]
  ): RawNodeDatum | RawNodeDatum[] | null => {
    // Handle empty or null members input
    if (!members || members.length === 0) {
      return { name: "No Data" }; // Return a placeholder node
    }

    // Initialize maps for efficient lookup
    const childrenMap = new Map<string, string[]>(); // Map parentId to an array of childIds
    const memberNodeMap = new Map<string, RawNodeDatum>(); // Map member.id to its RawNodeDatum representation for the tree

    // Process relationships to populate childrenMap
    // This map stores parent-child links, crucial for building the hierarchy.
    relationships.forEach((rel) => {
      if (rel.type === "PARENT_CHILD") {
        const children = childrenMap.get(rel.person1Id) || [];
        children.push(rel.person2Id);
        childrenMap.set(rel.person1Id, children);
      }
    });

    // Populate memberNodeMap with RawNodeDatum objects for each member.
    // Each node includes attributes and an initialized 'children' array.
    // 'originalId' is stored to link back to the original FamilyMember object if needed.
    members.forEach((member) => {
      memberNodeMap.set(member.id, {
        name: member.name,
        attributes: {
          // Attributes are used by the TreePersonNode component
          Gender: member.gender,
          Birthdate: member.birthDate || "N/A",
          ...(member.deathDate && { "Death Date": member.deathDate }),
          parentIds: member.parentIds || [],
          childIds: member.childIds || [],
          spouseIds: member.spouseIds || [],
          profileImageUrl: member.profileImageUrl,
        },
        originalId: member.id, // Store the original ID from the FamilyMember object
        children: [], // Initialize children array; will be populated by buildHierarchy
      });
    });

    // Identify root nodes: members who are not children in any 'PARENT_CHILD' relationship.
    // These nodes will be the starting points for building the tree hierarchy.
    const roots: RawNodeDatum[] = [];
    members.forEach((member) => {
      const isChild = relationships.some(
        (rel) => rel.type === "PARENT_CHILD" && rel.person2Id === member.id
      );
      if (!isChild) {
        const rootNode = memberNodeMap.get(member.id);
        if (rootNode) {
          roots.push(rootNode);
        }
      }
    });

    // Console warning if no roots are found but members exist.
    // This can indicate a disconnected graph, circular dependencies, or data issues.
    if (roots.length === 0 && members.length > 0) {
      console.warn(
        "[buildTreeData] No root nodes found, but members exist. The tree might be disconnected or have an unusual structure. Displaying members as a flat list or based on first member."
      );
    }

    /**
     * Recursively constructs the tree hierarchy for a given memberId.
     * It finds the member's node and then recursively calls itself for all children of that member,
     * linking the resulting child nodes to the parent's 'children' array.
     * @param memberId - The ID of the member for whom to build the hierarchy.
     * @returns A RawNodeDatum object representing the member and their descendants, or undefined if the member is not found.
     */
    const buildHierarchy = (memberId: string): RawNodeDatum | undefined => {
      const node = memberNodeMap.get(memberId);
      // If a memberId (e.g., from a childIds array) doesn't correspond to an actual member in memberNodeMap.
      if (!node) {
        console.warn(
          `[buildTreeData] Node data not found for memberId: ${memberId} during hierarchy construction.`
        );
        return undefined;
      }

      const childIds = childrenMap.get(memberId) || [];
      node.children = childIds
        .map((childId) => buildHierarchy(childId)) // Recursively build hierarchy for each child
        .filter((childNode) => childNode !== undefined) as RawNodeDatum[]; // Filter out undefined children (e.g., if a childId was invalid)
      return node;
    };

    // Populate the children for each identified root node by calling buildHierarchy.
    // This transforms the flat list of roots into a list of hierarchical tree structures.
    const populatedRoots = roots
      .map((root) => buildHierarchy(root.originalId!))
      .filter((r) => r) as RawNodeDatum[];

    // Handle cases for the final return value:
    // - If no populated roots are found despite members existing (e.g., all nodes are disconnected individuals or small, unlinked groups),
    //   return all members as a flat list of nodes. react-d3-tree might require a synthetic root to display these.
    // - Otherwise, return the array of populated root nodes. The calling code (useEffect) will handle
    //   wrapping multiple roots under a synthetic 'Family' node if necessary for react-d3-tree.
    if (populatedRoots.length === 0 && members.length > 0) {
      return members.map((m) => memberNodeMap.get(m.id)!); // Fallback for disconnected graphs or no clear roots
    }

    return populatedRoots; // This will be an array of root nodes.
  };

  const fetchTreeData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await genealogyService.getFamilyTree("tree1");
      setTree(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load family tree.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchTreeData();
  }, []);

  const openDeleteRelationshipModal = (
    person1Id: string,
    person2Id: string,
    type:
      | "SPOUSE"
      | "PARENT_CHILD_PARENT_PERSPECTIVE"
      | "PARENT_CHILD_CHILD_PERSPECTIVE"
  ) => {
    const members = tree?.members || [];
    const p1 = members.find((m) => m.id === person1Id);
    const p2 = members.find((m) => m.id === person2Id);
    setDeletingRelDetails({
      person1Id,
      person2Id,
      type,
      person1Name: p1?.name || "Unknown",
      person2Name: p2?.name || "Unknown",
    });
    setSubmitDeleteRelError(null);
    setIsDeleteRelModalOpen(true);
  };

  const handleConfirmDeleteRelationship = async () => {
    if (!deletingRelDetails) return;

    setIsSubmittingDeleteRel(true);
    setSubmitDeleteRelError(null);
    try {
      await genealogyService.deleteRelationship(
        "tree1",
        deletingRelDetails.person1Id,
        deletingRelDetails.person2Id,
        deletingRelDetails.type
      );
      setIsDeleteRelModalOpen(false);
      setDeletingRelDetails(null);
      await fetchTreeData(); // Refresh tree
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete relationship.";
      setSubmitDeleteRelError(message);
    } finally {
      setIsSubmittingDeleteRel(false);
    }
  };

  const openDeletePersonModal = (person: FamilyMember) => {
    setDeletingPerson(person);
    setSubmitDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeletePerson = async () => {
    if (!deletingPerson) return;

    setIsSubmittingDelete(true);
    setSubmitDeleteError(null);
    try {
      await genealogyService.deletePersonFromTree("tree1", deletingPerson.id);
      setIsDeleteModalOpen(false);
      setDeletingPerson(null);
      await fetchTreeData(); // Refresh tree
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete person.";
      setSubmitDeleteError(message);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  useEffect(() => {
    if (tree && tree.members && tree.relationships) {
      const transformedData = buildTreeData(tree.members, tree.relationships);

      if (Array.isArray(transformedData)) {
        if (transformedData.length === 1) {
          setD3TreeData(transformedData[0]);
        } else {
          // Multiple roots or disconnected nodes, wrap in a synthetic root
          setD3TreeData({
            name: "Family",
            children: transformedData,
          });
        }
      } else if (transformedData) {
        // Single root object
        setD3TreeData(transformedData);
      } else if (tree.members.length > 0) {
        // Case: No relationships, but members exist. Display them as a list under a synthetic root.
        // Or, if buildTreeData is modified to always return a single root/array, this might simplify.
        const firstPersonNode: RawNodeDatum = {
          name: tree.members[0].name,
          originalId: tree.members[0].id,
          attributes: { ...tree.members[0] }, // Spread attributes like gender, birthDate
        };
        // If buildTreeData can return a single node for a single person, use that.
        // For now, let's assume it might return null or an empty array for such cases.
        if (tree.members.length === 1) {
          setD3TreeData(firstPersonNode);
        } else {
          // If multiple members but no relationships to form a tree, list them.
          setD3TreeData({
            name: "Family Members (No Defined Root)",
            children: tree.members.map((m) => ({
              name: m.name,
              originalId: m.id,
              attributes: { Gender: m.gender, Birthdate: m.birthDate || "N/A" },
            })),
          });
        }
      } else {
        setD3TreeData({ name: "No Data" });
      }
    }
  }, [tree]);

  const openAddPersonModal = () => {
    setSubmitAddError(null);
    setIsAddModalOpen(true);
  };
  const handleConfirmAddPerson = async (
    personData: Omit<
      FamilyMember,
      "id" | "parentIds" | "childIds" | "spouseIds"
    >
  ) => {
    setIsSubmittingAdd(true);
    setSubmitAddError(null);
    try {
      await genealogyService.addPersonToTree("tree1", personData);
      setIsAddModalOpen(false);
      await fetchTreeData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add person.";
      setSubmitAddError(message);
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const openEditPersonModal = (
    person: FamilyMember,
    mode: "view" | "edit" = "edit"
  ) => {
    setEditingPerson({ ...person, currentMode: mode }); // Store mode for modal title and form
    setSubmitEditError(null);
    setIsEditModalOpen(true);
  };

  const handleConfirmUpdatePerson = async (personData: FamilyMember) => {
    if (!editingPerson) return;
    setIsSubmittingEdit(true);
    setSubmitEditError(null);
    try {
      await genealogyService.updatePersonInTree("tree1", personData);
      setIsEditModalOpen(false);
      setEditingPerson(null);
      await fetchTreeData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update person.";
      setSubmitEditError(message);
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

  const handleConfirmAddRelationship = async (
    targetId: string,
    type: Relationship["type"]
  ) => {
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
      await new Promise((resolve) => setTimeout(resolve, 700)); // Mock delay
      console.log("Relationship (mock) added successfully.");
      setIsRelationshipModalOpen(false);
      setSourcePersonForRelationship(null);
      // await fetchTreeData(); // Eventually refresh tree to show new relationships
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add relationship.";
      setSubmitRelationshipError(message);
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

  const currentMembers = tree?.members || []; // Keep this for handler access

  const renderNode: RenderCustomNodeElementFn = ({ nodeDatum, toggleNode }) => {
    // Ensure tree and tree.members are available
    if (!tree || !tree.members) {
      return null; // Or some placeholder/loading for the node
    }
    // Find the original FamilyMember data
    // nodeDatum.originalId should be set by buildTreeData
    const member = tree.members.find((m) => m.id === nodeDatum.originalId);

    // It's crucial that nodeDatum.attributes is correctly populated by buildTreeData
    // or that we pass the full 'member' if TreePersonNode expects that.
    // TreePersonNode is currently designed to get most from nodeDatum.attributes or nodeDatum.name

    return (
      <g>
        {/* Adjust x, y, width, height for foreignObject as needed */}
        {/* These values might need to be dynamic based on node content or fixed if nodes are uniform size */}
        {/* The x,y for foreignObject are relative to the <g> which react-d3-tree positions */}
        {/* Reduced size for better responsiveness, adjust x,y to keep it centered */}
        <foreignObject x="-110" y="-80" width="220" height="170">
          <TreePersonNode
            nodeDatum={nodeDatum}
            toggleNode={toggleNode}
            // Removed the first, redundant onEdit here.
            // The onEdit and onViewProfile props below correctly map to the buttons in TreePersonNode.
            onConnectRelationship={() => {
              if (member) openRelationshipModal(member);
              else
                console.warn(
                  "Original member not found for connect",
                  nodeDatum.originalId
                );
            }}
            onViewProfile={() => {
              if (member) openEditPersonModal(member, "view");
              else
                console.warn(
                  "Original member not found for view profile",
                  nodeDatum.originalId
                );
            }}
            onEdit={() => {
              // This is the onEdit prop for the "Edit" button on the TreePersonNode.
              if (member) openEditPersonModal(member, "edit");
              else
                console.warn(
                  "Original member not found for edit",
                  nodeDatum.originalId
                );
            }}
            onDelete={() => {
              if (member) openDeletePersonModal(member);
              else
                console.warn(
                  "Original member not found for delete",
                  nodeDatum.originalId
                );
            }}
            onDeleteRelationship={openDeleteRelationshipModal}
            allMembers={tree.members}
          />
        </foreignObject>
      </g>
    );
  };

  if (isLoading && !tree) {
    return <div className="p-4 text-center">Loading family tree...</div>;
  }
  if (error && !tree) {
    return <div className="p-4 text-center text-red-600">Error: {error}</div>;
  }

  if (currentMembers.length === 0 && !isLoading) {
    // Check isLoading to prevent flash of "No data"
    return (
      <div className="p-4 text-center">
        No family tree data found.
        <Button onClick={openAddPersonModal} className="ml-2" variant="primary">
          Add First Person
        </Button>
        {isAddModalOpen && (
          <Modal
            isOpen={isAddModalOpen}
            onClose={() => !isSubmittingAdd && setIsAddModalOpen(false)}
            title="Add New Person"
          >
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
    <div className="p-4 relative">
      {" "}
      {/* Added relative positioning for controls */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">
          {tree?.name || "Family Tree"}
        </h2>
        <Button onClick={openAddPersonModal} variant="primary">
          Add Person
        </Button>
      </div>
      {isLoading && tree && (
        <p className="text-center text-sm text-gray-500 mb-4">
          Refreshing tree...
        </p>
      )}
      {!isLoading && error && (
        <p className="text-center text-sm text-red-500 mb-4">
          Error refreshing tree: {error}
        </p>
      )}
      {/* Zoom Controls */}
      <div className="absolute top-16 right-4 z-10 flex flex-col space-y-2">
        <Button
          onClick={handleZoomIn}
          variant="outline"
          size="sm"
          aria-label="Zoom In"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </Button>
        <Button
          onClick={handleZoomOut}
          variant="outline"
          size="sm"
          aria-label="Zoom Out"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 12h-15"
            />
          </svg>
        </Button>
        <Button
          onClick={handleResetView}
          variant="outline"
          size="sm"
          aria-label="Reset View"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </Button>
      </div>
      <div
        ref={containerRef}
        className="w-full min-h-[600px] md:min-h-[700px] aspect-video border border-gray-300 rounded-md shadow-sm overflow-hidden"
      >
        {" "}
        {/* Increased min-h and added overflow-hidden */}
        {d3TreeData ? (
          <Tree
            data={d3TreeData}
            orientation="vertical"
            translate={translate}
            zoom={zoom}
            pathFunc="elbow"
            separation={{ siblings: 1.2, nonSiblings: 1.5 }}
            zoomable={true} // Keep user-controlled zoom/pan enabled
            renderCustomNodeElement={renderNode}
            dimensions={undefined} // Let it fill container
            nodeSize={{ x: 250, y: 200 }} // Adjust nodeSize if needed
            depthFactor={300} // Adjust depthFactor for vertical spacing
          />
        ) : (
          <p className="text-center pt-10">Preparing tree data...</p>
        )}
      </div>
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => !isSubmittingAdd && setIsAddModalOpen(false)}
          title="Add New Person"
        >
          <AddPersonForm
            onAddPerson={handleConfirmAddPerson}
            onCancel={() => setIsAddModalOpen(false)}
            isLoading={isSubmittingAdd}
            error={submitAddError}
          />
        </Modal>
      )}
      {editingPerson && isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => !isSubmittingEdit && setIsEditModalOpen(false)}
          title={
            editingPerson.currentMode === "view"
              ? `View Profile: ${editingPerson.name}`
              : `Edit Person: ${editingPerson.name}`
          }
        >
          <EditPersonForm
            person={editingPerson}
            onUpdatePerson={handleConfirmUpdatePerson}
            onCancel={() => setIsEditModalOpen(false)}
            isLoading={isSubmittingEdit}
            error={submitEditError}
            initialMode={editingPerson.currentMode} // Pass the mode to the form
            allMembers={currentMembers} // <-- ADD THIS LINE
          />
        </Modal>
      )}
      {sourcePersonForRelationship && isRelationshipModalOpen && (
        <Modal
          isOpen={isRelationshipModalOpen}
          onClose={() =>
            !isSubmittingRelationship && setIsRelationshipModalOpen(false)
          }
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
      {/* Delete Confirmation Modal */}
      {deletingPerson && isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => !isSubmittingDelete && setIsDeleteModalOpen(false)}
          title={`Delete ${deletingPerson.name}`}
        >
          <div className="p-4">
            <p>
              Are you sure you want to delete {deletingPerson.name}? This action
              cannot be undone.
            </p>
            {submitDeleteError && (
              <p className="text-red-600 mt-2">{submitDeleteError}</p>
            )}
            <div className="mt-6 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isSubmittingDelete}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDeletePerson}
                isLoading={isSubmittingDelete}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {/* Delete Relationship Confirmation Modal */}
      {deletingRelDetails && isDeleteRelModalOpen && (
        <Modal
          isOpen={isDeleteRelModalOpen}
          onClose={() =>
            !isSubmittingDeleteRel && setIsDeleteRelModalOpen(false)
          }
          title="Confirm Relationship Deletion"
        >
          <div className="p-4">
            <p>
              Are you sure you want to delete the relationship between{" "}
              <strong>{deletingRelDetails.person1Name}</strong> and{" "}
              <strong>{deletingRelDetails.person2Name}</strong>?
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Type: {deletingRelDetails.type.replace(/_/g, " ")}
            </p>
            {submitDeleteRelError && (
              <p className="text-red-600 mt-2">{submitDeleteRelError}</p>
            )}
            <div className="mt-6 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteRelModalOpen(false)}
                disabled={isSubmittingDeleteRel}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDeleteRelationship}
                isLoading={isSubmittingDeleteRel}
              >
                Confirm Delete Relationship
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default FamilyTreeDisplay;
