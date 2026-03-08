import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MarketplacePagination from "@/components/marketplace/MarketplacePagination";

describe("MarketplacePagination", () => {
  it("should not render when totalPages <= 1", () => {
    const { container } = render(
      <MarketplacePagination currentPage={1} totalPages={1} onPageChange={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render navigation buttons", () => {
    render(
      <MarketplacePagination currentPage={2} totalPages={5} onPageChange={() => {}} />
    );
    expect(screen.getByText("Précédent")).toBeInTheDocument();
    expect(screen.getByText("Suivant")).toBeInTheDocument();
  });

  it("should disable Précédent on first page", () => {
    render(
      <MarketplacePagination currentPage={1} totalPages={5} onPageChange={() => {}} />
    );
    expect(screen.getByText("Précédent")).toBeDisabled();
  });

  it("should disable Suivant on last page", () => {
    render(
      <MarketplacePagination currentPage={5} totalPages={5} onPageChange={() => {}} />
    );
    expect(screen.getByText("Suivant")).toBeDisabled();
  });
});
