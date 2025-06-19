import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Trash2, AlertCircle, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Product types
type Product = {
  id: number;
  name: string;
  productCode: string;
  productType: string;
  hsCode: string | null;
  units: string;
  createdAt: string;
  entityId: number;
};

// Form schema for product creation/update
const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  productCode: z.string().min(2, "Product code is required"),
  productType: z.enum(["raw_material", "semi_finished_good", "finished_good"]),
  hsCode: z.string().optional(),
  units: z.enum(["kg", "ton", "litres", "m3", "pieces"]).default("kg"),
  entityId: z.number(),
});

type ProductFormValues = z.infer<typeof productSchema>;

// ProductForm component
const ProductForm = ({ 
  onSubmit, 
  defaultValues,
  isSubmitting,
  mode = "create" 
}: { 
  onSubmit: (data: ProductFormValues) => void;
  defaultValues?: Partial<ProductFormValues>;
  isSubmitting: boolean;
  mode?: "create" | "edit";
}) => {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultValues || {
      name: "",
      productCode: "",
      productType: "raw_material",
      hsCode: "",
      units: "kg", // Default units
      entityId: 1, // Default to current entity ID
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter product name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="productCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Code</FormLabel>
              <FormControl>
                <Input placeholder="Enter product code" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="productType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Type</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={mode === "edit"} // Cannot change product type once created
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="raw_material">Raw Material</SelectItem>
                  <SelectItem value="semi_finished_good">Semi-Finished Good</SelectItem>
                  <SelectItem value="finished_good">Finished Good</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hsCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HS Code (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Enter HS code" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="units"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Units</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select units" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="ton">ton</SelectItem>
                  <SelectItem value="litres">litres</SelectItem>
                  <SelectItem value="m3">m³</SelectItem>
                  <SelectItem value="pieces">pieces</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="entityId"
          render={({ field }) => (
            <FormItem className="hidden">
              <FormControl>
                <Input type="hidden" {...field} value={field.value || 1} />
              </FormControl>
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></span>
                {mode === "create" ? "Creating..." : "Updating..."}
              </span>
            ) : (
              <span>{mode === "create" ? "Add Product" : "Update Product"}</span>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

// DeleteConfirmation component
const DeleteConfirmation = ({ 
  productId, 
  productName, 
  onDelete, 
  isDeleting 
}: { 
  productId: number; 
  productName: string; 
  onDelete: () => void; 
  isDeleting: boolean; 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center text-destructive">
        <AlertCircle className="h-5 w-5" />
        <p>Are you sure you want to delete this product?</p>
      </div>
      <p className="text-sm text-muted-foreground">
        This action will permanently delete the product <span className="font-semibold">{productName}</span> and cannot be undone.
      </p>
      <DialogFooter>
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></span>
              Deleting...
            </span>
          ) : (
            "Delete Product"
          )}
        </Button>
      </DialogFooter>
    </div>
  );
};

// Main Products component
const Products = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("raw_material");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Fetch products query
  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      return apiRequest("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Product created",
        description: "The product has been created successfully.",
      });
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error) => {
      toast({
        title: "Error creating product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ProductFormValues> }) => {
      return apiRequest(`/api/products/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Product updated",
        description: "The product has been updated successfully.",
      });
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error) => {
      toast({
        title: "Error updating product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/products/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "Product deleted",
        description: "The product has been deleted successfully.",
      });
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle creating a product
  const handleCreateProduct = (data: ProductFormValues) => {
    createMutation.mutate(data);
  };

  // Handle updating a product
  const handleUpdateProduct = (data: ProductFormValues) => {
    if (selectedProduct) {
      updateMutation.mutate({ id: selectedProduct.id, data });
    }
  };

  // Handle deleting a product
  const handleDeleteProduct = () => {
    if (selectedProduct) {
      deleteMutation.mutate(selectedProduct.id);
    }
  };

  // Filter products by type and search query
  const filteredProducts = allProducts.filter((product: Product) => {
    const matchesType = product.productType === activeTab;
    const matchesSearch = 
      searchQuery === "" ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.hsCode && product.hsCode.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesType && matchesSearch;
  });

  // Format product type for display
  const formatProductType = (type: string) => {
    switch (type) {
      case "raw_material":
        return "Raw Material";
      case "semi_finished_good":
        return "Semi-Finished Good";
      case "finished_good":
        return "Finished Good";
      default:
        return type;
    }
  };

  return (
    <div className="w-full space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <Tabs defaultValue="raw_material" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="raw_material">Raw Materials</TabsTrigger>
              <TabsTrigger value="semi_finished_good">Semi-Finished Goods</TabsTrigger>
              <TabsTrigger value="finished_good">Finished Goods</TabsTrigger>
            </TabsList>
            
            <div className="relative w-64">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {["raw_material", "semi_finished_good", "finished_good"].map((type) => (
            <TabsContent key={type} value={type} className="pt-2">
              <div className="rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Product Code</TableHead>
                      <TableHead>HS Code</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          Loading products...
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          No {formatProductType(type).toLowerCase()} found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product: Product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.productCode}</TableCell>
                          <TableCell>{product.hsCode || "-"}</TableCell>
                          <TableCell>{new Date(product.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setEditDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Enter the details for the new product.
            </DialogDescription>
          </DialogHeader>
          <ProductForm 
            onSubmit={handleCreateProduct} 
            isSubmitting={createMutation.isPending} 
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the details for this product.
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <ProductForm 
              onSubmit={handleUpdateProduct} 
              defaultValues={{
                name: selectedProduct.name,
                productCode: selectedProduct.productCode,
                productType: selectedProduct.productType as "raw_material" | "semi_finished_good" | "finished_good",
                hsCode: selectedProduct.hsCode || "",
                entityId: selectedProduct.entityId,
              }}
              isSubmitting={updateMutation.isPending} 
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <DeleteConfirmation 
              productId={selectedProduct.id}
              productName={selectedProduct.name}
              onDelete={handleDeleteProduct}
              isDeleting={deleteMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;