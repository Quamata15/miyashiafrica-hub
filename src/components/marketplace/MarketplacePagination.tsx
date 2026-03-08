import { Button } from "@/components/ui/button";

interface MarketplacePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const MarketplacePagination = ({ currentPage, totalPages, onPageChange }: MarketplacePaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-10">
      <Button variant="outline" size="sm" disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}>
        Précédent
      </Button>
      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
        let page: number;
        if (totalPages <= 7) page = i + 1;
        else if (currentPage <= 4) page = i + 1;
        else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
        else page = currentPage - 3 + i;
        return (
          <Button key={page} variant={currentPage === page ? "default" : "outline"}
            size="sm" className="w-9 h-9" onClick={() => onPageChange(page)}>
            {page}
          </Button>
        );
      })}
      <Button variant="outline" size="sm" disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}>
        Suivant
      </Button>
    </div>
  );
};

export default MarketplacePagination;
