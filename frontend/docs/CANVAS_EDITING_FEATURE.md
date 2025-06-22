# Canvas Editing Feature Implementation

## Overview

This branch implements a comprehensive canvas editing feature for the family tree that allows authenticated users to dynamically add persons and edit relationships through an intuitive interface.

## New Features

### 1. **Authentication-Gated Editing**

- All editing features are only available to authenticated users
- Visual indicators show when user is not logged in
- Edit mode can be toggled on/off for better user experience

### 2. **Dynamic Person Addition with Plus Icons**

- **Parent Plus Icon**: Appears above person nodes when hovering in edit mode
- **Child Plus Icon**: Appears below person nodes when hovering in edit mode
- **Spouse Plus Icon**: Appears to the right of person nodes when hovering in edit mode
- **Context-Aware**: Automatically sets up the correct relationship type when adding

### 3. **Interactive Relationship Creation**

- **Click-to-Connect**: Click the relationship icon on a person, then click another person to create a relationship
- **Enhanced Dialog**: Smart relationship creation dialog that suggests appropriate relationship types
- **Visual Feedback**: Selected person is highlighted during relationship creation
- **Cancellation**: Easy to cancel relationship creation mode

### 4. **Canvas Toolbar**

- **View Controls**: Zoom in, zoom out, reset view
- **Edit Mode Toggle**: Switch between view and edit modes
- **Relationship Creation**: Start relationship creation mode
- **Add Person**: Add standalone person to tree
- **Visual Status**: Shows current mode and selected states

### 5. **Enhanced Visual Feedback**

- **Hover Effects**: Nodes scale and show shadow on hover
- **Edit Mode Indicators**: Different visual states for edit vs view mode
- **Relationship Creation**: Orange highlighting during relationship creation
- **Smooth Transitions**: CSS transitions for better user experience

## Technical Implementation

### New Components

#### 1. `EditableTreePersonNode.tsx`

- Enhanced version of the original TreePersonNode
- Adds plus icons for adding related persons
- Includes relationship creation functionality
- Shows/hides edit controls based on authentication and mode

#### 2. `FamilyTreeToolbar.tsx`

- Floating toolbar with all editing controls
- Responsive design that adapts to different screen sizes
- Clear visual separation of different tool groups

#### 3. `RelationshipCreationDialog.tsx`

- Smart dialog for creating relationships between two people
- Auto-suggests relationship types based on the people involved
- Handles parent-child relationships in correct direction
- Clear visual representation of the relationship being created

#### 4. `EditableFamilyTreeDisplay.tsx`

- Main component that orchestrates all editing functionality
- Manages edit mode state and relationship creation flows
- Integrates authentication state from Redux store
- Maintains backward compatibility with existing tree features

### Key Features in Detail

#### Plus Icon Positioning

```tsx
// Parent plus icon - positioned above the node
<button className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full">
  <Plus size={14} />
</button>

// Child plus icon - positioned below the node
<button className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full">
  <Plus size={14} />
</button>

// Spouse plus icon - positioned to the right
<button className="absolute top-1/2 -right-8 transform -translate-y-1/2 w-6 h-6 bg-purple-500 hover:bg-purple-600 text-white rounded-full">
  <Plus size={14} />
</button>
```

#### Relationship Creation Flow

1. User clicks relationship icon on person A
2. Person A becomes "selected" (highlighted in orange)
3. User clicks on person B
4. Enhanced relationship dialog opens
5. User selects relationship type from smart suggestions
6. Relationship is created and tree updates

#### Authentication Integration

```tsx
const { isAuthenticated } = useSelector((state: RootState) => state.auth);

// Only show editing controls when authenticated
{isAuthenticated && isEditMode && (
  // Plus icons and edit controls
)}
```

## Usage Instructions

### For Users

1. **Log in** to your account to access editing features
2. **Toggle Edit Mode** using the toolbar in the top-right corner
3. **Add People**:
   - Hover over any person in edit mode to see plus icons
   - Click the appropriate plus icon (parent/child/spouse) to add a related person
   - Or use the "Add Person" button in the toolbar for standalone additions
4. **Create Relationships**:
   - Click the relationship icon (🔗) on a person
   - Click another person to connect them
   - Choose the relationship type in the dialog that appears
5. **Edit/Delete**:
   - Use the Edit button on any person to modify their details
   - Use the Delete button to remove people or relationships
   - Use the X buttons next to relationships to remove specific connections

### For Developers

#### To Use the New Component

```tsx
import { EditableFamilyTreeDisplay } from "../components/family-tree";

// Replace the original FamilyTreeDisplay with:
<EditableFamilyTreeDisplay />;
```

#### To Extend Functionality

The modular design makes it easy to add new features:

- New editing tools can be added to `FamilyTreeToolbar`
- Additional relationship types can be added to `RelationshipCreationDialog`
- Custom node behaviors can be added to `EditableTreePersonNode`

## Benefits

### User Experience

- **Intuitive**: Plus icons clearly indicate where you can add people
- **Visual**: Clear feedback for all interactions
- **Safe**: Authentication prevents unauthorized edits
- **Flexible**: Multiple ways to accomplish the same tasks

### Developer Experience

- **Modular**: Each component has a single responsibility
- **Reusable**: Components can be used independently
- **Maintainable**: Clear separation of concerns
- **Extensible**: Easy to add new features

### Performance

- **Efficient**: Only shows edit controls when needed
- **Responsive**: Smooth transitions and hover effects
- **Scalable**: Handles large family trees efficiently

## Future Enhancements

### Planned Features

1. **Drag and Drop**: Drag people to rearrange tree structure
2. **Bulk Operations**: Select multiple people for batch operations
3. **Undo/Redo**: History management for editing operations
4. **Collaborative Editing**: Real-time editing with other users
5. **Templates**: Pre-built family structures for quick setup
6. **Import/Export**: Integration with genealogy file formats

### Technical Improvements

1. **Keyboard Navigation**: Full keyboard accessibility
2. **Mobile Optimization**: Touch-friendly editing on mobile devices
3. **Offline Support**: Edit trees offline and sync when connected
4. **Advanced Layouts**: Alternative tree layout algorithms
5. **Performance**: Virtual scrolling for very large trees

## Testing

### Manual Testing Checklist

- [ ] Login/logout toggles edit mode availability
- [ ] Plus icons appear on hover in edit mode
- [ ] Each plus icon adds person with correct relationship
- [ ] Relationship creation flow works end-to-end
- [ ] Toolbar controls function correctly
- [ ] Visual feedback is clear and consistent
- [ ] Error handling works for all operations

### Automated Testing

- Unit tests for all new components
- Integration tests for editing workflows
- E2E tests for complete user journeys
- Performance tests for large family trees

## Security Considerations

### Authentication

- All editing operations require valid authentication
- Server-side validation of user permissions
- Session management for long editing sessions

### Data Validation

- Client-side validation with server-side enforcement
- Sanitization of all user inputs
- Protection against malicious relationship structures

### Privacy

- Respect privacy settings for family members
- Audit trail for all editing operations
- Role-based access control for sensitive operations
