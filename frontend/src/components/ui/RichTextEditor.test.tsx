import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Define mocks first before imports
vi.mock("@tiptap/extension-link", () => ({
  default: {
    configure: vi.fn(() => ({ name: "link-mock" })),
  },
}));

vi.mock("@tiptap/extension-image", () => ({
  default: {
    configure: vi.fn(() => ({ name: "image-mock" })),
  },
}));

vi.mock("@tiptap/extension-placeholder", () => ({
  default: {
    configure: vi.fn(() => ({ name: "placeholder-mock" })),
  },
}));

vi.mock("@tiptap/extension-underline", () => ({
  default: { name: "underline-mock" },
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: {
    configure: vi.fn(() => ({ name: "starterkit-mock" })),
  },
}));

// Mock EditorToolbar
vi.mock("./EditorToolbar", () => ({
  default: () => <div data-testid="editor-toolbar">Editor Toolbar</div>,
}));

// Create a mock editor instance
const mockEditorInstance = {
  chain: vi.fn(() => ({
    focus: vi.fn(() => ({
      run: vi.fn(),
    })),
  })),
  isEmpty: false,
  getHTML: vi.fn(() => "<p>Test content</p>"),
  can: vi.fn(() => true),
  isActive: vi.fn(() => false),
  setEditable: vi.fn(), // Add this method that's used in useEffect
  setContent: vi.fn(), // Add this method that's used in useEffect
};

// Mock the React TipTap module with a function that will be set in the tests
vi.mock("@tiptap/react", () => {
  return {
    useEditor: vi.fn(),
    EditorContent: ({ children }) => (
      <div data-testid="editor-content">{children}</div>
    ),
  };
});

// Now import the component to test
import RichTextEditor from "./RichTextEditor";
import { useEditor } from "@tiptap/react";

describe("RichTextEditor", () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    value: "<p>Initial Value</p>",
    onChange: mockOnChange,
    placeholder: "Enter text...",
    readOnly: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up the mock return value for useEditor
    (useEditor as jest.Mock).mockReturnValue(mockEditorInstance);
  });

  it("renders without toolbar when readOnly=true", () => {
    render(<RichTextEditor {...defaultProps} readOnly={true} />);

    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
    expect(screen.queryByTestId("editor-toolbar")).not.toBeInTheDocument();

    // Verify the editor is set to not be editable
    expect(mockEditorInstance.setEditable).toHaveBeenCalledWith(false);
  });

  it("renders with toolbar when editor is available", () => {
    render(<RichTextEditor {...defaultProps} readOnly={false} />);

    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
    expect(screen.getByTestId("editor-toolbar")).toBeInTheDocument();

    // Verify the editor is set to be editable
    expect(mockEditorInstance.setEditable).toHaveBeenCalledWith(true);
  });
});
