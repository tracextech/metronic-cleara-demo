import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Stepper from "@/components/ui/stepper";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Plus, Search, Trash2, Upload, User, X, UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import satelliteMapImage from "../../assets/satellite-map.png";
import DeclarationItemsTable from "./declaration-items-table";

type DeclarationSourceType = "existing" | "fresh";

// Define the interface for declaration items
interface DeclarationItem {
  id: string;
  hsnCode: string;
  productName: string;
  productCode?: string; // Outbound Batch ID
  quantity: string;
  unit: string;
  rmId?: string; // RM ID
  skuCode?: string; // SKU Code
}

// Define the interface for existing declaration objects
interface ExistingDeclaration {
  id: number;
  name: string;
  code: string;
  product: string;
  quantity: string;
  status: string;
  eudrReferenceNumber: string;
  eudrVerificationNumber: string;
}

// Define the interface for customer objects
interface Customer {
  id: number;
  name: string;
  type: string;
  company?: string;
  country?: string;
  registrationNumber?: string;
  contactPerson?: string;
  contactEmail?: string;
  complianceScore?: number;
}

interface OutboundDeclarationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OutboundDeclarationWizard({ open, onOpenChange }: OutboundDeclarationWizardProps) {
  const { toast } = useToast();
  
  // Wizard steps state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  // Declaration source type state (existing or fresh)
  const [declarationSource, setDeclarationSource] = useState<DeclarationSourceType>("existing");
  
  // State for selected existing declarations (now supports multiple selections)
  const [selectedDeclarationIds, setSelectedDeclarationIds] = useState<number[]>([]);
  const [declarationSearchTerm, setDeclarationSearchTerm] = useState("");
  const [showDeclarationsList, setShowDeclarationsList] = useState(false);
  
  // State for declaration items (used for both fresh and existing declarations)
  const [items, setItems] = useState<DeclarationItem[]>([
    {
      id: "item-1",
      hsnCode: "",
      productName: "",
      productCode: "",
      quantity: "",
      unit: "kg",
      rmId: "",
      skuCode: ""
    }
  ]);
  
  // Dates state
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [validityPeriod, setValidityPeriod] = useState<string>("na"); // Default to "NA"
  const [showCustomDates, setShowCustomDates] = useState(false);
  
  // GeoJSON upload state for fresh declarations
  const [hasUploadedGeoJSON, setHasUploadedGeoJSON] = useState(false);
  const [geometryValid, setGeometryValid] = useState<boolean | null>(null);
  const [satelliteValid, setSatelliteValid] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  
  // Documents state
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  
  // Customer selection and additional data state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [customerPONumber, setCustomerPONumber] = useState("");
  const [soNumber, setSONumber] = useState("");
  const [shipmentNumber, setShipmentNumber] = useState("");
  
  // Comments state for review
  const [comments, setComments] = useState("");
  
  // Mock data - in a real app, this would come from API requests
  const existingDeclarations: ExistingDeclaration[] = [
    { 
      id: 1, 
      name: "ABC Declaration", 
      code: "#A12345", 
      product: "Cocoa Beans", 
      quantity: "5,000 kg", 
      status: "Approved",
      eudrReferenceNumber: "EU-REF-2025-001423",
      eudrVerificationNumber: "VER-2025-6734" 
    },
    { 
      id: 2, 
      name: "XYZ Declaration", 
      code: "#B67890", 
      product: "Cocoa Butter", 
      quantity: "2,000 kg", 
      status: "Approved",
      eudrReferenceNumber: "EU-REF-2025-001892",
      eudrVerificationNumber: "VER-2025-8421" 
    }
  ];
  
  // Fetch customers from API
  const { data: apiCustomers = [], isLoading: isLoadingCustomers } = useQuery<any[]>({
    queryKey: ['/api/customers'],
    refetchOnWindowFocus: false,
  });
  
  // Transform API customers to match the Customer interface
  const customers: Customer[] = apiCustomers.map(customer => ({
    id: customer.id,
    name: customer.companyName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
    type: customer.type || "Customer",
    company: customer.companyName || "",
    country: customer.country || "",
    registrationNumber: customer.registrationNumber || "N/A",
    contactPerson: customer.contactPerson || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
    contactEmail: customer.email || "",
    complianceScore: customer.complianceScore !== undefined ? customer.complianceScore : 75
  }));
  
  // Query to get available inbound declarations - remove status filter to include all inbound declarations
  const { data: declarations = [] } = useQuery<any[]>({
    queryKey: ['/api/declarations'],
    select: (data: any) => {
      if (!data) return [];
      return data.filter((d: any) => d.type === 'inbound');
    }
  });

  // Effect to populate items when existing declarations are selected
  useEffect(() => {
    console.log("useEffect triggered:", { 
      declarationSource, 
      selectedDeclarationIds: selectedDeclarationIds.length, 
      declarationsLength: declarations.length,
      declarations: declarations.map(d => ({ id: d.id, productName: d.productName, status: d.status }))
    });
    
    if (declarationSource === "existing" && selectedDeclarationIds.length > 0 && declarations.length > 0) {
      const selectedDeclarations = declarations.filter(d => selectedDeclarationIds.includes(d.id));
      console.log("Found selected declarations:", selectedDeclarations.map(d => ({ 
        id: d.id, 
        productName: d.productName, 
        hsnCode: d.hsnCode,
        quantity: d.quantity 
      })));
      
      if (selectedDeclarations.length > 0) {
        const newItems = selectedDeclarations.map((declaration, index) => ({
          id: `item-${index + 1}`,
          hsnCode: declaration.hsnCode || "",
          productName: declaration.productName || "",
          productCode: declaration.batchId || declaration.id.toString(),
          quantity: declaration.quantity?.toString() || "",
          unit: declaration.unit || "kg",
          rmId: declaration.rmId || "",
          skuCode: declaration.skuCode || ""
        }));
        
        console.log("Items state changed:", newItems);
        setItems(newItems);
      }
    } else if (declarationSource === "fresh") {
      // Reset to default empty item for fresh declarations
      setItems([{
        id: "item-1",
        hsnCode: "",
        productName: "",
        productCode: "",
        quantity: "",
        unit: "kg",
        rmId: "",
        skuCode: ""
      }]);
    }
  }, [declarationSource, selectedDeclarationIds, declarations]);
  
  // Create declaration mutation
  const createDeclaration = useMutation({
    mutationFn: (declaration: any) => 
      apiRequest('/api/declarations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(declaration)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/declarations'] });
      toast({
        title: "Declaration submitted",
        description: "Your outbound declaration has been successfully submitted",
        variant: "default",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to submit declaration",
        description: "There was an error submitting your declaration. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Add a new item to the items list
  const addItem = () => {
    const newItem: DeclarationItem = {
      id: `item-${items.length + 1}`,
      hsnCode: "",
      productName: "",
      quantity: "",
      unit: "kg",
      rmId: "",
      skuCode: ""
    };
    setItems([...items, newItem]);
  };

  // Remove an item from the items list
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Update an item's property
  const updateItem = (id: string, field: keyof DeclarationItem, value: string | boolean) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Handle GeoJSON upload and validation
  const handleGeoJSONUpload = (e: React.MouseEvent) => {
    e.preventDefault();
    setHasUploadedGeoJSON(true);
    setIsValidating(true);
    setGeometryValid(null);
    setSatelliteValid(null);
    
    toast({
      title: "GeoJSON uploaded",
      description: "GeoJSON file has been uploaded successfully. Validating...",
      variant: "default",
    });
    
    // Simulate geometry validation check - outbound declarations always pass
    setTimeout(() => {
      // Outbound declarations always pass geometry validation
      const geometryIsValid = true;
      setGeometryValid(geometryIsValid);
      
      // Proceed to satellite check
      setTimeout(() => {
        // Outbound declarations always pass satellite validation
        const satelliteIsValid = true;
        setSatelliteValid(satelliteIsValid);
        setIsValidating(false);
        
        toast({
          title: "Validation successful",
          description: "GeoJSON geometry and satellite checks passed successfully.",
          variant: "default",
        });
      }, 2000);
    }, 1500);
  };

  // Handle document upload
  const handleDocumentUpload = (e: React.MouseEvent) => {
    e.preventDefault();
    const filename = `document_${uploadedFiles.length + 1}.pdf`;
    setUploadedFiles(prev => [...prev, filename]);
    toast({
      title: "File uploaded",
      description: `${filename} has been uploaded successfully`,
      variant: "default",
    });
  };

  // Remove a file from uploaded files
  const removeFile = (filename: string) => {
    setUploadedFiles(prev => prev.filter(file => file !== filename));
  };

  // Go to next step in the wizard
  const goToNextStep = () => {
    if (validateCurrentStep()) {
      setCompletedSteps(prev => [...prev, currentStep]);
      setCurrentStep(prev => prev + 1);
    }
  };

  // Go to previous step in the wizard
  const goToPreviousStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Validate current step before proceeding
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1: // Declaration Type
        return true; // Always valid as we have a default type
        
      case 2: // Select Declaration or Fresh Declaration Details
        if (declarationSource === "existing") {
          if (selectedDeclarationIds.length === 0) {
            toast({
              title: "Selection required",
              description: "Please select at least one existing inbound declaration",
              variant: "destructive",
            });
            return false;
          }
          
          // Check dates for existing declarations
          if (!startDate || !endDate) {
            toast({
              title: "Dates required",
              description: "Please select both start and end dates for the declaration validity period",
              variant: "destructive",
            });
            return false;
          }
          
          // Validation removed as requested
        } else {
          // Validation removed as requested
          
          // Check dates for fresh declarations
          if (!startDate || !endDate) {
            toast({
              title: "Dates required",
              description: "Please select both start and end dates for the declaration validity period",
              variant: "destructive",
            });
            return false;
          }
        }
        return true;
        
      case 3: // Upload Data/Documents
        // For fresh declarations, we should check if GeoJSON is uploaded
        if (declarationSource === "fresh" && !hasUploadedGeoJSON) {
          toast({
            title: "GeoJSON required",
            description: "Please upload a GeoJSON file for geographical data",
            variant: "destructive",
          });
          return false;
        }
        
        // Check if at least one document is uploaded
        if (uploadedFiles.length === 0) {
          toast({
            title: "Evidence required",
            description: "Please upload at least one document as evidence",
            variant: "destructive",
          });
          return false;
        }
        return true;
        
      case 4: // Additional Data
        if (!selectedCustomer) {
          toast({
            title: "Selection required",
            description: "Please select a customer to continue",
            variant: "destructive",
          });
          return false;
        }
        
        // Optional validation for reference numbers if needed
        // For now, we make these fields optional but you can add validation here
        
        return true;
        
      default:
        return true;
    }
  };

  // Submit the declaration
  const submitDeclaration = () => {
    if (!validateCurrentStep()) return;
    
    // For fresh declarations, check if GeoJSON validation passed
    if (declarationSource === "fresh" && hasUploadedGeoJSON) {
      // If still validating, ask user to wait
      if (isValidating) {
        toast({
          title: "Validation in progress",
          description: "Please wait while the GeoJSON file is being validated",
          variant: "default",
        });
        return;
      }
      
      // Check for geometry validation failure
      if (geometryValid === false) {
        toast({
          title: "Cannot submit declaration",
          description: "Geometry validation failed. Please notify the supplier and save as draft instead.",
          variant: "destructive",
        });
        return;
      }
      
      // Check for satellite validation failure
      if (satelliteValid === false) {
        toast({
          title: "Cannot submit declaration",
          description: "Satellite check detected potential deforestation. Please notify the supplier and save as draft instead.",
          variant: "destructive",
        });
        return;
      }
    }
    
    let payload;
    let status = "pending";
    
    // If there are validation issues, set status to draft
    if (declarationSource === "fresh" && 
        hasUploadedGeoJSON && 
        (geometryValid === false || satelliteValid === false)) {
      status = "draft";
    }
    
    if (declarationSource === "existing") {
      // Prepare payload for declaration based on existing ones
      // Include product items if they have been modified/selected
      const formattedItems = items.filter(item => 
        item.productName && item.productName.trim() !== ""
      ).map(item => ({
        hsnCode: item.hsnCode,
        productName: item.productName,
        quantity: item.quantity ? parseFloat(item.quantity) : 0,
        unit: item.unit,
        rmId: item.rmId || null,
        skuCode: item.skuCode || null
      }));

      // For existing declarations, always send product override data from items state
      // This ensures the selected product is used instead of fallback to source declaration
      console.log("Items state:", items);
      console.log("Formatted items:", formattedItems);
      console.log("Selected declaration IDs:", selectedDeclarationIds);

      // For existing declarations, always send product override data from items state
      // This ensures the selected product is used instead of fallback to source declaration
      const finalFormattedItems = formattedItems.length > 0 ? formattedItems : items.filter(item => 
        item.productName && item.productName.trim() !== ""
      ).map(item => ({
        hsnCode: item.hsnCode,
        productName: item.productName,
        quantity: item.quantity ? parseFloat(item.quantity) : 0,
        unit: item.unit,
        rmId: item.rmId || null,
        skuCode: item.skuCode || null
      }));

      console.log("Final formatted items that will be sent:", finalFormattedItems);

      payload = {
        type: "outbound",
        basedOnDeclarationIds: selectedDeclarationIds,
        customerId: selectedCustomer?.id || null,
        customerPONumber: customerPONumber.trim() || null,
        soNumber: soNumber.trim() || null,
        shipmentNumber: shipmentNumber.trim() || null,
        documents: uploadedFiles,
        comments: comments.trim() || null,
        status: status,
        // Always include product data to override source declaration
        items: finalFormattedItems,
        productName: finalFormattedItems.length > 0 ? finalFormattedItems[0].productName : "Custom Outbound Product",
        hsnCode: finalFormattedItems.length > 0 ? finalFormattedItems[0].hsnCode : null,
        quantity: finalFormattedItems.length > 0 ? finalFormattedItems.reduce((sum, item) => sum + item.quantity, 0) : 0,
        unit: finalFormattedItems.length > 0 ? finalFormattedItems[0].unit : "kg",
        hasProductOverride: true // Always true for existing declarations to force override
      };
      
      console.log("Complete payload being prepared:", payload);
    } else {
      // Prepare payload for fresh declaration - include all items with at least a product name
      const formattedItems = items.filter(item => 
        item.productName.trim() !== ""
      ).map(item => ({
        hsnCode: item.hsnCode,
        productName: item.productName,
        quantity: item.quantity ? parseFloat(item.quantity) : 0,
        unit: item.unit,
        rmId: item.rmId || null,
        skuCode: item.skuCode || null
      }));
      
      // Get the first product name as the primary name for the declaration
      const firstProduct = formattedItems[0]?.productName || "Unnamed Product";
      
      // Create a simplified payload with only required fields to match server expectations
      payload = {
        type: "outbound",
        supplierId: 1, // Always use default supplier ID for outbound declarations
        customerId: selectedCustomer?.id || null, // Include customerId for outbound declarations
        productName: firstProduct,
        items: formattedItems,
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null,
        hasGeoJSON: hasUploadedGeoJSON,
        geometryValid: geometryValid,
        satelliteValid: satelliteValid,
        documents: uploadedFiles,
        customerPONumber: customerPONumber.trim() || null,
        soNumber: soNumber.trim() || null,
        shipmentNumber: shipmentNumber.trim() || null,
        comments: comments.trim() || null,
        status: status
      };
    }
    
    console.log("About to submit payload:", payload);
    // Create the declaration through the mutation
    createDeclaration.mutate(payload);
  };

  // Filter declarations based on search term
  const filteredDeclarations = declarationSearchTerm
    ? existingDeclarations.filter(d => 
        d.name.toLowerCase().includes(declarationSearchTerm.toLowerCase()) ||
        d.code.toLowerCase().includes(declarationSearchTerm.toLowerCase()) ||
        d.product.toLowerCase().includes(declarationSearchTerm.toLowerCase()) ||
        d.eudrReferenceNumber.toLowerCase().includes(declarationSearchTerm.toLowerCase())
      )
    : existingDeclarations;

  // Filter customers based on search term
  const filteredCustomers = customerSearchTerm
    ? customers.filter(c => 
        c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(customerSearchTerm.toLowerCase())) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(customerSearchTerm.toLowerCase())) ||
        (c.registrationNumber && c.registrationNumber.toLowerCase().includes(customerSearchTerm.toLowerCase()))
      )
    : customers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl overflow-y-auto max-h-screen pt-4">
        <DialogHeader>
          <DialogTitle>Create Outbound Declaration</DialogTitle>
          <DialogDescription>
            Create an outbound declaration to your customers with compliance documentation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-6">
          <Stepper
            steps={[
              "Declaration Type", 
              "Declaration Details",
              "Upload Data", 
              "Additional Data",
              "Review"
            ]}
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </div>
        
        <div>
          {/* Step 1: Declaration Type */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div 
                  className={cn(
                    "border rounded-md p-4 cursor-pointer transition",
                    declarationSource === "existing" 
                      ? "bg-primary/5 border-primary" 
                      : "hover:border-gray-400"
                  )}
                  onClick={() => setDeclarationSource("existing")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Based on Approved Declaration</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Create an outbound declaration from an already approved inbound declaration
                      </p>
                    </div>
                    {declarationSource === "existing" && (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                
                <div 
                  className={cn(
                    "border rounded-md p-4 cursor-pointer transition",
                    declarationSource === "fresh" 
                      ? "bg-primary/5 border-primary" 
                      : "hover:border-gray-400"
                  )}
                  onClick={() => setDeclarationSource("fresh")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Create New Declaration</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Create a brand new outbound declaration with your own data
                      </p>
                    </div>
                    {declarationSource === "fresh" && (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Declaration Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
                {/* Declaration Validity Period */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Declaration Validity Period</h3>
                  <div className="flex space-x-4 mb-4">
                    <Button 
                      variant={validityPeriod === "30" ? "default" : "outline"}
                      onClick={() => {
                        setValidityPeriod("30");
                        const now = new Date();
                        setStartDate(now);
                        const thirtyDaysLater = new Date();
                        thirtyDaysLater.setDate(now.getDate() + 30);
                        setEndDate(thirtyDaysLater);
                        setShowCustomDates(false);
                      }}
                      className="h-10"
                    >
                      30 days
                    </Button>
                    <Button 
                      variant={validityPeriod === "6months" ? "default" : "outline"}
                      onClick={() => {
                        setValidityPeriod("6months");
                        const now = new Date();
                        setStartDate(now);
                        const sixMonthsLater = new Date();
                        sixMonthsLater.setMonth(now.getMonth() + 6);
                        setEndDate(sixMonthsLater);
                        setShowCustomDates(false);
                      }}
                      className="h-10"
                    >
                      6 months
                    </Button>
                    <Button 
                      variant={validityPeriod === "1year" ? "default" : "outline"}
                      onClick={() => {
                        setValidityPeriod("1year");
                        const now = new Date();
                        setStartDate(now);
                        const oneYearLater = new Date();
                        oneYearLater.setFullYear(now.getFullYear() + 1);
                        setEndDate(oneYearLater);
                        setShowCustomDates(false);
                      }}
                      className="h-10"
                    >
                      1 year
                    </Button>
                    <Button 
                      variant={validityPeriod === "custom" ? "default" : "outline"}
                      onClick={() => {
                        setValidityPeriod("custom");
                        setShowCustomDates(true);
                      }}
                      className="h-10"
                    >
                      Custom
                    </Button>
                  </div>
                  
                  {showCustomDates && (
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <Label htmlFor="start-date" className="flex items-center mb-2">
                          Start Date <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              id="start-date"
                              variant={"outline"}
                              className={cn(
                                "w-[240px] justify-start text-left font-normal",
                                !startDate && "text-gray-400"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {startDate ? format(startDate, "PPP") : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={startDate}
                              onSelect={setStartDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div>
                        <Label htmlFor="end-date" className="flex items-center mb-2">
                          End Date <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              id="end-date"
                              variant={"outline"}
                              className={cn(
                                "w-[240px] justify-start text-left font-normal",
                                !endDate && "text-gray-400"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {endDate ? format(endDate, "PPP") : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={endDate}
                              onSelect={setEndDate}
                              initialFocus
                              disabled={(date) => startDate ? date < startDate : false}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Declaration Items Section - Show different content based on source */}
                {declarationSource === "existing" ? (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Selected Declaration Items</h3>
                    {items.length > 0 && items[0].productName ? (
                      <div className="space-y-3">
                        {items.map((item, index) => (
                          <div key={item.id} className="p-4 border rounded-md bg-gray-50">
                            <div className="grid grid-cols-6 gap-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Product Name</Label>
                                <p className="text-sm font-medium">{item.productName}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700">HSN Code</Label>
                                <p className="text-sm">{item.hsnCode}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700">RM ID</Label>
                                <p className="text-sm">{item.rmId || 'N/A'}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Quantity</Label>
                                <p className="text-sm">{item.quantity}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Unit</Label>
                                <p className="text-sm">{item.unit}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Actions</Label>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Allow user to edit this item
                                    updateItem(item.id, 'productName', item.productName);
                                  }}
                                >
                                  Edit
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 border rounded-md bg-gray-50">
                        <p className="text-sm text-gray-500">Select declarations below to populate items automatically</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Outbound Declaration Items</h3>
                    <div className="space-y-4">
                      <div className="space-y-4">
                        {items.map((item, index) => (
                          <div key={item.id} className="p-4 border rounded-md">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium">Item {index + 1}</h4>
                              {items.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-6 gap-4">
                              <div>
                                <Label htmlFor={`product-name-${item.id}`} className="flex items-center mb-2">
                                  Product Name <span className="text-red-500 ml-1">*</span>
                                </Label>
                                <Input
                                  id={`product-name-${item.id}`}
                                  placeholder="e.g. Palm Oil"
                                  value={item.productName}
                                  onChange={(e) => updateItem(item.id, 'productName', e.target.value)}
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor={`hsn-code-${item.id}`} className="flex items-center mb-2">
                                  HSN Code <span className="text-red-500 ml-1">*</span>
                                </Label>
                                <Input
                                  id={`hsn-code-${item.id}`}
                                  placeholder="e.g. 1511.10.00"
                                  value={item.hsnCode}
                                  onChange={(e) => updateItem(item.id, 'hsnCode', e.target.value)}
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor={`rm-id-${item.id}`} className="flex items-center mb-2">
                                  RM ID 
                                  <span className="ml-1 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10"></circle>
                                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                  </span>
                                </Label>
                                <Input
                                  id={`rm-id-${item.id}`}
                                  placeholder="e.g. RM12345"
                                  value={item.rmId || ''}
                                  onChange={(e) => updateItem(item.id, 'rmId', e.target.value)}
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor={`quantity-${item.id}`} className="flex items-center mb-2">
                                  Quantity <span className="text-red-500 ml-1">*</span>
                                </Label>
                                <Input
                                  id={`quantity-${item.id}`}
                                  type="text"
                                  placeholder="e.g. 5000"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    // Only allow numeric input with decimal point
                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                    updateItem(item.id, 'quantity', value);
                                  }}
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor={`unit-${item.id}`} className="mb-2">
                                  Unit
                                </Label>
                                <Select
                                  value={item.unit}
                                  onValueChange={(value) => updateItem(item.id, 'unit', value)}
                                >
                                  <SelectTrigger id={`unit-${item.id}`}>
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="ton">ton</SelectItem>
                                    <SelectItem value="liters">liters</SelectItem>
                                    <SelectItem value="m³">m³</SelectItem>
                                    <SelectItem value="pieces">pieces</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {declarationSource === "existing" && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Select Declaration</h3>
                    <div className="relative mb-4">
                      <Input 
                        type="text" 
                        placeholder="Search declarations..." 
                        className="pl-9"
                        value={declarationSearchTerm}
                        onChange={(e) => setDeclarationSearchTerm(e.target.value)}
                      />
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    </div>
                    
                    <div className="overflow-hidden rounded-md border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="py-3 px-4 text-left font-medium">Declaration Name</th>
                            <th className="py-3 px-4 text-left font-medium">Code</th>
                            <th className="py-3 px-4 text-left font-medium">Product</th>
                            <th className="py-3 px-4 text-left font-medium">Quantity</th>
                            <th className="py-3 px-4 text-left font-medium">EUDR Reference Number</th>
                            <th className="py-3 px-4 text-left font-medium">EUDR Verification Number</th>
                            <th className="py-3 px-4 text-left font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDeclarations.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-4 px-4 text-center text-gray-500">
                                No declarations found matching your search
                              </td>
                            </tr>
                          ) : (
                            filteredDeclarations.map((declaration) => (
                              <tr 
                                key={declaration.id}
                                className={cn(
                                  "border-b cursor-pointer hover:bg-gray-50",
                                  selectedDeclarationIds.includes(declaration.id) ? "bg-primary/5" : ""
                                )}
                                onClick={() => {
                                  if (selectedDeclarationIds.includes(declaration.id)) {
                                    // Remove if already selected
                                    setSelectedDeclarationIds(prev => prev.filter(id => id !== declaration.id));
                                  } else {
                                    // Add to selection if not already selected
                                    setSelectedDeclarationIds(prev => [...prev, declaration.id]);
                                  }
                                }}
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center">
                                    <Checkbox 
                                      id={`declaration-${declaration.id}`}
                                      checked={selectedDeclarationIds.includes(declaration.id)}
                                      className="mr-2"
                                      // Clicking the checkbox directly would cause event propagation issues
                                      // So we handle selection in the row click handler
                                      onCheckedChange={() => {}}
                                    />
                                    <label 
                                      htmlFor={`declaration-${declaration.id}`}
                                      className="cursor-pointer"
                                    >
                                      {declaration.name}
                                    </label>
                                  </div>
                                </td>
                                <td className="py-3 px-4">{declaration.code}</td>
                                <td className="py-3 px-4">{declaration.product}</td>
                                <td className="py-3 px-4">{declaration.quantity}</td>
                                <td className="py-3 px-4">{declaration.eudrReferenceNumber}</td>
                                <td className="py-3 px-4">{declaration.eudrVerificationNumber}</td>
                                <td className="py-3 px-4">
                                  <Badge className={
                                    declaration.status === "Approved" ? "bg-green-500" :
                                    declaration.status === "Pending" ? "bg-yellow-500" :
                                    declaration.status === "Rejected" ? "bg-red-500" :
                                    "bg-blue-500"
                                  }>
                                    {declaration.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {declarationSource === "fresh" && (
                    <Button
                      onClick={addItem}
                      variant="outline"
                      className="mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Step 3: Upload Data/Documents */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* GeoJSON Upload Section (Fresh Declarations Only) */}
              {declarationSource === "fresh" && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Upload GeoJSON for Traceability</h3>
                  <div className="border-2 border-dashed rounded-md p-6 text-center">
                    <div className="mb-4">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2">Drag and drop your GeoJSON file here, or click to browse</p>
                      <p className="text-sm text-gray-500 mt-1">
                        The GeoJSON file should contain polygons representing the sourcing areas
                      </p>
                    </div>
                    <Button 
                      onClick={handleGeoJSONUpload}
                      disabled={hasUploadedGeoJSON && isValidating}
                    >
                      {hasUploadedGeoJSON ? 
                        isValidating ? 
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                            Validating...
                          </> 
                          : "Replace File" 
                        : "Upload File"
                      }
                    </Button>
                  </div>
                  
                  {hasUploadedGeoJSON && (
                    <div className="mt-4 p-4 border rounded-md">
                      <h4 className="font-medium mb-2">Validation Results</h4>
                      
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <div className="w-32 text-sm">Geometry Check:</div>
                          <div className="flex items-center">
                            {isValidating ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin text-gray-500" />
                            ) : geometryValid === null ? (
                              <div className="h-4 w-4 rounded-full bg-gray-300 mr-2" />
                            ) : geometryValid ? (
                              <div className="h-4 w-4 rounded-full bg-green-500 mr-2" />
                            ) : (
                              <div className="h-4 w-4 rounded-full bg-red-500 mr-2" />
                            )}
                            
                            <span className="text-sm">
                              {isValidating ? (
                                "Checking geometry..."
                              ) : geometryValid === null ? (
                                "Pending"
                              ) : geometryValid ? (
                                "Valid"
                              ) : (
                                "Invalid - Contains non-compliant geometry"
                              )}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="w-32 text-sm">Satellite Check:</div>
                          <div className="flex items-center">
                            {isValidating || geometryValid === false ? (
                              geometryValid === false ? (
                                <div className="h-4 w-4 rounded-full bg-gray-300 mr-2" />
                              ) : (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin text-gray-500" />
                              )
                            ) : satelliteValid === null ? (
                              <div className="h-4 w-4 rounded-full bg-gray-300 mr-2" />
                            ) : satelliteValid ? (
                              <div className="h-4 w-4 rounded-full bg-green-500 mr-2" />
                            ) : (
                              <div className="h-4 w-4 rounded-full bg-red-500 mr-2" />
                            )}
                            
                            <span className="text-sm">
                              {isValidating ? (
                                geometryValid === false ? (
                                  "Skipped due to geometry validation failure"
                                ) : (
                                  "Checking satellite imagery..."
                                )
                              ) : satelliteValid === null ? (
                                "Pending"
                              ) : satelliteValid ? (
                                "No deforestation detected"
                              ) : (
                                "Warning - Potential deforestation detected"
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Satellite Imagery Preview (only show if geometry is valid) */}
                      {geometryValid && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Satellite Imagery Preview:</p>
                          <div className="relative h-48 bg-gray-100 rounded overflow-hidden">
                            <img 
                              src={satelliteMapImage} 
                              alt="Satellite imagery" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <p className="text-white">Preview (placeholder image)</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Documents Upload Section */}
              <div>
                <h3 className="text-lg font-medium mb-4">Upload Supporting Documents</h3>
                <div className="border-2 border-dashed rounded-md p-6 text-center">
                  <div className="mb-4">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Drag and drop your files here, or click to browse</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Upload any relevant documents such as invoices, certificates, etc.
                    </p>
                  </div>
                  <Button onClick={handleDocumentUpload}>
                    Upload File
                  </Button>
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Uploaded Files:</h4>
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                          <span>{file}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeFile(file)}
                          >
                            <X className="h-4 w-4 text-gray-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Step 4: Additional Data */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Customer Selection */}
              <div>
                <h3 className="text-lg font-medium mb-4">Select Customer</h3>
                
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md mb-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                        <User className="h-6 w-6" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">{selectedCustomer.name}</p>
                        <p className="text-sm text-gray-500">
                          {selectedCustomer.company && `${selectedCustomer.company}, `}
                          {selectedCustomer.country}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedCustomer(null)}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-4">
                      <Input 
                        type="text" 
                        placeholder="Search customers..." 
                        className="pl-9"
                        value={customerSearchTerm}
                        onChange={(e) => {
                          setCustomerSearchTerm(e.target.value);
                          if (e.target.value.length > 0) {
                            setShowCustomerResults(true);
                          } else {
                            setShowCustomerResults(false);
                          }
                        }}
                        onFocus={() => {
                          if (customerSearchTerm.length > 0) {
                            setShowCustomerResults(true);
                          }
                        }}
                      />
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    </div>
                    
                    {showCustomerResults && (
                      <div className="border rounded-md overflow-hidden mb-4">
                        {isLoadingCustomers ? (
                          <div className="p-4 text-center">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
                            <p className="text-sm text-gray-500 mt-2">Loading customers...</p>
                          </div>
                        ) : filteredCustomers.length === 0 ? (
                          <div className="p-4 text-center">
                            <p className="text-sm text-gray-500">No customers found matching your search</p>
                            <Button 
                              variant="link" 
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                // In a real application, this would open a form to add a new customer
                                toast({
                                  title: "Feature not implemented",
                                  description: "Adding new customers is not implemented in this demo",
                                  variant: "default",
                                });
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Add New Customer
                            </Button>
                          </div>
                        ) : (
                          <div className="max-h-64 overflow-y-auto">
                            {filteredCustomers.map((customer) => (
                              <div 
                                key={customer.id}
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0 flex items-center justify-between"
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setShowCustomerResults(false);
                                  setCustomerSearchTerm("");
                                }}
                              >
                                <div>
                                  <p className="font-medium">{customer.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {customer.company && `${customer.company}, `}
                                    {customer.country}
                                  </p>
                                </div>
                                
                                {customer.complianceScore !== undefined && (
                                  <Badge className={
                                    customer.complianceScore >= 80 ? "bg-green-500" :
                                    customer.complianceScore >= 60 ? "bg-yellow-500" :
                                    "bg-red-500"
                                  }>
                                    {customer.complianceScore}% Compliance
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <Button 
                      variant="secondary" 
                      onClick={() => setShowCustomerResults(prev => !prev)}
                    >
                      {showCustomerResults ? "Hide Results" : "Browse All Customers"}
                    </Button>
                  </>
                )}
              </div>
              
              {/* Reference Numbers */}
              <div>
                <h3 className="text-lg font-medium mb-4">Reference Numbers</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="customer-po" className="mb-2">Customer PO Number</Label>
                    <Input
                      id="customer-po"
                      placeholder="e.g. PO-12345"
                      value={customerPONumber}
                      onChange={(e) => setCustomerPONumber(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="so-number" className="mb-2">Sales Order Number</Label>
                    <Input
                      id="so-number"
                      placeholder="e.g. SO-67890"
                      value={soNumber}
                      onChange={(e) => setSONumber(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="shipment-number" className="mb-2">Shipment Number</Label>
                    <Input
                      id="shipment-number"
                      placeholder="e.g. SHIP-54321"
                      value={shipmentNumber}
                      onChange={(e) => setShipmentNumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Review Declaration Details</h3>
                <div className="space-y-4">
                  {/* Source Type */}
                  <div className="p-4 bg-gray-50 rounded-md">
                    <h4 className="text-sm font-medium text-gray-500">Declaration Source</h4>
                    <p>{declarationSource === "existing" ? "Based on Approved Declaration" : "New Declaration"}</p>
                  </div>
                  
                  {/* Validity Period */}
                  <div className="p-4 bg-gray-50 rounded-md">
                    <h4 className="text-sm font-medium text-gray-500">Validity Period</h4>
                    <p>
                      {startDate && endDate ? (
                        `${format(startDate, "PPP")} - ${format(endDate, "PPP")}`
                      ) : (
                        "Not specified"
                      )}
                    </p>
                  </div>
                  
                  {/* Items */}
                  <div className="p-4 bg-gray-50 rounded-md">
                    <h4 className="text-sm font-medium text-gray-500">Items</h4>
                    <div className="mt-2">
                      {items.map((item, index) => (
                        <div key={item.id} className="border-b py-2 last:border-0 last:pb-0">
                          <p className="font-medium">{index + 1}. {item.productName || "Unnamed Product"}</p>
                          <div className="text-sm text-gray-600 mt-1">
                            {item.hsnCode && <span className="mr-3">HSN: {item.hsnCode}</span>}
                            {item.rmId && <span className="mr-3">RM ID: {item.rmId}</span>}
                            {item.quantity && <span>{item.quantity} {item.unit}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Selected Customer */}
                  <div className="p-4 bg-gray-50 rounded-md">
                    <h4 className="text-sm font-medium text-gray-500">Customer</h4>
                    {selectedCustomer ? (
                      <div className="flex items-center mt-2">
                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="ml-2">
                          <p>{selectedCustomer.name}</p>
                          <p className="text-sm text-gray-500">
                            {selectedCustomer.company && `${selectedCustomer.company}, `}
                            {selectedCustomer.country}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-red-500">No customer selected</p>
                    )}
                  </div>
                  
                  {/* Reference Numbers */}
                  <div className="p-4 bg-gray-50 rounded-md">
                    <h4 className="text-sm font-medium text-gray-500">Reference Numbers</h4>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div>
                        <p className="text-xs text-gray-500">Customer PO Number</p>
                        <p>{customerPONumber || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Sales Order Number</p>
                        <p>{soNumber || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Shipment Number</p>
                        <p>{shipmentNumber || "Not specified"}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional Comments */}
                  <div>
                    <Label htmlFor="comments" className="mb-2">Additional Comments</Label>
                    <Textarea
                      id="comments"
                      placeholder="Add any additional notes or comments about this declaration..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="pt-4 flex items-center justify-between">
          {currentStep > 1 && (
            <Button type="button" variant="outline" onClick={goToPreviousStep}>
              Back
            </Button>
          )}
          <div className="flex items-center gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {currentStep < 5 ? (
              <Button type="button" onClick={goToNextStep}>
                Continue
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={submitDeclaration}
                disabled={createDeclaration.isPending}
              >
                {createDeclaration.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Declaration"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}