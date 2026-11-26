import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal, MapPin, Star, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories">;

export interface SearchFilters {
  searchTerm: string;
  selectedCategory: string | null;
  priceRange: [number, number];
  location: string;
  minRating: number;
  sortBy: string;
}

interface AdvancedSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: Partial<SearchFilters>) => void;
  onReset: () => void;
  categories: Category[];
  maxPrice?: number;
  type: "product" | "service";
}

const LOCATIONS = [
  "Lomé", "Kara", "Sokodé", "Atakpamé", "Kpalimé",
  "Dapaong", "Tsévié", "Notsé", "Aného", "Bassar"
];

const AdvancedSearchFilters = ({
  filters,
  onFiltersChange,
  onReset,
  categories,
  maxPrice = 10000000,
  type,
}: AdvancedSearchFiltersProps) => {
  const [open, setOpen] = useState(false);

  const activeFiltersCount = [
    filters.location,
    filters.minRating > 0,
    filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice,
    filters.selectedCategory,
  ].filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl relative" aria-label="Filtres avancés">
          <SlidersHorizontal className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtres avancés</SheetTitle>
          <SheetDescription>
            Affinez votre recherche avec des critères spécifiques
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Location */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-primary" />
              Localisation
            </Label>
            <Select
              value={filters.location || "all"}
              onValueChange={(v) => onFiltersChange({ location: v === "all" ? "" : v })}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Toutes les villes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les villes</SelectItem>
                {LOCATIONS.map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div>
            <Label className="mb-3 block">Fourchette de prix (FCFA)</Label>
            <Slider
              value={[filters.priceRange[0], filters.priceRange[1]]}
              onValueChange={(v) => onFiltersChange({ priceRange: [v[0], v[1]] as [number, number] })}
              max={maxPrice}
              step={5000}
              className="mb-2"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{filters.priceRange[0].toLocaleString()}</span>
              <span>{filters.priceRange[1].toLocaleString()}</span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <Label className="mb-3 block">Catégories</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!filters.selectedCategory ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => onFiltersChange({ selectedCategory: null })}
              >
                Toutes
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={filters.selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => onFiltersChange({ selectedCategory: cat.id })}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Min Rating */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-primary" />
              Note minimum
            </Label>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5].map((r) => (
                <Button
                  key={r}
                  variant={filters.minRating === r ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => onFiltersChange({ minRating: r })}
                >
                  {r === 0 ? "Tous" : (
                    <span className="flex items-center gap-0.5">
                      {r}+ <Star className="h-3 w-3 fill-current" />
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="mt-8 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => { onReset(); setOpen(false); }}
          >
            <X className="h-4 w-4 mr-1" /> Réinitialiser
          </Button>
          <Button className="flex-1" onClick={() => setOpen(false)}>
            Appliquer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default AdvancedSearchFilters;

// Active filter pills component
export const ActiveFilterPills = ({
  filters,
  categories,
  onFiltersChange,
}: {
  filters: SearchFilters;
  categories: Category[];
  onFiltersChange: (filters: Partial<SearchFilters>) => void;
}) => {
  const pills: { label: string; onRemove: () => void }[] = [];

  if (filters.location) {
    pills.push({ label: `📍 ${filters.location}`, onRemove: () => onFiltersChange({ location: "" }) });
  }
  if (filters.minRating > 0) {
    pills.push({ label: `⭐ ${filters.minRating}+`, onRemove: () => onFiltersChange({ minRating: 0 }) });
  }
  if (filters.selectedCategory) {
    const catName = categories.find((c) => c.id === filters.selectedCategory)?.name;
    if (catName) pills.push({ label: catName, onRemove: () => onFiltersChange({ selectedCategory: null }) });
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {pills.map((p) => (
        <Badge
          key={p.label}
          variant="secondary"
          className="cursor-pointer gap-1 pr-1.5"
          onClick={p.onRemove}
        >
          {p.label}
          <X className="h-3 w-3" />
        </Badge>
      ))}
    </div>
  );
};
