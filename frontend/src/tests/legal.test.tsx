import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import {
  PrivacyPolicyPage,
  TermsOfServicePage,
  ContactPage,
} from "../pages/legal";

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("Legal Pages", () => {
  describe("PrivacyPolicyPage", () => {
    it("should render privacy policy content", () => {
      renderWithRouter(<PrivacyPolicyPage />);

      expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
      expect(screen.getByText("Introduction")).toBeInTheDocument();
      expect(
        screen.getByText(/We are committed to protecting your privacy/)
      ).toBeInTheDocument();
      expect(screen.getByText("Information We Collect")).toBeInTheDocument();
      expect(
        screen.getByText("How We Use Your Information")
      ).toBeInTheDocument();
    });

    it("should have contact email link", () => {
      renderWithRouter(<PrivacyPolicyPage />);

      const emailLink = screen.getByRole("link", {
        name: /privacy@dzinza.com/,
      });
      expect(emailLink).toHaveAttribute("href", "mailto:privacy@dzinza.com");
    });
  });

  describe("TermsOfServicePage", () => {
    it("should render terms of service content", () => {
      renderWithRouter(<TermsOfServicePage />);

      expect(screen.getByText("Terms of Service")).toBeInTheDocument();
      expect(screen.getByText("Agreement to Terms")).toBeInTheDocument();
      expect(
        screen.getByText(/By accessing and using Dzinza/)
      ).toBeInTheDocument();
      expect(screen.getByText("Description of Service")).toBeInTheDocument();
      expect(screen.getByText("Acceptable Use")).toBeInTheDocument();
    });

    it("should have legal contact email link", () => {
      renderWithRouter(<TermsOfServicePage />);

      const emailLink = screen.getByRole("link", { name: /legal@dzinza.com/ });
      expect(emailLink).toHaveAttribute("href", "mailto:legal@dzinza.com");
    });
  });

  describe("ContactPage", () => {
    it("should render contact page content", () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByText("Contact Us")).toBeInTheDocument();
      expect(screen.getByText("Get in Touch")).toBeInTheDocument();
      expect(screen.getByText("Send us a Message")).toBeInTheDocument();
    });

    it("should have contact form", () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Subject/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Message/)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Send Message/ })
      ).toBeInTheDocument();
    });

    it("should display multiple contact email addresses", () => {
      renderWithRouter(<ContactPage />);

      expect(
        screen.getByRole("link", { name: /hello@dzinza.com/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /support@dzinza.com/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /privacy@dzinza.com/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /business@dzinza.com/ })
      ).toBeInTheDocument();
    });
  });
});
