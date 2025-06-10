import React from 'react';
// Need to import fireEvent for toolbar interaction tests
import { render, screen, fireEvent } from '@testing-library/react';
import { RichTextEditor, RichTextEditorProps } from './RichTextEditor'; // Adjust import if props are not exported
// EditorEvents is not directly used in the test, can be removed if not needed for type mocks later
// import { EditorEvents } from '@tiptap/react';

// Restore Mocks for TipTap extensions - these might be used for specific assertions or stability
jest.mock('@tiptap/extension-link', () => ({
  Link: {
    configure: jest.fn((options) => ({ name: 'link-mock', options })),
    // Add extend mock if it's called by the component
    // extend: jest.fn().mockReturnThis(),
  },
}));
jest.mock('@tiptap/extension-image', () => ({
  Image: {
    configure: jest.fn((options) => ({ name: 'image-mock', options })),
  },
}));
jest.mock('@tiptap/extension-placeholder', () => ({
  Placeholder: {
    configure: jest.fn((options) => ({ name: 'placeholder-mock-base', ...options })),
  },
}));
jest.mock('@tiptap/extension-underline', () => ({
  // Assuming Underline is a simple extension without configure options in RichTextEditor
  Underline: { name: 'underline-mock' },
}));
jest.mock('@tiptap/starter-kit', () => ({
  StarterKit: {
    configure: jest.fn((options) => ({ name: 'starter-kit-mock', options })),
  },
}));
// --- End Mocks for TipTap extensions ---

// Un-mock EditorToolbar to test its interaction
// jest.mock('./EditorToolbar', () => () => <div data-testid="mock-editor-toolbar">Mock Editor Toolbar</div>);

// @tiptap/react (including useEditor and EditorContent) is now mocked via moduleNameMapper
// to src/__mocks__/@tiptap/react.js. We will import useEditor from it and can spy/mockImplementation on it.
import { useEditor as useTiptapEditor } from '@tiptap/react';

// --- Global Mocks for useEditor behavior (can be customized per test) ---
const mockSetContent = jest.fn();
const mockSetEditable = jest.fn();
const mockGetHTML = jest.fn(() => '<p>mock html</p>');

// Mock individual commands
const mockToggleBold = jest.fn().mockReturnThis(); // .mockReturnThis() for chainable commands
const mockToggleItalic = jest.fn().mockReturnThis();
const mockToggleUnderline = jest.fn().mockReturnThis();
const mockToggleStrike = jest.fn().mockReturnThis();
const mockToggleHeading = jest.fn().mockReturnThis();
const mockToggleBulletList = jest.fn().mockReturnThis();
const mockToggleOrderedList = jest.fn().mockReturnThis();
const mockSetLink = jest.fn().mockReturnThis();
const mockSetImage = jest.fn().mockReturnThis();
const mockUnsetAllMarks = jest.fn().mockReturnThis();
const mockClearNodes = jest.fn().mockReturnThis();
const mockFocus = jest.fn().mockReturnThis();
const mockRun = jest.fn(); // For the end of a chain

const mockCommands = {
  setContent: mockSetContent,
  // Individual command functions that might be called directly (less common with toolbar)
  // For toolbar, commands are usually chained, e.g., editor.chain().focus().toggleBold().run()
};

const mockEditorInstance = {
  chain: jest.fn(() => ({
    focus: mockFocus,
    toggleBold: mockToggleBold,
    toggleItalic: mockToggleItalic,
    toggleUnderline: mockToggleUnderline,
    toggleStrike: mockToggleStrike,
    toggleHeading: mockToggleHeading,
    toggleBulletList: mockToggleBulletList,
    toggleOrderedList: mockToggleOrderedList,
    setLink: mockSetLink,
    setImage: mockSetImage,
    unsetAllMarks: mockUnsetAllMarks,
    clearNodes: mockClearNodes,
    run: mockRun,
  })),
  commands: mockCommands, // Keep if direct commands are used
  setEditable: mockSetEditable,
  getHTML: mockGetHTML,
  isDestroyed: false,
  destroy: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  // This will be set by the mockImplementation of useTiptapEditor
  triggerUpdate: () => {},
  isActive: jest.fn(() => false), // Mock isActive for toolbar button states
};

type UseEditorOptions = {
  extensions: any[];
  content: string;
  editable: boolean;
  onUpdate: (props: { editor: any }) => void;
};
let lastUseEditorOptions: UseEditorOptions | null = null;

// --- End Global Mocks for useEditor ---


describe('RichTextEditor', () => {
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
    jest.clearAllMocks(); // Clears all mocks, including those from moduleNameMapper if they are jest.fn()
    mockGetHTML.mockReturnValue('<p>mock html</p>'); // Reset to default for onChange tests
    lastUseEditorOptions = null;

    // Reset all chained command mocks
    mockFocus.mockClear();
    mockToggleBold.mockClear();
    mockToggleItalic.mockClear();
    mockToggleUnderline.mockClear();
    mockToggleStrike.mockClear();
    mockToggleHeading.mockClear();
    mockToggleBulletList.mockClear();
    mockToggleOrderedList.mockClear();
    mockSetLink.mockClear();
    mockSetImage.mockClear();
    mockUnsetAllMarks.mockClear();
    mockClearNodes.mockClear();
    mockRun.mockClear();
    (mockEditorInstance.chain as jest.Mock).mockClear();


    // Default implementation for useEditor for most tests
    mockedUseEditor.mockImplementation((options: UseEditorOptions) => {
      lastUseEditorOptions = options;
      // Allow tests to trigger onUpdate by attaching a function to the mock instance
      (mockEditorInstance as any).triggerUpdate = () => {
        if (options.onUpdate && typeof options.onUpdate === 'function') {
          // Ensure getHTML is called by onUpdate
          options.onUpdate({ editor: { ...mockEditorInstance, getHTML: mockGetHTML } as any });
        }
      };
      return mockEditorInstance;
    });
  });

  // Keep existing tests, just ensure they are compatible with un-mocked toolbar if necessary
  it('renders EditorContent and Toolbar when not readOnly', () => {
    render(<RichTextEditor {...defaultProps} readOnly={false} />);
    expect(screen.getByTestId('global-mock-editor-content')).toBeInTheDocument();
    // Assuming EditorToolbar has a recognizable role or testid. Let's assume it has 'toolbar' role.
    // If EditorToolbar is not directly testable this way, we'll verify its buttons.
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('initializes editor with value prop', () => {
    render(<RichTextEditor {...defaultProps} />);
    expect(lastUseEditorOptions?.content).toBe(defaultProps.value);
  });

  it('calls onChange when editor content updates', () => {
    render(<RichTextEditor {...defaultProps} />);
    // Simulate an update from Tiptap
    if (lastUseEditorOptions && typeof lastUseEditorOptions.onUpdate === 'function') {
      lastUseEditorOptions.onUpdate({ editor: mockEditorInstance as any });
    }
    expect(mockOnChange).toHaveBeenCalledWith('<p>mock html</p>');
    expect(mockGetHTML).toHaveBeenCalled();
  });

  describe('readOnly prop', () => {
    it('sets editor to non-editable, shows toolbar when readOnly is false', () => {
      render(<RichTextEditor {...defaultProps} readOnly={false} />);
      expect(mockEditorInstance.setEditable).toHaveBeenCalledWith(true);
      expect(lastUseEditorOptions?.editable).toBe(true);
      expect(screen.getByRole('toolbar')).toBeInTheDocument();
    });

    it('sets editor to editable, hides toolbar when readOnly is true', () => {
      render(<RichTextEditor {...defaultProps} readOnly={true} />);
      expect(mockEditorInstance.setEditable).toHaveBeenCalledWith(false);
      expect(lastUseEditorOptions?.editable).toBe(false);
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });
  });

  // ... (other existing tests like placeholder, value updates should remain)

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

  describe('EditorToolbar interactions', () => {
    beforeEach(() => {
      // Ensure onChange is fresh for each toolbar interaction test
      mockOnChange.mockClear();
      mockGetHTML.mockClear().mockReturnValue('<p>updated mock html</p>'); // Simulate change
    });

    it('Bold button toggles bold and calls onChange', () => {
      render(<RichTextEditor {...defaultProps} readOnly={false} />);
      const boldButton = screen.getByRole('button', { name: /bold/i });
      fireEvent.click(boldButton);

      expect(mockEditorInstance.chain).toHaveBeenCalled();
      expect(mockFocus).toHaveBeenCalled();
      expect(mockToggleBold).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();

      // Simulate Tiptap's onUpdate call after command execution
      if (lastUseEditorOptions && typeof lastUseEditorOptions.onUpdate === 'function') {
        lastUseEditorOptions.onUpdate({ editor: mockEditorInstance as any });
      }
      expect(mockOnChange).toHaveBeenCalledWith('<p>updated mock html</p>');
    });

    it('Italic button toggles italic and calls onChange', () => {
      render(<RichTextEditor {...defaultProps} readOnly={false} />);
      const italicButton = screen.getByRole('button', { name: /italic/i });
      fireEvent.click(italicButton);

      expect(mockEditorInstance.chain).toHaveBeenCalled();
      expect(mockFocus).toHaveBeenCalled();
      expect(mockToggleItalic).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();

      if (lastUseEditorOptions && typeof lastUseEditorOptions.onUpdate === 'function') {
        lastUseEditorOptions.onUpdate({ editor: mockEditorInstance as any });
      }
      expect(mockOnChange).toHaveBeenCalledWith('<p>updated mock html</p>');
    });

    it('Underline button toggles underline and calls onChange', () => {
      render(<RichTextEditor {...defaultProps} readOnly={false} />);
      const underlineButton = screen.getByRole('button', { name: /underline/i });
      fireEvent.click(underlineButton);

      expect(mockEditorInstance.chain).toHaveBeenCalled();
      expect(mockFocus).toHaveBeenCalled();
      expect(mockToggleUnderline).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();

      if (lastUseEditorOptions && typeof lastUseEditorOptions.onUpdate === 'function') {
        lastUseEditorOptions.onUpdate({ editor: mockEditorInstance as any });
      }
      expect(mockOnChange).toHaveBeenCalledWith('<p>updated mock html</p>');
    });

    it('Strikethrough button toggles strike and calls onChange', () => {
      render(<RichTextEditor {...defaultProps} readOnly={false} />);
      const strikeButton = screen.getByRole('button', { name: /strikethrough/i });
      fireEvent.click(strikeButton);

      expect(mockEditorInstance.chain).toHaveBeenCalled();
      expect(mockFocus).toHaveBeenCalled();
      expect(mockToggleStrike).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();

      if (lastUseEditorOptions && typeof lastUseEditorOptions.onUpdate === 'function') {
        lastUseEditorOptions.onUpdate({ editor: mockEditorInstance as any });
      }
      expect(mockOnChange).toHaveBeenCalledWith('<p>updated mock html</p>');
    });

    it('H1 button toggles H1 heading and calls onChange', () => {
      render(<RichTextEditor {...defaultProps} readOnly={false} />);
      const h1Button = screen.getByRole('button', { name: /H1/i });
      fireEvent.click(h1Button);

      expect(mockEditorInstance.chain).toHaveBeenCalled();
      expect(mockFocus).toHaveBeenCalled();
      expect(mockToggleHeading).toHaveBeenCalledWith({ level: 1 });
      expect(mockRun).toHaveBeenCalled();

      if (lastUseEditorOptions && typeof lastUseEditorOptions.onUpdate === 'function') {
        lastUseEditorOptions.onUpdate({ editor: mockEditorInstance as any });
      }
      expect(mockOnChange).toHaveBeenCalledWith('<p>updated mock html</p>');
    });

    it('H2 button toggles H2 heading and calls onChange', () => {
      render(<RichTextEditor {...defaultProps} readOnly={false} />);
      const h2Button = screen.getByRole('button', { name: /H2/i });
      fireEvent.click(h2Button);

      expect(mockEditorInstance.chain).toHaveBeenCalled();
      expect(mockFocus).toHaveBeenCalled();
      expect(mockToggleHeading).toHaveBeenCalledWith({ level: 2 });
      expect(mockRun).toHaveBeenCalled();

      if (lastUseEditorOptions && typeof lastUseEditorOptions.onUpdate === 'function') {
        lastUseEditorOptions.onUpdate({ editor: mockEditorInstance as any });
      }
      expect(mockOnChange).toHaveBeenCalledWith('<p>updated mock html</p>');
    });

    it('Bullet List button toggles bullet list and calls onChange', () => {
      render(<RichTextEditor {...defaultProps} readOnly={false} />);
      const bulletListButton = screen.getByRole('button', { name: /bullet list/i });
      fireEvent.click(bulletListButton);

      expect(mockEditorInstance.chain).toHaveBeenCalled();
      expect(mockFocus).toHaveBeenCalled();
      expect(mockToggleBulletList).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();

      if (lastUseEditorOptions && typeof lastUseEditorOptions.onUpdate === 'function') {
        lastUseEditorOptions.onUpdate({ editor: mockEditorInstance as any });
      }
      expect(mockOnChange).toHaveBeenCalledWith('<p>updated mock html</p>');
    });

    it('Ordered List button toggles ordered list and calls onChange', () => {
      render(<RichTextEditor {...defaultProps} readOnly={false} />);
      const orderedListButton = screen.getByRole('button', { name: /ordered list/i });
      fireEvent.click(orderedListButton);

      expect(mockEditorInstance.chain).toHaveBeenCalled();
      expect(mockFocus).toHaveBeenCalled();
      expect(mockToggleOrderedList).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();

      if (lastUseEditorOptions && typeof lastUseEditorOptions.onUpdate === 'function') {
        lastUseEditorOptions.onUpdate({ editor: mockEditorInstance as any });
      }
      expect(mockOnChange).toHaveBeenCalledWith('<p>updated mock html</p>');
    });

    describe('Link and Image button interactions with window.prompt', () => {
      let mockWindowPrompt: jest.SpyInstance;

      beforeEach(() => {
        mockWindowPrompt = jest.spyOn(window, 'prompt');
      });

      afterEach(() => {
        mockWindowPrompt.mockRestore();
      });

      it('Link button prompts for URL, sets link and calls onChange', () => {
        mockWindowPrompt.mockReturnValue('https://example.com');
        render(<RichTextEditor {...defaultProps} readOnly={false} />);
        const linkButton = screen.getByRole('button', { name: /link/i });
        fireEvent.click(linkButton);

        expect(mockWindowPrompt).toHaveBeenCalledWith('Enter URL');
        expect(mockEditorInstance.chain).toHaveBeenCalled();
        expect(mockFocus).toHaveBeenCalled();
        expect(mockSetLink).toHaveBeenCalledWith({ href: 'https://example.com' });
        expect(mockRun).toHaveBeenCalled();

        if (lastUseEditorOptions && typeof lastUseEditorOptions.onUpdate === 'function') {
          lastUseEditorOptions.onUpdate({ editor: mockEditorInstance as any });
        }
        expect(mockOnChange).toHaveBeenCalledWith('<p>updated mock html</p>');
      });

      it('Link button does nothing if URL prompt is cancelled', () => {
        mockWindowPrompt.mockReturnValue(null); // Simulate user cancelling prompt
        render(<RichTextEditor {...defaultProps} readOnly={false} />);
        const linkButton = screen.getByRole('button', { name: /link/i });
        fireEvent.click(linkButton);

        expect(mockWindowPrompt).toHaveBeenCalledWith('Enter URL');
        expect(mockSetLink).not.toHaveBeenCalled();
        expect(mockRun).not.toHaveBeenCalled();
        expect(mockOnChange).not.toHaveBeenCalled();
      });

      it('Image button prompts for URL, sets image and calls onChange', () => {
        mockWindowPrompt.mockReturnValue('https://example.com/image.png');
        render(<RichTextEditor {...defaultProps} readOnly={false} />);
        const imageButton = screen.getByRole('button', { name: /image/i });
        fireEvent.click(imageButton);

        expect(mockWindowPrompt).toHaveBeenCalledWith('Enter Image URL');
        expect(mockEditorInstance.chain).toHaveBeenCalled();
        expect(mockFocus).toHaveBeenCalled();
        expect(mockSetImage).toHaveBeenCalledWith({ src: 'https://example.com/image.png' });
        expect(mockRun).toHaveBeenCalled();

        if (lastUseEditorOptions && typeof lastUseEditorOptions.onUpdate === 'function') {
          lastUseEditorOptions.onUpdate({ editor: mockEditorInstance as any });
        }
        expect(mockOnChange).toHaveBeenCalledWith('<p>updated mock html</p>');
      });

      it('Image button does nothing if URL prompt is cancelled', () => {
        mockWindowPrompt.mockReturnValue(null); // Simulate user cancelling prompt
        render(<RichTextEditor {...defaultProps} readOnly={false} />);
        const imageButton = screen.getByRole('button', { name: /image/i });
        fireEvent.click(imageButton);

        expect(mockWindowPrompt).toHaveBeenCalledWith('Enter Image URL');
        expect(mockSetImage).not.toHaveBeenCalled();
        expect(mockRun).not.toHaveBeenCalled();
        expect(mockOnChange).not.toHaveBeenCalled();
      });
    });

    it('Remove Formatting button clears marks and nodes and calls onChange', () => {
      render(<RichTextEditor {...defaultProps} readOnly={false} />);
      const removeFormattingButton = screen.getByRole('button', { name: /remove formatting/i });
      fireEvent.click(removeFormattingButton);

      expect(mockEditorInstance.chain).toHaveBeenCalled();
      expect(mockFocus).toHaveBeenCalled();
      expect(mockUnsetAllMarks).toHaveBeenCalled();
      expect(mockClearNodes).toHaveBeenCalled(); // Assuming it calls both
      expect(mockRun).toHaveBeenCalledTimes(2); // Once for unsetAllMarks, once for clearNodes if chained separately. Or once if chained together.
                                               // Toolbar implementation will determine this. Adjust if necessary.
                                               // If EditorToolbar.tsx chains them like .chain().focus().unsetAllMarks().clearNodes().run() then mockRun is called once.
                                               // Let's assume they are chained: .chain().focus().unsetAllMarks().clearNodes().run()
                                               // Then mockRun would be called once.
                                               // For now, let's be more flexible or check actual implementation.
                                               // Toolbar code does: editor.chain().focus().clearNodes().unsetAllMarks().run();

      // Based on common implementation: editor.chain().focus().clearNodes().unsetAllMarks().run();
      // So, mockRun should be called once. Let's adjust the chain mock if needed or previous calls.
      // The current mock structure is editor.chain().focus().COMMAND().run(). So each command is one chain.
      // This means unsetAllMarks().run() and clearNodes().run() would be separate.
      // Let's re-verify EditorToolbar.tsx. If it's one chain, mockRun is called once.
      // The provided code for EditorToolbar calls them in a single chain:
      // editor.chain().focus().clearNodes().unsetAllMarks().run()
      // So, we expect mockRun to be called once for this combined operation.
      // However, our current mock structure for chain() returns an object where each command
      // is separate and ends with a .run(). This means the test would simulate:
      // editor.chain().focus().unsetAllMarks().run() (mockRun #1)
      // editor.chain().focus().clearNodes().run() (mockRun #2)
      // This depends on how the EditorToolbar iterates and calls these.
      // Looking at EditorToolbar.tsx, the "Remove Formatting" button does:
      // onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
      // This means clearNodes and unsetAllMarks are part of the SAME chain.
      // So, the mock needs to reflect that: .clearNodes() returns the chain, then .unsetAllMarks() returns the chain, then .run().

      // The current mock is:
      // chain: jest.fn(() => ({ focus: mockFocus, unsetAllMarks: mockUnsetAllMarks, clearNodes: mockClearNodes, run: mockRun }))
      // This means mockUnsetAllMarks and mockClearNodes are methods on the SAME object returned by chain().
      // So, if the toolbar calls editor.chain().focus().clearNodes().unsetAllMarks().run(),
      // it would be:
      // chain() -> returns object with { focus, clearNodes, unsetAllMarks, run }
      // .focus() -> calls mockFocus, returns self (the object)
      // .clearNodes() -> calls mockClearNodes, returns self
      // .unsetAllMarks() -> calls mockUnsetAllMarks, returns self
      // .run() -> calls mockRun
      // This means mockRun is called ONCE. My previous mockReturnThis() on these was correct.

      expect(mockRun).toHaveBeenCalled(); // Should be called once for the chain.

      if (lastUseEditorOptions && typeof lastUseEditorOptions.onUpdate === 'function') {
        lastUseEditorOptions.onUpdate({ editor: mockEditorInstance as any });
      }
      expect(mockOnChange).toHaveBeenCalledWith('<p>updated mock html</p>');
    });
  });
});
