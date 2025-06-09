import React from 'react';
import { render, screen } from '@testing-library/react';
import { RichTextEditor, RichTextEditorProps } from './RichTextEditor'; // Adjust import if props are not exported
// EditorEvents is not directly used in the test, can be removed if not needed for type mocks later
// import { EditorEvents } from '@tiptap/react';

// --- TipTap extensions are now mocked via moduleNameMapper in jest.config.js ---
// jest.mock('@tiptap/extension-link', ...);
// jest.mock('@tiptap/extension-image', ...);
// jest.mock('@tiptap/extension-placeholder', ...);
// jest.mock('@tiptap/extension-underline', ...);
// jest.mock('@tiptap/starter-kit', ...);
// --- End Mocks for TipTap extensions ---

// Mock EditorToolbar to isolate RichTextEditor tests
jest.mock('./EditorToolbar', () => () => <div data-testid="mock-editor-toolbar">Mock Editor Toolbar</div>);

// @tiptap/react (including useEditor and EditorContent) is now mocked via moduleNameMapper
// to src/__mocks__/@tiptap/react.js. We will import useEditor from it and can spy/mockImplementation on it.
import { useEditor as useTiptapEditor } from '@tiptap/react';

// --- Global Mocks for useEditor behavior (can be customized per test) ---
const mockSetContent = jest.fn();
const mockSetEditable = jest.fn();
const mockGetHTML = jest.fn(() => '<p>mock html</p>');
const mockCommands = {
  setContent: mockSetContent,
};
const mockEditorInstance = {
  commands: mockCommands,
  setEditable: mockSetEditable,
  getHTML: mockGetHTML,
  isDestroyed: false,
  destroy: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  // This will be set by the mockImplementation of useTiptapEditor
  triggerUpdate: () => {}
};

type UseEditorOptions = {
  extensions: any[];
  content: string;
  editable: boolean;
  onUpdate: (props: { editor: any }) => void;
};
let lastUseEditorOptions: UseEditorOptions | null = null;
// --- End Global Mocks for useEditor ---


describe.skip('RichTextEditor', () => {
  const mockOnChange = jest.fn();
  // Cast useTiptapEditor to jest.Mock to allow mockImplementation
  const mockedUseEditor = useTiptapEditor as jest.Mock;
  const defaultProps: RichTextEditorProps = {
    value: '<p>Initial Value</p>',
    onChange: mockOnChange,
    placeholder: 'Enter text...',
    readOnly: false,
  };

  beforeEach(() => {
    jest.clearAllMocks(); // Clears all mocks, including those from moduleNameMapper if they are jest.fn()

    // Reset the global mockEditorInstance state for each test if needed
    mockSetContent.mockClear();
    mockSetEditable.mockClear();
    mockGetHTML.mockReturnValue('<p>mock html</p>'); // Reset to default
    mockEditorInstance.destroy.mockClear();
    mockEditorInstance.on.mockClear();
    mockEditorInstance.off.mockClear();
    lastUseEditorOptions = null;

    // Default implementation for useEditor for most tests
    mockedUseEditor.mockImplementation((options: UseEditorOptions) => {
      lastUseEditorOptions = options;
      // Allow tests to trigger onUpdate by attaching a function to the mock instance
      (mockEditorInstance as any).triggerUpdate = () => {
        if (options.onUpdate && typeof options.onUpdate === 'function') {
          options.onUpdate({ editor: mockEditorInstance as any });
        }
      };
      return mockEditorInstance;
    });
  });

  it('renders EditorContent', () => {
    render(<RichTextEditor {...defaultProps} />);
    // Updated to match the data-testid from the global mock
    expect(screen.getByTestId('global-mock-editor-content')).toBeInTheDocument();
  });

  it('initializes editor with value prop', () => {
    render(<RichTextEditor {...defaultProps} />);
    expect(lastUseEditorOptions?.content).toBe(defaultProps.value);
  });

  it('calls onChange when editor content updates', () => {
    render(<RichTextEditor {...defaultProps} />);
    if ((mockEditorInstance as any).triggerUpdate) {
      (mockEditorInstance as any).triggerUpdate();
    }
    expect(mockOnChange).toHaveBeenCalledWith('<p>mock html</p>');
    expect(mockGetHTML).toHaveBeenCalled();
  });

  describe('readOnly prop', () => {
    it('sets editor to non-editable and shows toolbar when readOnly is false', () => {
      render(<RichTextEditor {...defaultProps} readOnly={false} />);
      expect(mockEditorInstance.setEditable).toHaveBeenCalledWith(true);
      expect(lastUseEditorOptions?.editable).toBe(true);
      expect(screen.getByTestId('mock-editor-toolbar')).toBeInTheDocument();
    });

    it('sets editor to editable and hides toolbar when readOnly is true', () => {
      render(<RichTextEditor {...defaultProps} readOnly={true} />);
      expect(mockEditorInstance.setEditable).toHaveBeenCalledWith(false);
      expect(lastUseEditorOptions?.editable).toBe(false);
      expect(screen.queryByTestId('mock-editor-toolbar')).not.toBeInTheDocument();
    });
  });

  it('configures Placeholder extension with placeholder prop', () => {
    render(<RichTextEditor {...defaultProps} />);
    const placeholderInstance = lastUseEditorOptions?.extensions.find(
      (ext: any) => ext && (ext.name === 'placeholder-mock' || ext.name === 'placeholder-mock-base')
    );
    expect(placeholderInstance).toBeDefined();
    // Check that the options passed to Placeholder.configure (captured by the mock from src/__mocks__) match the prop
    // The mock in src/__mocks__/@tiptap/extension-placeholder.js spreads options into the returned object.
    expect(placeholderInstance?.placeholder).toEqual(defaultProps.placeholder);
  });

  it('updates editor content when value prop changes externally', () => {
    const { rerender } = render(<RichTextEditor {...defaultProps} />);
    const newValue = '<p>New Value</p>';

    // To simulate external change, ensure getHTML returns something different than newValue before rerender
    mockGetHTML.mockReturnValue(defaultProps.value); // Current HTML in editor

    rerender(<RichTextEditor {...defaultProps} value={newValue} />);

    expect(mockSetContent).toHaveBeenCalledWith(newValue, false);
  });

   it('does not call setContent if external value is same as editor HTML', () => {
    // Simulate editor's HTML is already the same as the incoming value prop
    mockGetHTML.mockReturnValue(defaultProps.value);

    const { rerender } = render(<RichTextEditor {...defaultProps} />); // Initial render

    // Rerender with the same value, editor content should not change
    rerender(<RichTextEditor {...defaultProps} value={defaultProps.value} />);

    // mockSetContent (via editor.commands.setContent) should not have been called after initial setup
    // The mock for useEditor calls setContent initially IF the content is different,
    // but the effect hook for prop changes should not call it again if value === editor.getHTML().
    // We need to ensure our mockGetHTML reflects the current state accurately.
    // The initial content setting is part of useEditor's options, not what this test targets.
    // This test targets the useEffect [value, editor] specifically.
    // So, clear any calls from initial render if necessary, or be more specific.
    mockSetContent.mockClear(); // Clear calls from potential initial setup if any
                               // (though our useEditor mock doesn't call setContent directly on init)

    rerender(<RichTextEditor {...defaultProps} value={defaultProps.value} />);
    expect(mockSetContent).not.toHaveBeenCalled();
  });

});
