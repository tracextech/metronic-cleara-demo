import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";

interface Product {
  id: number;
  name: string;
  productCode: string;
  productType: string;
  hsCode: string | null;
  createdAt: Date | null;
  entityId: number;
}

interface ProductSearchComboboxProps {
  value?: string;
  onProductSelect: (productName: string, hsnCode?: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ProductSearchCombobox({
  value,
  onProductSelect,
  placeholder = "Search products...",
  disabled = false,
}: ProductSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || "");
  const [selectedProductHsCode, setSelectedProductHsCode] = useState<string | null>(null);
  
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products/search", debouncedQuery],
    queryFn: async () => {
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) {
        throw new Error("Failed to search products");
      }
      
      return response.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  // Update search query when value prop changes
  useEffect(() => {
    setSearchQuery(value || "");
  }, [value]);

  const handleProductSelect = (product: Product) => {
    console.log("Product selected:", { name: product.name, hsCode: product.hsCode });
    setSearchQuery(product.name);
    setSelectedProductHsCode(product.hsCode);
    setOpen(false);
    onProductSelect(product.name, product.hsCode || undefined);
  };

  const handleClearProduct = () => {
    setSearchQuery("");
    setSelectedProductHsCode(null);
    onProductSelect("", undefined);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    
    // If user manually types, clear the auto-filled HSN code
    if (selectedProductHsCode && newValue !== value) {
      setSelectedProductHsCode(null);
      onProductSelect(newValue, undefined);
    }
    
    // Show dropdown when typing
    if (newValue.length >= 2) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full">
            <Input
              value={searchQuery}
              onChange={handleInputChange}
              placeholder={placeholder}
              disabled={disabled}
              className={`pr-16 w-full ${searchQuery && !selectedProductHsCode ? 'border-orange-300 bg-orange-50' : ''}`}
              onFocus={() => {
                if (searchQuery.length >= 2) {
                  setOpen(true);
                }
              }}
              title={searchQuery} // Show full text on hover
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                  onClick={handleClearProduct}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </PopoverTrigger>
        {searchQuery && !selectedProductHsCode && (
          <div className="text-xs text-orange-600 mt-1">
            Please select a product from the dropdown to auto-fill HSN code
          </div>
        )}
        <PopoverContent className="w-[400px] p-0" align="start">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Searching...</div>
          ) : products.length > 0 ? (
            <div className="max-h-60 overflow-y-auto">
              {products.map((product: Product) => (
                <div
                  key={product.id}
                  className="p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0"
                  onClick={() => handleProductSelect(product)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{product.name}</span>
                    {product.hsCode && (
                      <span className="text-xs text-gray-500 mt-1">
                        HSN Code: {product.hsCode}
                      </span>
                    )}
                    {product.productType && (
                      <span className="text-xs text-gray-400">
                        Category: {product.productType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="p-4 text-sm text-gray-500">No products found.</div>
          ) : (
            <div className="p-4 text-sm text-gray-500">Type to search products...</div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}