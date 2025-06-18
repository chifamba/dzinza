import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import EditorToolbar from "./EditorToolbar";
import React from "react";

// Mock the lucide-react icons
vi.mock("lucide-react", () => ({
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

describe("EditorToolbar", () => {
  it("renders null if editor is null", () => {
    const { container } = render(<EditorToolbar editor={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders toolbar buttons when editor is provided", () => {
    const mockEditor = {
      chain: vi.fn(() => ({
        focus: vi.fn(() => ({
          toggleBold: vi.fn(() => ({
            run: vi.fn(),
          })),
          toggleItalic: vi.fn(() => ({
            run: vi.fn(),
          })),
          toggleUnderline: vi.fn(() => ({
            run: vi.fn(),
          })),
          toggleStrike: vi.fn(() => ({
            run: vi.fn(),
          })),
          toggleHeading: vi.fn(() => ({
            run: vi.fn(),
          })),
          toggleBulletList: vi.fn(() => ({
            run: vi.fn(),
          })),
          toggleOrderedList: vi.fn(() => ({
            run: vi.fn(),
          })),
          setLink: vi.fn(() => ({
            run: vi.fn(),
          })),
          unsetLink: vi.fn(() => ({
            run: vi.fn(),
          })),
          clearNodes: vi.fn(() => ({
            unsetAllMarks: vi.fn(() => ({
              run: vi.fn(),
            })),
          })),
          setImage: vi.fn(() => ({
            run: vi.fn(),
          })),
          extendMarkRange: vi.fn(() => ({
            setLink: vi.fn(() => ({
              run: vi.fn(),
            })),
            unsetLink: vi.fn(() => ({
              run: vi.fn(),
            })),
          })),
        })),
      })),
      can: vi.fn(() => ({
        chain: vi.fn(() => ({
          focus: vi.fn(() => ({
            toggleBold: vi.fn(() => ({
              run: vi.fn(() => true),
            })),
            toggleItalic: vi.fn(() => ({
              run: vi.fn(() => true),
            })),
            toggleUnderline: vi.fn(() => ({
              run: vi.fn(() => true),
            })),
            toggleStrike: vi.fn(() => ({
              run: vi.fn(() => true),
            })),
          })),
        })),
      })),
      isActive: vi.fn(() => false),
      getAttributes: vi.fn(() => ({ href: "" })),
    };

    render(<EditorToolbar editor={mockEditor as any} />);

    // Check that basic buttons are rendered
    expect(screen.getByTitle("Bold")).toBeTruthy();
    expect(screen.getByTitle("Italic")).toBeTruthy();
    expect(screen.getByTitle("Underline")).toBeTruthy();
    expect(screen.getByTitle("Strikethrough")).toBeTruthy();
    expect(screen.getByTitle("Heading 1")).toBeTruthy();
    expect(screen.getByTitle("Heading 2")).toBeTruthy();
    expect(screen.getByTitle("Bullet List")).toBeTruthy();
    expect(screen.getByTitle("Ordered List")).toBeTruthy();
    expect(screen.getByTitle("Add Link")).toBeTruthy();
    expect(screen.getByTitle("Add Image")).toBeTruthy();
    expect(screen.getByTitle("Remove Formatting")).toBeTruthy();
  });

  it("applies active class when a format is active", () => {
    const mockEditor = {
      chain: vi.fn(() => ({
        focus: vi.fn(() => ({
          toggleBold: vi.fn(() => ({
            run: vi.fn(),
          })),
        })),
      })),
      can: vi.fn(() => ({
        chain: vi.fn(() => ({
          focus: vi.fn(() => ({
            toggleBold: vi.fn(() => ({
              run: vi.fn(() => true),
            })),
            toggleItalic: vi.fn(() => ({
              run: vi.fn(() => true),
            })),
            toggleUnderline: vi.fn(() => ({
              run: vi.fn(() => true),
            })),
            toggleStrike: vi.fn(() => ({
              run: vi.fn(() => true),
            })),
          })),
        })),
      })),
      // Mock isActive to return true for 'bold'
      isActive: vi.fn((format) => format === "bold"),
      getAttributes: vi.fn(() => ({ href: "" })),
    };

    render(<EditorToolbar editor={mockEditor as any} />);
    const boldButton = screen.getByTitle("Bold");

    expect(boldButton.className).toContain("bg-gray-300");
    expect(mockEditor.isActive).toHaveBeenCalledWith("bold");
  });
});
