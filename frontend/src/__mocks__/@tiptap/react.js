// src/__mocks__/@tiptap/react.js
const React = require('react');

const useEditor = jest.fn();
const EditorContent = function MockedEditorContent({ editor }) {
  return React.createElement('div', { 'data-testid': 'global-mock-editor-content' }, 'Editor Content Mocked Globally');
};
EditorContent.displayName = 'MockedEditorContent';

console.log('--- MOCK @tiptap/react.js LOADED (CJS with __esModule) ---');
console.log('useEditor defined:', !!useEditor);
console.log('EditorContent defined:', !!EditorContent);

module.exports = {
  __esModule: true, // This helps with ESM named imports
  useEditor,
  EditorContent,
};
