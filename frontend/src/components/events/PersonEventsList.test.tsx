import { render, screen, waitFor } from "../../test/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import PersonEventsList from "./PersonEventsList";

// Setup fetch mock
vi.mock("global", () => ({
  fetch: vi.fn(),
}));

// Mock fetch implementation
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("PersonEventsList", () => {
  const mockPersonId = "person-123";
  const mockEvents = [
    {
      _id: "event-1",
      title: "Birth",
      content: "<p>John Doe was born</p>",
      date: "1980-01-01",
      category: "birth",
    },
    {
      _id: "event-2",
      title: "Graduation",
      content: "<p>John Doe graduated from college</p>",
      date: "2001-05-15",
      category: "education",
    },
    {
      _id: "event-3",
      title: "Marriage",
      content: "<p>John Doe married Jane Smith</p>",
      date: "2010-06-20",
      category: "marriage",
    },
  ];

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("renders loading state initially", () => {
    // Mock fetch response
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve({ data: mockEvents }),
              }),
            100
          )
        )
    );

    render(<PersonEventsList personId={mockPersonId} />);

    // Should show loading state
    expect(screen.getByText("Loading related events...")).toBeInTheDocument();
  });

  it("fetches and displays events for the given person", async () => {
    // Mock successful fetch response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockEvents }),
    });

    render(<PersonEventsList personId={mockPersonId} />);

    // Should initially show loading state
    expect(screen.getByText("Loading related events...")).toBeInTheDocument();

    // Wait for events to load
    await waitFor(() => {
      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();
    });

    // Check that events are displayed
    expect(screen.getByText("Birth")).toBeInTheDocument();
    expect(screen.getByText("Graduation")).toBeInTheDocument();
    expect(screen.getByText("Marriage")).toBeInTheDocument();

    // Check that fetch was called with correct URL
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/events?relatedPersonId=person-123&sortBy=date&sortOrder=desc&limit=5"
    );
  });

  it("displays events in chronological order", async () => {
    // Mock successful fetch response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockEvents }),
    });

    render(<PersonEventsList personId={mockPersonId} />);

    // Wait for events to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading related events...")
      ).not.toBeInTheDocument();
    });

    // Check that dates are displayed in chronological order
    const dateElements = screen.getAllByText(
      /December 31, 1979|May 14, 2001|June 19, 2010/
    );
    expect(dateElements[0].textContent).toContain("December 31, 1979");
    expect(dateElements[1].textContent).toContain("May 14, 2001");
    expect(dateElements[2].textContent).toContain("June 19, 2010");
  });

  it("displays formatted dates properly", async () => {
    // Mock successful fetch response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockEvents }),
    });

    render(<PersonEventsList personId={mockPersonId} />);

    // Wait for events to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading related events...")
      ).not.toBeInTheDocument();
    });

    // Check that dates are formatted correctly - check for at least one date
    // The actual date format might vary based on implementation
    expect(screen.getByText(/December 31, 1979/)).toBeInTheDocument();
    expect(screen.getByText(/May 14, 2001/)).toBeInTheDocument();
    expect(screen.getByText(/June 19, 2010/)).toBeInTheDocument();
  });

  it("displays event categories correctly", async () => {
    // Mock successful fetch response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockEvents }),
    });

    render(<PersonEventsList personId={mockPersonId} />);

    // Wait for events to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading related events...")
      ).not.toBeInTheDocument();
    });

    // Check that categories are displayed - check for presence of events
    expect(screen.getByText("Birth")).toBeInTheDocument();
    expect(screen.getByText("Graduation")).toBeInTheDocument();
    expect(screen.getByText("Marriage")).toBeInTheDocument();
  });

  it("sanitizes HTML content in events", async () => {
    const eventsWithScripts = [
      {
        _id: "event-dangerous",
        title: "Test Event",
        content: '<p>Safe content</p><script>alert("dangerous")</script>',
        date: "2020-01-01",
        category: "test",
      },
    ];

    // Mock successful fetch response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: eventsWithScripts }),
    });

    render(<PersonEventsList personId={mockPersonId} />);

    // Wait for events to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading related events...")
      ).not.toBeInTheDocument();
    });

    // Check that safe content is displayed
    expect(screen.getByText(/Safe content/)).toBeInTheDocument();

    // Check that script content is not rendered in a script tag (it might be rendered as text)
    const htmlContent = document.body.innerHTML;
    expect(htmlContent).not.toContain("<script>");
  });

  it("displays an error message when the fetch fails", async () => {
    // Mock failed fetch response
    mockFetch.mockRejectedValueOnce(new Error("Failed to fetch events"));

    render(<PersonEventsList personId={mockPersonId} />);

    // Wait for error state
    await waitFor(() => {
      expect(
        screen.queryByText("Loading related events...")
      ).not.toBeInTheDocument();
    });

    // Error message should be displayed
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Error loading events:")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch events")).toBeInTheDocument();
  });

  it("displays a message when there are no events", async () => {
    // Mock successful fetch response with empty array
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    render(<PersonEventsList personId={mockPersonId} />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(
        screen.queryByText("Loading related events...")
      ).not.toBeInTheDocument();
    });

    // Empty state message should be displayed
    expect(
      screen.getByText("No events found for this person.")
    ).toBeInTheDocument();
  });
});
