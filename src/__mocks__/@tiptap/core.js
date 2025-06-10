// src/__mocks__/@tiptap/core.js
// This can be very minimal. If RichTextEditor.tsx or its dependencies
// try to import specific things from @tiptap/core and use them,
// those would need to be mocked here. For now, an empty object might suffice
// if no direct deep imports from @tiptap/core are used by the component itself.
export const Editor = jest.fn(() => ({
  // Mock any methods of Editor that might be called if not using useEditor mock directly
}));

// Add other named exports from @tiptap/core if they are directly used by the component
// and cause "undefined" errors.
export default {
  // Default export if any (less common for @tiptap/core)
  name: 'core-mock',
};
