// src/components/family-tree/FamilyTreeToolbar.tsx
import React from "react";
import { Button } from "../ui";
import {
  Edit3,
  Eye,
  Plus,
  Link,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Save,
  X,
} from "lucide-react";

interface FamilyTreeToolbarProps {
  isAuthenticated: boolean;
  isEditMode: boolean;
  isRelationshipCreationMode: boolean;
  selectedPersonForRelationship?: any;
  onToggleEditMode: () => void;
  onToggleRelationshipMode: () => void;
  onCancelRelationshipCreation: () => void;
  onAddPerson: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onSaveChanges?: () => void;
  hasUnsavedChanges?: boolean;
}

const FamilyTreeToolbar: React.FC<FamilyTreeToolbarProps> = ({
  isAuthenticated,
  isEditMode,
  isRelationshipCreationMode,
  selectedPersonForRelationship,
  onToggleEditMode,
  onToggleRelationshipMode,
  onCancelRelationshipCreation,
  onAddPerson,
  onZoomIn,
  onZoomOut,
  onResetView,
  onSaveChanges,
  hasUnsavedChanges,
}) => {
  return (
    <div className="absolute top-4 right-4 z-20 bg-white shadow-lg rounded-lg p-3 border">
      <div className="flex flex-col gap-2">
        {/* View Controls */}
        <div className="flex gap-2 items-center border-b pb-2">
          <span className="text-xs font-semibold text-gray-600">View:</span>
          <Button
            onClick={onZoomIn}
            variant="secondary"
            className="p-2"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </Button>
          <Button
            onClick={onZoomOut}
            variant="secondary"
            className="p-2"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </Button>
          <Button
            onClick={onResetView}
            variant="secondary"
            className="p-2"
            title="Reset View"
          >
            <RotateCcw size={16} />
          </Button>
        </div>

        {/* Edit Controls - Only show when authenticated */}
        {isAuthenticated && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <span className="text-xs font-semibold text-gray-600">Mode:</span>
              <Button
                onClick={onToggleEditMode}
                variant={isEditMode ? "primary" : "secondary"}
                className="flex items-center gap-1"
                title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
              >
                {isEditMode ? <Eye size={16} /> : <Edit3 size={16} />}
                <span className="text-xs">{isEditMode ? "View" : "Edit"}</span>
              </Button>
            </div>

            {/* Edit Mode Tools */}
            {isEditMode && (
              <div className="flex flex-col gap-2 border-t pt-2">
                <div className="flex gap-2">
                  <Button
                    onClick={onAddPerson}
                    variant="secondary"
                    className="flex items-center gap-1"
                    title="Add New Person"
                  >
                    <Plus size={16} />
                    <span className="text-xs">Add Person</span>
                  </Button>
                </div>

                <div className="flex gap-2">
                  {isRelationshipCreationMode ? (
                    <div className="flex flex-col gap-1 w-full">
                      <div className="text-xs text-orange-600 font-medium">
                        {selectedPersonForRelationship
                          ? `Selected: ${selectedPersonForRelationship.name}`
                          : "Creating Relationship..."}
                      </div>
                      <div className="text-xs text-gray-500">
                        Click another person to connect
                      </div>
                      <Button
                        onClick={onCancelRelationshipCreation}
                        variant="secondary"
                        className="flex items-center gap-1"
                        title="Cancel Relationship Creation"
                      >
                        <X size={14} />
                        <span className="text-xs">Cancel</span>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={onToggleRelationshipMode}
                      variant="ghost"
                      className="flex items-center gap-1"
                      title="Create Relationship Between People"
                    >
                      <Link size={16} />
                      <span className="text-xs">Connect</span>
                    </Button>
                  )}
                </div>

                {/* Save Changes */}
                {hasUnsavedChanges && onSaveChanges && (
                  <div className="border-t pt-2">
                    <Button
                      onClick={onSaveChanges}
                      variant="primary"
                      className="flex items-center gap-1 w-full"
                      title="Save Changes"
                    >
                      <Save size={16} />
                      <span className="text-xs">Save Changes</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Authentication Notice */}
        {!isAuthenticated && (
          <div className="text-xs text-gray-500 text-center border-t pt-2">
            <div>Login to edit family tree</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyTreeToolbar;
