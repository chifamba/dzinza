import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Footer from "../components/layout/Footer";

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("Footer Component", () => {
  it("should render footer with legal links", () => {
    renderWithRouter(<Footer />);

    expect(
      screen.getByText(/© \d{4} Dzinza. All rights reserved./)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Privacy Policy" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Terms of Service" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Contact Us" })
    ).toBeInTheDocument();
  });

  it("should have correct navigation links", () => {
    renderWithRouter(<Footer />);

    const privacyLink = screen.getByRole("link", { name: "Privacy Policy" });
    const termsLink = screen.getByRole("link", { name: "Terms of Service" });
    const contactLink = screen.getByRole("link", { name: "Contact Us" });

    expect(privacyLink).toHaveAttribute("href", "/privacy-policy");
    expect(termsLink).toHaveAttribute("href", "/terms-of-service");
    expect(contactLink).toHaveAttribute("href", "/contact");
  });

  it("should display current year in copyright", () => {
    renderWithRouter(<Footer />);

    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`© ${currentYear} Dzinza`))
    ).toBeInTheDocument();
  });
});
