import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Stepper from "@/components/ui/stepper";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Plus, Search, Trash2, Upload, User, X, UserPlus } from "lucide-react";
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
import DeclarationItemsTable, { DeclarationItem } from "./declaration-items-table";
import OutboundItemsSection from "./outbound-items-section";
import EvidenceDocumentUploader, { EvidenceDocument } from "./evidence-document-uploader";
import GeoJSONValidationModal from "./geojson-validation-modal";
import { ProductSearchCombobox } from "@/components/ui/product-search-combobox";

type DeclarationSourceType = "existing" | "fresh";

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
  
  // State for fresh declaration details
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

  // Debug: Log items state changes
  useEffect(() => {
    console.log("Items state changed:", items);
  }, [items]);
  
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
  const [showValidationModal, setShowValidationModal] = useState(false);

  
  // Evidence documents state
  const [evidenceDocuments, setEvidenceDocuments] = useState<EvidenceDocument[]>([]);
  
  // Customer selection and additional data state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [customerPONumber, setCustomerPONumber] = useState("");
  const [soNumber, setSONumber] = useState("");
  const [shipmentNumber, setShipmentNumber] = useState("");
  
  // Comments state for review
  const [comments, setComments] = useState("");
  
  // File input refs for proper file browser integration
  const geoJsonFileInputRef = useRef<HTMLInputElement>(null);
  const documentsFileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced validation helper functions
  const isValidField = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    const stringValue = String(value).trim();
    return stringValue !== "" && stringValue !== "0" && stringValue !== "null" && stringValue !== "undefined";
  };

  const isValidQuantity = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    // Handle both string and number types
    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
    return !isNaN(numValue) && numValue > 0;
  };

  const validateItems = (itemsToValidate: any[]): { isValid: boolean; debugInfo: any[] } => {
    // Filter out empty items and items that are clearly incomplete
    const validatableItems = itemsToValidate.filter(item => 
      item && (item.productName || item.hsnCode || item.quantity)
    );

    const debugInfo = validatableItems.map(item => ({
      id: item.id,
      productName: item.productName,
      hsnCode: item.hsnCode,
      quantity: item.quantity,
      quantityType: typeof item.quantity,
      hasProductName: isValidField(item.productName),
      hasHsnCode: isValidField(item.hsnCode),
      hasQuantity: isValidField(item.quantity),
      isValidQuantity: isValidQuantity(item.quantity),
      allFieldsValid: isValidField(item.productName) && isValidField(item.hsnCode) && isValidField(item.quantity) && isValidQuantity(item.quantity)
    }));

    // Check if at least one item has all required fields
    const isValid = validatableItems.some(item => {
      const hasProductName = isValidField(item.productName);
      const hasHsnCode = isValidField(item.hsnCode);
      const hasQuantity = isValidField(item.quantity) && isValidQuantity(item.quantity);
      
      return hasProductName && hasHsnCode && hasQuantity;
    });

    return { isValid, debugInfo };
  };

  // Enhanced validation with async state handling
  const validateCurrentStepWithDelay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Small delay to allow state updates to complete
      setTimeout(() => {
        resolve(validateCurrentStep());
      }, 100);
    });
  };
  
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
  
  // Query to get available inbound declarations (would be replaced with actual API call)
  const { data: declarations = [] } = useQuery<any[]>({
    queryKey: ['/api/declarations'],
    select: (data: any) => {
      if (!data) return [];
      return data.filter((d: any) => d.status === 'approved' && d.type === 'inbound');
    }
  });
  
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
      productCode: "",
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
    console.log("updateItem called:", { id, field, value, currentItemsLength: items.length });
    
    setItems(prevItems => {
      const newItems = prevItems.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      );
      console.log("Items after update:", newItems);
      console.log("Updated item:", newItems.find(item => item.id === id));
      return newItems;
    });
  };

  // Handle GeoJSON upload and validation
  const handleGeoJSONUpload = () => {
    if (geoJsonFileInputRef.current) {
      geoJsonFileInputRef.current.click();
    }
  };

  // Handle GeoJSON file selection
  const handleGeoJSONFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.geojson') && !file.name.toLowerCase().endsWith('.json')) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid GeoJSON file (.geojson or .json)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "GeoJSON file must be smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setHasUploadedGeoJSON(true);
    setIsValidating(true);
    setGeometryValid(null);
    setSatelliteValid(null);
    
    toast({
      title: "GeoJSON uploaded",
      description: `${file.name} uploaded successfully. Validating...`,
      variant: "default",
    });
    
    // Simulate geometry validation check - always passes for outbound declarations
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
        
      case 2: // Select Inbound Declaration or Fresh Declaration Details
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
        const uploadedDocuments = evidenceDocuments.filter(doc => doc.uploaded);
        if (uploadedDocuments.length === 0) {
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
      payload = {
        type: "outbound",
        basedOnDeclarationIds: selectedDeclarationIds,
        customerId: selectedCustomer?.id || null,
        customerPONumber: customerPONumber.trim() || null,
        soNumber: soNumber.trim() || null,
        shipmentNumber: shipmentNumber.trim() || null,
        documents: evidenceDocuments.filter(doc => doc.uploaded).map(doc => doc.fileName || 'Uploaded document'),
        comments: comments.trim() || null,
        status: "pending"
      };
    } else {
      // Debug: Log current items state with detailed analysis
      console.log("=== SUBMISSION DEBUG START ===");
      console.log("Current items state before filtering:", items);
      console.log("Items array length:", items.length);
      
      items.forEach((item, index) => {
        console.log(`Item ${index}:`, {
          id: item.id,
          productName: item.productName,
          productNameLength: item.productName?.length || 0,
          productNameTrimmed: item.productName?.trim(),
          hsnCode: item.hsnCode,
          quantity: item.quantity,
          isProductSelected: item.isProductSelected
        });
      });
      
      // Prepare payload for fresh declaration - include all items with at least a product name
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
      
      console.log("Formatted items after filtering:", formattedItems);
      console.log("Number of valid items found:", formattedItems.length);
      
      // Get the first product name as the primary name for the declaration
      const firstProduct = formattedItems[0]?.productName || "Unnamed Product";
      console.log("First product selected:", firstProduct);
      console.log("=== SUBMISSION DEBUG END ===");
      
      // Create a simplified payload with only required fields to match server expectations
      payload = {
        type: "outbound",
        supplierId: 1, // Always use default supplier ID for outbound declarations
        customerId: selectedCustomer?.id || null, // Include customerId for outbound declarations
        productName: firstProduct,
        productDescription: "", // Removed scientificName reference
        hsnCode: formattedItems[0]?.hsnCode || "",
        quantity: Number(formattedItems[0]?.quantity) || 0,
        unit: formattedItems[0]?.unit || "kg",
        status: status,
        riskLevel: "medium",
        industry: firstProduct // Use the product name as the industry value for the table display
      };
    }
    
    createDeclaration.mutate(payload);
  };

  // Reset form state when wizard is closed
  const resetForm = () => {
    setCurrentStep(1);
    setCompletedSteps([]);
    setDeclarationSource("existing");
    setItems([
      {
        id: "item-1",
        hsnCode: "",
        productName: "",
        quantity: "",
        unit: "kg",
        rmId: "",
        skuCode: ""
      }
    ]);
    setSelectedDeclarationIds([]);
    setDeclarationSearchTerm("");
    setShowDeclarationsList(false);
    setEvidenceDocuments([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setValidityPeriod("custom");
    setShowCustomDates(true);
    setSelectedCustomer(null);
    setCustomerSearchTerm("");
    setShowCustomerResults(false);
    setCustomerPONumber("");
    setSONumber("");
    setShipmentNumber("");
    setHasUploadedGeoJSON(false);
    setGeometryValid(null);
    setSatelliteValid(null);
    setIsValidating(false);
    setShowValidationModal(false);
    setComments("");
  };

  // Handle dialog close
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  // Filter existing declarations based on search term
  const filteredDeclarations = existingDeclarations.filter(declaration => 
    declaration.name.toLowerCase().includes(declarationSearchTerm.toLowerCase()) ||
    declaration.code.toLowerCase().includes(declarationSearchTerm.toLowerCase()) ||
    declaration.product.toLowerCase().includes(declarationSearchTerm.toLowerCase())
  );

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  // Get step labels
  const stepLabels = [
    "Declaration Type", 
    declarationSource === "existing" ? "Select Inbound Declaration" : "Declaration Details", 
    "Upload Data", 
    "Additional Data",
    "Review"
  ];

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Outbound Declaration</DialogTitle>
          <DialogDescription>
            Create an outbound declaration to your customers with compliance documentation.
          </DialogDescription>
        </DialogHeader>

        {/* Hidden file inputs */}
        <input
          type="file"
          ref={geoJsonFileInputRef}
          onChange={handleGeoJSONFileChange}
          accept=".geojson,.json"
          style={{ display: 'none' }}
        />
        <input
          type="file"
          ref={documentsFileInputRef}
          onChange={(e) => {
            // Handle document file selection if needed
            const files = Array.from(e.target.files || []);
            console.log("Selected documents:", files);
          }}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt,.geojson,.json"
          multiple
          style={{ display: 'none' }}
        />
        
        <div className="mb-8">
          <Stepper 
            steps={stepLabels}
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </div>
        
        <div className="py-4">
          {/* Step 1: Declaration Type (Based on Existing or Create Fresh) */}
          {currentStep === 1 && (
            <div>
              <h3 className="text-lg font-medium mb-6">Select Declaration Type</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                  className={cn(
                    "p-6 border rounded-lg cursor-pointer transition-all",
                    declarationSource === "existing" 
                      ? "border-primary bg-primary/5" 
                      : "hover:border-gray-400"
                  )}
                  onClick={() => setDeclarationSource("existing")}
                >
                  <div className="flex items-center mb-4">
                    <div className="h-10 w-10 bg-primary/10 rounded-md flex items-center justify-center text-primary">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-medium">Based on Existing Declaration</h4>
                      <p className="text-sm text-gray-500">Use approved inbound declarations as reference</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className={cn(
                    "p-6 border rounded-lg cursor-pointer transition-all",
                    declarationSource === "fresh" 
                      ? "border-primary bg-primary/5" 
                      : "hover:border-gray-400"
                  )}
                  onClick={() => setDeclarationSource("fresh")}
                >
                  <div className="flex items-center mb-4">
                    <div className="h-10 w-10 bg-primary/10 rounded-md flex items-center justify-center text-primary">
                      <Plus className="h-5 w-5" />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-medium">Create Fresh Declaration</h4>
                      <p className="text-sm text-gray-500">Start a new declaration from scratch</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Select Inbound Declaration (for Based on Existing) or Declaration Details (for Fresh) */}
          {currentStep === 2 && (
            <div>
              {declarationSource === "existing" ? (
                /* Create outbound declaration from existing inbound declarations */
                <div>
                  {/* Declaration Validity Period - FIRST */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Declaration Validity Period</h3>
                    
                    {/* Period options */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      <Button 
                        className={`px-4 py-2 rounded-lg font-medium ${
                          validityPeriod === "na" 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        }`}
                        onClick={() => {
                          setValidityPeriod("na");
                          setShowCustomDates(false);
                          setStartDate(undefined);
                          setEndDate(undefined);
                        }}
                      >
                        NA
                      </Button>
                      <Button 
                        className={`px-4 py-2 rounded-lg font-medium ${
                          validityPeriod === "30days" 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        }`}
                        onClick={() => {
                          setValidityPeriod("30days");
                          setShowCustomDates(false);
                          const today = new Date();
                          setStartDate(today);
                          const thirtyDaysLater = new Date(today);
                          thirtyDaysLater.setDate(today.getDate() + 30);
                          setEndDate(thirtyDaysLater);
                        }}
                      >
                        30 days
                      </Button>
                      <Button 
                        className={`px-4 py-2 rounded-lg font-medium ${
                          validityPeriod === "6months" 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        }`}
                        onClick={() => {
                          setValidityPeriod("6months");
                          setShowCustomDates(false);
                          const today = new Date();
                          setStartDate(today);
                          const sixMonthsLater = new Date(today);
                          sixMonthsLater.setMonth(today.getMonth() + 6);
                          setEndDate(sixMonthsLater);
                        }}
                      >
                        6 months
                      </Button>
                      <Button 
                        className={`px-4 py-2 rounded-lg font-medium ${
                          validityPeriod === "9months" 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        }`}
                        onClick={() => {
                          setValidityPeriod("9months");
                          setShowCustomDates(false);
                          const today = new Date();
                          setStartDate(today);
                          const nineMonthsLater = new Date(today);
                          nineMonthsLater.setMonth(today.getMonth() + 9);
                          setEndDate(nineMonthsLater);
                        }}
                      >
                        9 months
                      </Button>
                      <Button 
                        className={`px-4 py-2 rounded-lg font-medium ${
                          validityPeriod === "1year" 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        }`}
                        onClick={() => {
                          setValidityPeriod("1year");
                          setShowCustomDates(false);
                          const today = new Date();
                          setStartDate(today);
                          const oneYearLater = new Date(today);
                          oneYearLater.setFullYear(today.getFullYear() + 1);
                          setEndDate(oneYearLater);
                        }}
                      >
                        1 year
                      </Button>
                      <Button 
                        className={`px-4 py-2 rounded-lg font-medium ${
                          validityPeriod === "custom" 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        }`}
                        onClick={() => {
                          setValidityPeriod("custom");
                          setShowCustomDates(true);
                        }}
                      >
                        Custom
                      </Button>
                    </div>
                    
                    {/* Selected period display */}
                    {(startDate && endDate) && (
                      <div className="bg-gray-50 p-3 rounded-md mb-4">
                        <p className="text-sm font-medium mb-1">Selected period:</p>
                        <p className="text-sm text-gray-700">
                          {format(startDate, "MMM d, yyyy")} to {format(endDate, "MMM d, yyyy")}
                        </p>
                      </div>
                    )}
                    
                    {/* Custom date selector */}
                    {showCustomDates && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start-date">Start Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="start-date"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal mt-1",
                                  !startDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, "PPP") : "Select start date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={startDate}
                                onSelect={(date) => {
                                  setStartDate(date);
                                  // If end date is before start date, clear end date
                                  if (endDate && date && endDate < date) {
                                    setEndDate(undefined);
                                  }
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label htmlFor="end-date">End Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="end-date"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal mt-1",
                                  !endDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? format(endDate, "PPP") : "Select end date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
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
                  
                  {/* Declaration Items - SECOND */}
                  <OutboundItemsSection
                    items={items}
                    updateItem={updateItem}
                    removeItem={removeItem}
                    addItem={addItem}
                  />

                  {/* Select Inbound Declaration - THIRD */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Select Inbound Declaration</h3>
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
                                      className="mr-2" 
                                      checked={selectedDeclarationIds.includes(declaration.id)} 
                                      onCheckedChange={(checked: boolean) => {
                                        if (checked) {
                                          setSelectedDeclarationIds(prev => [...prev, declaration.id]);
                                        } else {
                                          setSelectedDeclarationIds(prev => prev.filter(id => id !== declaration.id));
                                        }
                                      }}
                                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                    />
                                    {declaration.name}
                                  </div>
                                </td>
                                <td className="py-3 px-4">{declaration.code}</td>
                                <td className="py-3 px-4">{declaration.product}</td>
                                <td className="py-3 px-4">{declaration.quantity}</td>
                                <td className="py-3 px-4">{declaration.eudrReferenceNumber}</td>
                                <td className="py-3 px-4">{declaration.eudrVerificationNumber}</td>
                                <td className="py-3 px-4">
                                  <Badge className="bg-green-500">{declaration.status}</Badge>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* Fresh declaration details */
                <div>
                  {/* Declaration Validity Period */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Declaration Validity Period</h3>
                    
                    {/* Period options */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      <Button 
                        className={`px-4 py-2 rounded-lg font-medium ${
                          validityPeriod === "na" 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        }`}
                        onClick={() => {
                          setValidityPeriod("na");
                          setShowCustomDates(false);
                          setStartDate(undefined);
                          setEndDate(undefined);
                        }}
                      >
                        NA
                      </Button>
                      <Button 
                        className={`px-4 py-2 rounded-lg font-medium ${
                          validityPeriod === "30days" 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        }`}
                        onClick={() => {
                          setValidityPeriod("30days");
                          setShowCustomDates(false);
                          const today = new Date();
                          setStartDate(today);
                          const thirtyDaysLater = new Date(today);
                          thirtyDaysLater.setDate(today.getDate() + 30);
                          setEndDate(thirtyDaysLater);
                        }}
                      >
                        30 days
                      </Button>
                      <Button 
                        className={`px-4 py-2 rounded-lg font-medium ${
                          validityPeriod === "6months" 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        }`}
                        onClick={() => {
                          setValidityPeriod("6months");
                          setShowCustomDates(false);
                          const today = new Date();
                          setStartDate(today);
                          const sixMonthsLater = new Date(today);
                          sixMonthsLater.setMonth(today.getMonth() + 6);
                          setEndDate(sixMonthsLater);
                        }}
                      >
                        6 months
                      </Button>
                      <Button 
                        className={`px-4 py-2 rounded-lg font-medium ${
                          validityPeriod === "9months" 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        }`}
                        onClick={() => {
                          setValidityPeriod("9months");
                          setShowCustomDates(false);
                          const today = new Date();
                          setStartDate(today);
                          const nineMonthsLater = new Date(today);
                          nineMonthsLater.setMonth(today.getMonth() + 9);
                          setEndDate(nineMonthsLater);
                        }}
                      >
                        9 months
                      </Button>
                      <Button 
                        className={`px-4 py-2 rounded-lg font-medium ${
                          validityPeriod === "1year" 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        }`}
                        onClick={() => {
                          setValidityPeriod("1year");
                          setShowCustomDates(false);
                          const today = new Date();
                          setStartDate(today);
                          const oneYearLater = new Date(today);
                          oneYearLater.setFullYear(today.getFullYear() + 1);
                          setEndDate(oneYearLater);
                        }}
                      >
                        1 year
                      </Button>
                      <Button 
                        className={`px-4 py-2 rounded-lg font-medium ${
                          validityPeriod === "custom" 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        }`}
                        onClick={() => {
                          setValidityPeriod("custom");
                          setShowCustomDates(true);
                        }}
                      >
                        Custom
                      </Button>
                    </div>
                    
                    {/* Selected period display */}
                    {(startDate && endDate) && (
                      <div className="bg-gray-50 p-3 rounded-md mb-4">
                        <p className="text-sm font-medium mb-1">Selected period:</p>
                        <p className="text-sm text-gray-700">
                          {format(startDate, "MMM d, yyyy")} to {format(endDate, "MMM d, yyyy")}
                        </p>
                      </div>
                    )}
                    
                    {/* Custom date selector */}
                    {showCustomDates && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start-date">Start Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="start-date"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal mt-1",
                                  !startDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, "PPP") : "Select start date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={startDate}
                                onSelect={(date) => {
                                  setStartDate(date);
                                  // If end date is before start date, clear end date
                                  if (endDate && date && endDate < date) {
                                    setEndDate(undefined);
                                  }
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div>
                          <Label htmlFor="end-date">End Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="end-date"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal mt-1",
                                  !endDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? format(endDate, "PPP") : "Select end date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={endDate}
                                onSelect={setEndDate}
                                fromDate={startDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Declaration Items */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Outbound Declaration Items</h3>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border border-gray-300 text-gray-700 hover:bg-gray-50"
                          onClick={() => {
                            // Import items functionality
                            document.getElementById('importOutboundItemsFile')?.click();
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Import Items
                        </Button>
                        <input 
                          type="file" 
                          id="importOutboundItemsFile" 
                          accept=".csv,.xlsx,.xls" 
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.length) {
                              toast({
                                title: "File selected",
                                description: `${e.target.files[0].name} will be processed`,
                              });
                              // Actual import logic would go here
                            }
                          }}
                        />
                        
                        <Button 
                          className="bg-blue-600 text-white hover:bg-blue-700"
                          size="sm"
                          onClick={() => addItem()}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                    </div>
                    
                    <DeclarationItemsTable items={items} updateItem={updateItem} />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Step 3: Upload Data (GeoJSON for fresh declarations, documents for both) */}
          {currentStep === 3 && (
            <div>
              {/* For fresh declarations, show GeoJSON upload */}
              {declarationSource === "fresh" && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-4">GeoJSON Upload</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Please upload a GeoJSON file containing the geographical data associated with this declaration.
                  </p>
                  
                  <div 
                    className={cn(
                      "border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:bg-gray-50",
                      hasUploadedGeoJSON ? 
                        (geometryValid === false || satelliteValid === false) 
                          ? "border-red-300 bg-red-50" 
                          : "border-green-300 bg-green-50" 
                        : "border-gray-300"
                    )}
                    onClick={!hasUploadedGeoJSON ? handleGeoJSONUpload : undefined}
                    style={{ cursor: hasUploadedGeoJSON ? 'default' : 'pointer' }}
                  >
                    <div className="mx-auto flex justify-center">
                      <Upload className={cn(
                        "h-12 w-12",
                        hasUploadedGeoJSON ? 
                          (geometryValid === false || satelliteValid === false) 
                            ? "text-red-500" 
                            : "text-green-500" 
                          : "text-gray-400"
                      )} />
                    </div>
                    <p className="mt-4 text-sm text-gray-600">
                      {hasUploadedGeoJSON ? 
                        (isValidating ? "Validating GeoJSON file..." : "GeoJSON file uploaded successfully") : 
                        "Drag and drop your GeoJSON file here, or click to browse"}
                    </p>
                    {!hasUploadedGeoJSON && (
                      <Button 
                        variant="secondary" 
                        className="mt-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGeoJSONUpload();
                        }}
                      >
                        Browse Files
                      </Button>
                    )}
                    
                    {/* Validation status indicators */}
                    {hasUploadedGeoJSON && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-sm font-medium">Geometry Check:</span>
                          {isValidating ? (
                            <span className="text-sm text-amber-500">Checking...</span>
                          ) : geometryValid === true ? (
                            <div className="flex items-center space-x-1">
                              <span className="text-sm text-green-600">Compliant</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="p-0 h-6 text-green-600 hover:text-green-800 hover:bg-transparent"
                                onClick={() => setShowValidationModal(true)}
                              >
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  width="16" 
                                  height="16" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="2" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  className="ml-1"
                                >
                                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </Button>
                            </div>
                          ) : geometryValid === false ? (
                            <div className="flex items-center space-x-1">
                              <span className="text-sm text-red-600">Non-Compliant</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="p-0 h-6 text-red-600 hover:text-red-800 hover:bg-transparent"
                                onClick={() => setShowValidationModal(true)}
                              >
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  width="16" 
                                  height="16" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="2" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  className="ml-1"
                                >
                                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Pending</span>
                          )}
                        </div>
                        
                        {/* Only show satellite check if geometry check passed */}
                        {geometryValid === true && (
                          <div className="flex items-center justify-center space-x-2">
                            <span className="text-sm font-medium">Satellite Check:</span>
                            {isValidating ? (
                              <span className="text-sm text-amber-500">Checking...</span>
                            ) : satelliteValid === true ? (
                              <div className="flex items-center space-x-1">
                                <span className="text-sm text-green-600">Compliant</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="p-0 h-6 text-green-600 hover:text-green-800 hover:bg-transparent"
                                  onClick={() => setShowValidationModal(true)}
                                >
                                  <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="16" 
                                    height="16" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    className="ml-1"
                                  >
                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                </Button>
                              </div>
                            ) : satelliteValid === false ? (
                              <div className="flex items-center space-x-1">
                                <span className="text-sm text-red-600">Non-Compliant</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="p-0 h-6 text-red-600 hover:text-red-800 hover:bg-transparent"
                                  onClick={() => setShowValidationModal(true)}
                                >
                                  <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="16" 
                                    height="16" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    className="ml-1"
                                  >
                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Pending</span>
                            )}
                          </div>
                        )}
                        
                        {/* Warning message for failed validations */}
                        {geometryValid === false && (
                          <div className="mt-2 px-4 py-2 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">
                              Geometry validation failed. Please notify the supplier.
                            </p>
                            <p className="text-sm text-red-600 mt-1">
                              The declaration can only be saved as draft and cannot be submitted.
                            </p>
                          </div>
                        )}
                        
                        {geometryValid === true && satelliteValid === false && (
                          <div className="mt-2 px-4 py-2 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">
                              Satellite check detected potential deforestation. Please notify the supplier.
                            </p>
                            <p className="text-sm text-red-600 mt-1">
                              The declaration can only be saved as draft and cannot be submitted.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Evidence document upload section */}
              <EvidenceDocumentUploader 
                documents={evidenceDocuments}
                onDocumentsChange={setEvidenceDocuments}
              />
            </div>
          )}
          
          {/* Step 4: Additional Data */}
          {currentStep === 4 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Additional Data</h3>
              
              {/* Customer Selection */}
              <div className="mb-6">
                <h4 className="text-base font-medium mb-3">Customer Selection</h4>
                <div className="relative mb-4">
                  <Input 
                    type="text" 
                    placeholder="Search for a customer..." 
                    className="pl-9"
                    value={customerSearchTerm}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      if (e.target.value) {
                        setShowCustomerResults(true);
                      }
                    }}
                    onFocus={() => setShowCustomerResults(true)}
                  />
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                </div>
                
                {showCustomerResults && customerSearchTerm && (
                  <div className="border rounded-md overflow-hidden mb-4 shadow-sm">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No customers found. Try a different search term.
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        {filteredCustomers.map((customer) => (
                          <div 
                            key={customer.id}
                            className="p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowCustomerResults(false);
                              setCustomerSearchTerm('');
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{customer.name}</div>
                                <div className="text-sm text-gray-500">{customer.company} - {customer.type}</div>
                                <div className="text-xs text-gray-400 mt-1">{customer.country} • Reg: {customer.registrationNumber}</div>
                              </div>
                              {customer.complianceScore !== undefined && (
                                <div className={cn(
                                  "text-xs font-medium rounded-full px-2 py-1",
                                  customer.complianceScore >= 90 ? "bg-green-100 text-green-800" :
                                  customer.complianceScore >= 80 ? "bg-yellow-100 text-yellow-800" :
                                  "bg-red-100 text-red-800"
                                )}>
                                  {customer.complianceScore}% Compliant
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {selectedCustomer && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Selected Customer</h4>
                    <div className="p-4 border rounded-lg bg-primary/5 border-primary">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-medium text-lg">{selectedCustomer.name}</div>
                          <div className="text-sm text-gray-500">{selectedCustomer.company} - {selectedCustomer.type}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {selectedCustomer.complianceScore !== undefined && (
                            <div className={cn(
                              "text-xs font-medium rounded-full px-2 py-1",
                              selectedCustomer.complianceScore >= 90 ? "bg-green-100 text-green-800" :
                              selectedCustomer.complianceScore >= 80 ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                            )}>
                              {selectedCustomer.complianceScore}% Compliant
                            </div>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => setSelectedCustomer(null)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <span className="text-gray-500">Country:</span> {selectedCustomer.country}
                        </div>
                        <div>
                          <span className="text-gray-500">Registration:</span> {selectedCustomer.registrationNumber}
                        </div>
                        <div>
                          <span className="text-gray-500">Contact:</span> {selectedCustomer.contactPerson}
                        </div>
                        <div>
                          <span className="text-gray-500">Email:</span> {selectedCustomer.contactEmail}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {!selectedCustomer && (
                  <div className="flex items-center justify-center p-6 border border-dashed rounded-lg mb-6">
                    <div className="text-center text-gray-500">
                      <UserPlus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>Please select a customer to continue</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Reference Numbers */}
              <div className="mb-6">
                <h4 className="text-base font-medium mb-3">Reference Numbers</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="customer-po-number">Customer PO Number</Label>
                    <Input 
                      id="customer-po-number" 
                      placeholder="Enter PO number"
                      value={customerPONumber}
                      onChange={(e) => setCustomerPONumber(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="so-number">SO Number</Label>
                    <Input 
                      id="so-number" 
                      placeholder="Enter SO number"
                      value={soNumber}
                      onChange={(e) => setSONumber(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="shipment-number">Shipment Number</Label>
                    <Input 
                      id="shipment-number" 
                      placeholder="Enter shipment number"
                      value={shipmentNumber}
                      onChange={(e) => setShipmentNumber(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div>
              <h3 className="text-lg font-medium mb-6">Review Declaration</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Declaration Type</h4>
                    <p className="mt-1">Outbound</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Declaration Source</h4>
                    <p className="mt-1">{declarationSource === "existing" ? "Based on Existing Declaration" : "Fresh Declaration"}</p>
                  </div>
                  
                  {declarationSource === "existing" ? (
                    <>
                      <div className="col-span-2">
                        <h4 className="text-sm font-medium text-gray-500">Based On ({selectedDeclarationIds.length})</h4>
                        <div className="mt-1 space-y-2">
                          {selectedDeclarationIds.length > 0 ? (
                            selectedDeclarationIds.map(id => (
                              <div key={id} className="p-2 bg-gray-50 rounded-md">
                                {existingDeclarations.find(d => d.id === id)?.name || "Unknown declaration"}
                              </div>
                            ))
                          ) : (
                            <p>No declarations selected</p>
                          )}
                        </div>
                      </div>
                      
                      {selectedDeclarationIds.length > 0 && (
                        <div className="col-span-2">
                          <h4 className="text-sm font-medium text-gray-500">Product Information</h4>
                          <div className="mt-1 bg-gray-50 p-3 rounded-md">
                            {selectedDeclarationIds.map(id => {
                              const declaration = existingDeclarations.find(d => d.id === id);
                              if (!declaration) return null;
                              
                              return (
                                <div key={id} className="mb-3 border-b pb-2 last:border-b-0 last:pb-0">
                                  <div className="mb-1">
                                    <span className="font-medium">Product Name:</span> {declaration.product || "Not specified"}
                                  </div>
                                  <div className="mb-1">
                                    <span className="font-medium">Quantity:</span> {declaration.quantity || "Not specified"}
                                  </div>
                                  <div className="mb-1">
                                    <span className="font-medium">EUDR Reference Number:</span> {declaration.eudrReferenceNumber || "Not specified"}
                                  </div>
                                  <div>
                                    <span className="font-medium">EUDR Verification Number:</span> {declaration.eudrVerificationNumber || "Not specified"}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Validity Period</h4>
                        <p className="mt-1">
                          {startDate && endDate ? 
                            `${format(startDate, "PP")} to ${format(endDate, "PP")}` : 
                            "Not specified"}
                        </p>
                      </div>
                      
                      <div className="col-span-2">
                        <h4 className="text-sm font-medium text-gray-500">Items</h4>
                        <div className="mt-1 space-y-2">
                          {items.filter(item => item.productName).map((item, index) => (
                            <div key={item.id} className="text-sm">
                              {index + 1}. {item.productName} ({item.quantity} {item.unit}) - HSN: {item.hsnCode}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">GeoJSON</h4>
                        <p className="mt-1">{hasUploadedGeoJSON ? "Uploaded" : "Not uploaded"}</p>
                      </div>
                    </>
                  )}
                  
                  <div className="col-span-2">
                    <h4 className="text-sm font-medium text-gray-500">Customer</h4>
                    <div className="mt-1 space-y-2">
                      {selectedCustomer ? (
                        <div className="p-3 bg-gray-50 rounded-md">
                          <div className="flex justify-between items-center mb-2">
                            <div className="font-medium">{selectedCustomer.name}</div>
                            {selectedCustomer.complianceScore !== undefined && (
                              <div className={cn(
                                "text-xs font-medium rounded-full px-2 py-1",
                                selectedCustomer.complianceScore >= 90 ? "bg-green-100 text-green-800" :
                                selectedCustomer.complianceScore >= 80 ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                              )}>
                                {selectedCustomer.complianceScore}% Compliant
                              </div>
                            )}
                          </div>
                          <div className="text-sm grid grid-cols-2 gap-2">
                            <div><span className="text-gray-500">Company:</span> {selectedCustomer.company}</div>
                            <div><span className="text-gray-500">Type:</span> {selectedCustomer.type}</div>
                            <div><span className="text-gray-500">Country:</span> {selectedCustomer.country}</div>
                            <div><span className="text-gray-500">Registration:</span> {selectedCustomer.registrationNumber}</div>
                            <div><span className="text-gray-500">Contact:</span> {selectedCustomer.contactPerson}</div>
                            <div><span className="text-gray-500">Email:</span> {selectedCustomer.contactEmail}</div>
                          </div>
                        </div>
                      ) : (
                        <p>No customer selected</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Reference Numbers</h4>
                    <div className="mt-1 space-y-1">
                      <p>PO Number: {customerPONumber || 'Not specified'}</p>
                      <p>SO Number: {soNumber || 'Not specified'}</p>
                      <p>Shipment Number: {shipmentNumber || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <h4 className="text-sm font-medium text-gray-500">Evidence Documents</h4>
                    <div className="mt-1">
                      {evidenceDocuments.filter(doc => doc.uploaded).length === 0 ? (
                        <span className="text-red-500">No documents uploaded</span>
                      ) : (
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {evidenceDocuments.filter(doc => doc.uploaded).map((doc, index) => (
                            <li key={index}>
                              {doc.type === "others" && doc.customName ? doc.customName : 
                               doc.type === "export-invoice" ? "Export Invoice" :
                               doc.type === "packing-list" ? "Packing List" : doc.type}
                              {doc.fileName && ` (${doc.fileName})`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
                
                <Separator className="my-6" />

                {/* Comments Section */}
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Comments</h4>
                  <Textarea 
                    placeholder="Add any additional comments, notes, or special instructions related to this declaration..."
                    value={comments}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComments(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5 text-amber-500" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Declaration Submission Notice</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      By submitting this declaration, I confirm that all the information provided is 
                      accurate and complete to the best of my knowledge. I understand that false 
                      information may lead to penalties under the EUDR regulations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          {currentStep > 1 && (
            <Button 
              variant="outline" 
              onClick={goToPreviousStep}
              className="mr-auto"
            >
              Back
            </Button>
          )}
          
          {currentStep < 5 ? (
            <Button onClick={goToNextStep}>
              Continue
            </Button>
          ) : (
            <Button 
              onClick={submitDeclaration}
              disabled={createDeclaration.isPending}
            >
              {createDeclaration.isPending ? "Submitting..." : "Submit Declaration"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
      
      {/* GeoJSON Validation Modal */}
      <GeoJSONValidationModal
        open={showValidationModal}
        onOpenChange={setShowValidationModal}
        geometryValid={geometryValid}
        satelliteValid={satelliteValid}
      />
    </Dialog>
  );
}