import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EditorToolbar from './EditorToolbar';
import { Editor } from '@tiptap/react';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Bold: () => <div data-testid="bold-icon" />,
  Italic: () => <div data-testid="italic-icon" />,
  Underline: () => <div data-testid="underline-icon" />,
  Strikethrough: () => <div data-testid="strike-icon" />,
  Heading1: () => <div data-testid="h1-icon" />,
  Heading2: () => <div data-testid="h2-icon" />,
  List: () => <div data-testid="bulletlist-icon" />,
  ListOrdered: () => <div data-testid="orderedlist-icon" />,
  Link: () => <div data-testid="link-icon" />,
  Image: () => <div data-testid="image-icon" />,
  RemoveFormatting: () => <div data-testid="removeformat-icon" />,
}));

const mockChain = {
  focus: jest.fn().mockReturnThis(),
  toggleBold: jest.fn().mockReturnThis(),
  toggleItalic: jest.fn().mockReturnThis(),
  toggleUnderline: jest.fn().mockReturnThis(),
  toggleStrike: jest.fn().mockReturnThis(),
  toggleHeading: jest.fn().mockReturnThis(),
  toggleBulletList: jest.fn().mockReturnThis(),
  toggleOrderedList: jest.fn().mockReturnThis(),
  extendMarkRange: jest.fn().mockReturnThis(),
  setLink: jest.fn().mockReturnThis(),
  unsetLink: jest.fn().mockReturnThis(),
  setImage: jest.fn().mockReturnThis(),
  clearNodes: jest.fn().mockReturnThis(),
  unsetAllMarks: jest.fn().mockReturnThis(),
  run: jest.fn(),
};

const mockCan = {
    chain: jest.fn(() => mockChain), // Ensure `can().chain()` returns the mockChain
    toggleBold: jest.fn().mockReturnThis(), // Add other methods if `can()` is used more extensively
    toggleItalic: jest.fn().mockReturnThis(),
    toggleUnderline: jest.fn().mockReturnThis(),
    toggleStrike: jest.fn().mockReturnThis(),
};

const mockEditor = {
  chain: jest.fn(() => mockChain),
  can: jest.fn(() => mockCan), // mock the `can()` method
  isActive: jest.fn(() => false),
  getAttributes: jest.fn(() => ({ href: '' })),
} as unknown as Editor; // Cast to Editor type

describe('EditorToolbar', () => {
  let originalPrompt: typeof window.prompt;

  beforeAll(() => {
    // Store original prompt once
    originalPrompt = window.prompt;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore window.prompt before each test to ensure clean state
    window.prompt = originalPrompt;
  });

  afterAll(() => {
    // Clean up and restore original prompt
    window.prompt = originalPrompt;
  });

  it('renders null if editor is null', () => {
    const { container } = render(<EditorToolbar editor={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all toolbar buttons', () => {
    render(<EditorToolbar editor={mockEditor} />);
    expect(screen.getByTitle('Heading 1')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 2')).toBeInTheDocument();
    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('Underline')).toBeInTheDocument();
    expect(screen.getByTitle('Strikethrough')).toBeInTheDocument();
    expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
    expect(screen.getByTitle('Ordered List')).toBeInTheDocument();
    expect(screen.getByTitle('Add Link')).toBeInTheDocument();
    expect(screen.getByTitle('Add Image')).toBeInTheDocument();
    expect(screen.getByTitle('Remove Formatting')).toBeInTheDocument();
  });

  // Test individual button clicks
  it('calls toggleBold on Bold button click', () => {
    render(<EditorToolbar editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Bold'));
    expect(mockEditor.chain().focus().toggleBold().run).toHaveBeenCalled();
  });

  it('calls toggleItalic on Italic button click', () => {
    render(<EditorToolbar editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Italic'));
    expect(mockEditor.chain().focus().toggleItalic().run).toHaveBeenCalled();
  });

  it('calls toggleUnderline on Underline button click', () => {
    render(<EditorToolbar editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Underline'));
    expect(mockEditor.chain().focus().toggleUnderline().run).toHaveBeenCalled();
  });

  it('calls toggleStrike on Strikethrough button click', () => {
    render(<EditorToolbar editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Strikethrough'));
    expect(mockEditor.chain().focus().toggleStrike().run).toHaveBeenCalled();
  });

  it('calls toggleHeading with level 1 on H1 button click', () => {
    render(<EditorToolbar editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Heading 1'));
    expect(mockEditor.chain().focus().toggleHeading).toHaveBeenCalledWith({ level: 1 });
  });

  it('calls toggleHeading with level 2 on H2 button click', () => {
    render(<EditorToolbar editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Heading 2'));
    expect(mockEditor.chain().focus().toggleHeading).toHaveBeenCalledWith({ level: 2 });
  });

  it('calls toggleBulletList on Bullet List button click', () => {
    render(<EditorToolbar editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Bullet List'));
    expect(mockEditor.chain().focus().toggleBulletList().run).toHaveBeenCalled();
  });

  it('calls toggleOrderedList on Ordered List button click', () => {
    render(<EditorToolbar editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Ordered List'));
    expect(mockEditor.chain().focus().toggleOrderedList().run).toHaveBeenCalled();
  });

  it('calls clearNodes and unsetAllMarks on Remove Formatting button click', () => {
    render(<EditorToolbar editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Remove Formatting'));
    expect(mockEditor.chain().focus().clearNodes().unsetAllMarks().run).toHaveBeenCalled();
  });


  describe('Link button functionality', () => {
    it('sets link when URL is provided via prompt', () => {
      window.prompt = jest.fn(() => 'https://example.com');
      render(<EditorToolbar editor={mockEditor} />);
      fireEvent.click(screen.getByTitle('Add Link'));
      expect(window.prompt).toHaveBeenCalledWith('URL', '');
      expect(mockEditor.chain().focus().extendMarkRange().setLink).toHaveBeenCalledWith({ href: 'https://example.com' });
    });

    it('unsets link when URL prompt is empty', () => {
      window.prompt = jest.fn(() => '');
      render(<EditorToolbar editor={mockEditor} />);
      fireEvent.click(screen.getByTitle('Add Link'));
      expect(mockEditor.chain().focus().extendMarkRange().unsetLink().run).toHaveBeenCalled();
    });

    it('does nothing if URL prompt is cancelled (null)', () => {
      window.prompt = jest.fn(() => null);
      render(<EditorToolbar editor={mockEditor} />);
      fireEvent.click(screen.getByTitle('Add Link'));
      expect(mockEditor.chain().focus().extendMarkRange().setLink).not.toHaveBeenCalled();
      expect(mockEditor.chain().focus().extendMarkRange().unsetLink).not.toHaveBeenCalled();
    });
  });

  describe('Image button functionality', () => {
    it('sets image when URL is provided via prompt', () => {
      window.prompt = jest.fn(() => 'https://example.com/image.png');
      render(<EditorToolbar editor={mockEditor} />);
      fireEvent.click(screen.getByTitle('Add Image'));
      expect(window.prompt).toHaveBeenCalledWith('Image URL');
      expect(mockEditor.chain().focus().setImage).toHaveBeenCalledWith({ src: 'https://example.com/image.png' });
    });

    it('does nothing if image URL prompt is cancelled or empty', () => {
      window.prompt = jest.fn(() => null); // Simulate cancel
      render(<EditorToolbar editor={mockEditor} />);
      fireEvent.click(screen.getByTitle('Add Image'));
      expect(mockEditor.chain().focus().setImage).not.toHaveBeenCalled();

      window.prompt = jest.fn(() => ''); // Simulate empty
      fireEvent.click(screen.getByTitle('Add Image'));
      expect(mockEditor.chain().focus().setImage).not.toHaveBeenCalled();
    });
  });

  // Test active state styling
  it('applies active class to Bold button when bold is active', () => {
    (mockEditor.isActive as jest.Mock).mockImplementation((type) => type === 'bold');
    render(<EditorToolbar editor={mockEditor} />);
    expect(screen.getByTitle('Bold')).toHaveClass('bg-gray-300'); // Example active class
    expect(screen.getByTitle('Italic')).not.toHaveClass('bg-gray-300');
  });

  it('applies active class to Italic button when italic is active', () => {
    (mockEditor.isActive as jest.Mock).mockImplementation((type) => type === 'italic');
    render(<EditorToolbar editor={mockEditor} />);
    expect(screen.getByTitle('Italic')).toHaveClass('bg-gray-300');
    expect(screen.getByTitle('Bold')).not.toHaveClass('bg-gray-300');
  });

  it('applies active class to Heading 1 button when H1 is active', () => {
    (mockEditor.isActive as jest.Mock).mockImplementation((type, options) => type === 'heading' && options?.level === 1);
    render(<EditorToolbar editor={mockEditor} />);
    expect(screen.getByTitle('Heading 1')).toHaveClass('bg-gray-300');
    expect(screen.getByTitle('Heading 2')).not.toHaveClass('bg-gray-300');
  });

  // Test disabled state (only for buttons that have a `disabled` attribute tied to `editor.can()`)
  it('disables Bold button if editor.can().toggleBold() is false', () => {
    (mockEditor.can().chain().focus().toggleBold().run as jest.Mock).mockReturnValue(false);
    // To actually make the button disabled, the `disabled` prop needs to be correctly passed.
    // The mock setup for `can()` needs to ensure that `editor.can().chain().focus().toggleBold().run()` results in a state
    // that the component interprets as "cannot execute".
    // The provided mock for `can().chain()...run()` is a jest.fn(), which by default returns undefined.
    // We need to make sure the `disabled` attribute is correctly set based on `!editor.can()...run()`.
    // Let's refine the mock for `can` to directly control the boolean it would effectively result in.

    const specificMockEditor = {
        ...mockEditor,
        can: jest.fn(() => ({
            ...mockCan,
            chain: jest.fn(() => ({
                ...mockChain,
                toggleBold: jest.fn(() => ({ // This specific chain can be controlled
                    run: jest.fn(() => false) // This makes the button disabled
                })),
                // Other commands on `can().chain()` can default to true if not specified
                toggleItalic: jest.fn(() => ({ run: jest.fn(() => true) })),
                toggleUnderline: jest.fn(() => ({ run: jest.fn(() => true) })),
                toggleStrike: jest.fn(() => ({ run: jest.fn(() => true) })),
            }))
        }))
    } as unknown as Editor;

    render(<EditorToolbar editor={specificMockEditor} />);
    expect(screen.getByTitle('Bold')).toBeDisabled();
    expect(screen.getByTitle('Italic')).not.toBeDisabled(); // Assuming Italic can run
  });

});
