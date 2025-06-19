import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Stepper from "@/components/ui/stepper";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { CalendarIcon, Plus, Trash2, Upload, User, Info, Search, Check, AlertCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductSearchCombobox } from "@/components/ui/product-search-combobox";
import ValidationDetailsDialog, { 
  ValidationStatus,
  CheckType,
  ValidationIssue,
  ValidationPlot
} from "./validation-details-dialog";
import GeoJSONValidationModal from "./geojson-validation-modal";
import satelliteMapImage from "../../assets/satellite-map.png";

// Declaration types
type DeclarationType = "inbound" | "outbound";

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

interface Supplier {
  id: number;
  name: string;
  products?: string;
  country?: string;
  countries?: string[];
}

interface ReferenceNumberPair {
  id: string;
  referenceNumber: string;
  verificationNumber: string;
}

interface DeclarationItem {
  id: string;
  hsnCode: string;
  productName: string;
  scientificName: string;
  quantity: string;
  unit: string;
  rmId?: string;
}

// WizardProps interface

interface WizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeclarationWizard({ open, onOpenChange }: WizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 1: Declaration Type
  const [declarationType, setDeclarationType] = useState<DeclarationType>("inbound");

  // Step 2: Declaration Details - Items
  const [items, setItems] = useState<DeclarationItem[]>([
    {
      id: "item-1",
      hsnCode: "",
      productName: "",
      scientificName: "",
      quantity: "",
      unit: "kg",
      rmId: ""
    }
  ]);

  // Step 3: Upload Evidence Documents
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  // Form data - Dates and Supplier
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [validityPeriod, setValidityPeriod] = useState<string>("custom");
  const [showCustomDates, setShowCustomDates] = useState(true);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>("");
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const [poNumber, setPoNumber] = useState("");
  const [supplierSoNumber, setSupplierSoNumber] = useState("");
  const [shipmentNumber, setShipmentNumber] = useState("");
  const [comments, setComments] = useState("");

  // Step 4: Customer Selection (for outbound only)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Upstream reference numbers
  const [referenceNumberPairs, setReferenceNumberPairs] = useState<ReferenceNumberPair[]>([]);
  const [showReferenceNumbers, setShowReferenceNumbers] = useState(false);
  
  // GeoJSON upload state
  const [hasUploadedGeoJSON, setHasUploadedGeoJSON] = useState(false);
  const [geometryValid, setGeometryValid] = useState<boolean | null>(null);
  const [satelliteValid, setSatelliteValid] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState<string | null>(null); // 'validation' or null
  const [selectedPlot, setSelectedPlot] = useState<string | null>(null); // To store which plot is selected in the details view
  const [validationPlots, setValidationPlots] = useState<ValidationPlot[]>([]);
  const [plotSearchTerm, setPlotSearchTerm] = useState("");
  const [showGeoJSONValidationModal, setShowGeoJSONValidationModal] = useState(false);
  
  // File input refs
  const geoJsonFileInputRef = useRef<HTMLInputElement>(null);
  const documentsFileInputRef = useRef<HTMLInputElement>(null);

  // Create declaration mutation
  const createDeclaration = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/declarations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      // Close modal
      onOpenChange(false);

      // Show success toast
      toast({
        title: "Declaration created",
        description: "Your declaration has been successfully submitted",
        variant: "default",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/declarations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/declarations/stats'] });

      // Reset form
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create declaration. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
    refetchOnWindowFocus: false,
  });

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mock customers for the example
  const customers: Customer[] = [
    { 
      id: 1, 
      name: "EuroFood Retailers GmbH", 
      type: "EU-Based Entity",
      company: "EuroFood Group",
      country: "Germany",
      registrationNumber: "DE78901234",
      contactPerson: "Hans Mueller",
      contactEmail: "h.mueller@eurofood.example",
      complianceScore: 92
    },
    { 
      id: 2, 
      name: "Global Trade Partners Ltd", 
      type: "Non-EU Distributor",
      company: "GTP International",
      country: "United Kingdom",
      registrationNumber: "GB45678901",
      contactPerson: "Sarah Johnson",
      contactEmail: "sjohnson@gtp.example",
      complianceScore: 85
    },
    { 
      id: 3, 
      name: "Nordic Organic Markets AB", 
      type: "Retail Chain",
      company: "Nordic Foods Group",
      country: "Sweden",
      registrationNumber: "SE12345678",
      contactPerson: "Erik Andersson",
      contactEmail: "e.andersson@nordicorganic.example",
      complianceScore: 95
    },
    { 
      id: 4, 
      name: "Mediterranean Distributors S.L.", 
      type: "EU-Based Entity",
      company: "Med Group",
      country: "Spain",
      registrationNumber: "ES87654321",
      contactPerson: "Carmen Rodriguez",
      contactEmail: "rodriguez@meddist.example",
      complianceScore: 88
    },
    { 
      id: 5, 
      name: "Asian Markets Co., Ltd.", 
      type: "Non-EU Distributor",
      company: "AMC Holdings",
      country: "Singapore",
      registrationNumber: "SG67890123",
      contactPerson: "Lim Wei Ling",
      contactEmail: "wlim@asianmarkets.example",
      complianceScore: 82
    }
  ];

  // Handle form input changes for items
  const updateItem = (id: string, field: keyof DeclarationItem, value: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Add a new item
  const addItem = () => {
    setItems(prev => [
      ...prev, 
      {
        id: `item-${prev.length + 1}`,
        hsnCode: "",
        productName: "",
        scientificName: "",
        quantity: "",
        unit: "kg",
        rmId: ""
      }
    ]);
  };

  // Remove an item
  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    } else {
      toast({
        title: "Cannot remove item",
        description: "At least one item is required",
        variant: "destructive",
      });
    }
  };

  // Generate sample validation plots with various validation states
  const generateValidationPlots = () => {
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Plot A - All compliant
    const plotA: ValidationPlot = {
      id: "plot-1",
      name: "Plot A",
      plotId: "POL-001",
      area: 125.4,
      areaUnit: "hectares",
      perimeter: 2.4,
      perimeterUnit: "km",
      coordinates: "12.345°N, 76.901°E",
      vertices: 28,
      status: "compliant",
      geometryStatus: "compliant",
      satelliteStatus: "compliant",
      lastValidated: currentDate,
      createdAt: "2025-01-15",
      issues: []
    };

    // Plot B - Geometry issues
    const plotB: ValidationPlot = {
      id: "plot-2",
      name: "Plot B",
      plotId: "POL-002",
      area: 98.7,
      areaUnit: "hectares",
      perimeter: 1.8,
      perimeterUnit: "km",
      coordinates: "12.355°N, 76.912°E",
      vertices: 24,
      status: "non-compliant",
      geometryStatus: "non-compliant",
      satelliteStatus: "warning",
      lastValidated: currentDate,
      createdAt: "2025-01-18",
      issues: [
        {
          type: "geometry",
          message: "Self-intersection detected",
          details: "Polygon has self-intersecting boundaries at coordinates (12.352°N, 76.908°E)",
          severity: "error"
        },
        {
          type: "geometry",
          message: "Invalid vertex count",
          details: "Polygons must have at least 4 vertices to form a valid closed shape",
          severity: "error"
        }
      ]
    };

    // Plot C - Satellite issues
    const plotC: ValidationPlot = {
      id: "plot-3",
      name: "Plot C",
      plotId: "POL-003",
      area: 142.1,
      areaUnit: "hectares",
      perimeter: 3.2,
      perimeterUnit: "km",
      coordinates: "12.365°N, 76.925°E",
      vertices: 32,
      status: "non-compliant",
      geometryStatus: "compliant",
      satelliteStatus: "non-compliant",
      lastValidated: currentDate,
      createdAt: "2025-01-20",
      issues: [
        {
          type: "satellite",
          message: "Deforestation detected",
          details: "Satellite imagery shows evidence of recent deforestation in the northwest section",
          severity: "error"
        },
        {
          type: "satellite",
          message: "Land use change detected",
          details: "Comparison with historical imagery shows unauthorized land use change since 2020",
          severity: "error"
        }
      ]
    };

    // Plot D - Both geometry and satellite warnings
    const plotD: ValidationPlot = {
      id: "plot-4",
      name: "Plot D",
      plotId: "POL-004",
      area: 110.8,
      areaUnit: "hectares",
      perimeter: 2.7,
      perimeterUnit: "km",
      coordinates: "12.375°N, 76.938°E",
      vertices: 26,
      status: "warning",
      geometryStatus: "warning",
      satelliteStatus: "warning",
      lastValidated: currentDate,
      createdAt: "2025-01-25",
      issues: [
        {
          type: "geometry",
          message: "Boundary proximity warning",
          details: "Polygon boundary is within 10m of a protected area border",
          severity: "warning"
        },
        {
          type: "satellite",
          message: "Potential water body encroachment",
          details: "Satellite imagery suggests possible encroachment into seasonal water body",
          severity: "warning"
        }
      ]
    };

    // Plot E - All compliant
    const plotE: ValidationPlot = {
      id: "plot-5",
      name: "Plot E",
      plotId: "POL-005",
      area: 135.6,
      areaUnit: "hectares",
      perimeter: 2.2,
      perimeterUnit: "km",
      coordinates: "12.385°N, 76.945°E",
      vertices: 30,
      status: "compliant",
      geometryStatus: "compliant",
      satelliteStatus: "compliant",
      lastValidated: currentDate,
      createdAt: "2025-01-28",
      issues: []
    };
    
    return [plotA, plotB, plotC, plotD, plotE];
  };

  // Handle file upload simulation
  const handleGeoJSONUpload = () => {
    if (geoJsonFileInputRef.current) {
      geoJsonFileInputRef.current.click();
    }
  };

  const handleGeoJSONFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.geojson') && !file.name.toLowerCase().endsWith('.json')) {
        toast({
          title: "Invalid file type",
          description: "Please select a GeoJSON file (.geojson or .json)",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 10MB)
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
      setSelectedPlot(null);
      
      toast({
        title: "GeoJSON uploaded",
        description: `${file.name} has been uploaded successfully. Validating...`,
        variant: "default",
      });
      
      // Generate validation plot data
      const plots = generateValidationPlots();
      
      // Simulate geometry validation check - different logic for inbound vs outbound
      setTimeout(() => {
        // For inbound declarations: always fail validation
        // For outbound declarations: always pass validation
        const geometryIsValid = declarationType === "outbound";
        
        // Generate validation plots based on declaration type
        const validationPlots = declarationType === "outbound" 
          ? plots.map(plot => ({
              ...plot,
              geometryStatus: "compliant" as const,
              satelliteStatus: "compliant" as const,
              status: "compliant" as const,
              issues: []
            }))
          : plots.map(plot => ({
              ...plot,
              geometryStatus: "non-compliant" as const,
              satelliteStatus: "non-compliant" as const,
              status: "non-compliant" as const,
              issues: [
                {
                  type: "geometry" as const,
                  message: "Geometry validation failed",
                  details: "The provided GeoJSON contains invalid geometric structures that do not meet EUDR compliance requirements",
                  severity: "error" as const
                },
                {
                  type: "satellite" as const,
                  message: "Satellite validation failed",
                  details: "Satellite imagery analysis indicates potential deforestation activity in the specified area",
                  severity: "error" as const
                }
              ]
            }));
        
        setGeometryValid(geometryIsValid);
        setValidationPlots(validationPlots);
        
        // Proceed to satellite check
        setTimeout(() => {
          // Same logic: outbound passes, inbound fails
          const satelliteIsValid = declarationType === "outbound";
          
          setSatelliteValid(satelliteIsValid);
          setIsValidating(false);
          
          if (declarationType === "outbound") {
            toast({
              title: "Validation successful",
              description: "GeoJSON geometry and satellite checks passed successfully.",
              variant: "default",
            });
          } else {
            toast({
              title: "Validation failed",
              description: "GeoJSON validation failed. Please review the geometry and satellite data.",
              variant: "destructive",
            });
          }
        }, 2000);
      }, 1500);
    }
  };

  const handleDocumentUpload = () => {
    if (documentsFileInputRef.current) {
      documentsFileInputRef.current.click();
    }
  };

  const handleDocumentFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const validFiles: string[] = [];
      const invalidFiles: string[] = [];
      
      // Validate each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file size (max 10MB per file)
        if (file.size > 10 * 1024 * 1024) {
          invalidFiles.push(`${file.name} (too large - max 10MB)`);
          continue;
        }
        
        // Check file type
        const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.txt', '.geojson', '.json'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!allowedTypes.includes(fileExtension)) {
          invalidFiles.push(`${file.name} (unsupported format)`);
          continue;
        }
        
        validFiles.push(file.name);
      }
      
      // Add valid files to uploaded files list
      if (validFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...validFiles]);
        toast({
          title: "Files uploaded",
          description: `${validFiles.length} file(s) uploaded successfully`,
          variant: "default",
        });
      }
      
      // Show errors for invalid files
      if (invalidFiles.length > 0) {
        toast({
          title: "Some files were rejected",
          description: `${invalidFiles.length} file(s) could not be uploaded: ${invalidFiles.join(', ')}`,
          variant: "destructive",
        });
      }
    }
  };

  // Remove uploaded file
  const removeFile = (filename: string) => {
    setUploadedFiles(prev => prev.filter(file => file !== filename));
  };
  
  // Handle adding a new reference number pair
  const addReferenceNumberPair = () => {
    setReferenceNumberPairs(prev => [
      ...prev,
      {
        id: `ref-${Date.now()}`,
        referenceNumber: "",
        verificationNumber: ""
      }
    ]);
  };

  // Handle updating a reference number pair
  const updateReferenceNumberPair = (id: string, field: keyof ReferenceNumberPair, value: string) => {
    setReferenceNumberPairs(prev => prev.map(pair => 
      pair.id === id ? { ...pair, [field]: value } : pair
    ));
  };

  // Handle removing a reference number pair
  const removeReferenceNumberPair = (id: string) => {
    setReferenceNumberPairs(prev => prev.filter(pair => pair.id !== id));
  };

  // Check if reference numbers should be shown based on supplier country
  const checkForReferenceNumbers = (supplier: Supplier | null) => {
    // Complete list of EU member states (case-insensitive matching)
    const europeanCountries = [
      "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic", "Czechia",
      "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", 
      "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands", 
      "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden"
    ];
    
    if (supplier && supplier.country) {
      const supplierCountry = supplier.country.toLowerCase();
      const isEUCountry = europeanCountries.some(country => 
        country.toLowerCase() === supplierCountry || 
        supplierCountry.includes(country.toLowerCase())
      );
      
      if (isEUCountry) {
        setShowReferenceNumbers(true);
        
        // If no reference number pairs yet, add an initial one
        if (referenceNumberPairs.length === 0) {
          addReferenceNumberPair();
        }
      } else {
        setShowReferenceNumbers(false);
        setReferenceNumberPairs([]);
      }
    } else {
      setShowReferenceNumbers(false);
      setReferenceNumberPairs([]);
    }
  };

  // Navigate to next step
  const goToNextStep = () => {
    // Validate current step before proceeding
    if (validateCurrentStep()) {
      setCompletedSteps(prev => [...prev, currentStep]);
      setCurrentStep(prev => prev + 1);
    }
  };

  // Navigate to previous step
  const goToPreviousStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Validate current step
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1: // Declaration Type
        // Check if a supplier is selected
        if (!selectedSupplierId) {
          toast({
            title: "Supplier required",
            description: "Please select a supplier to continue",
            variant: "destructive",
          });
          return false;
        }
        
        // Check if PO Number is provided
        if (!poNumber.trim()) {
          toast({
            title: "PO Number required",
            description: "Please enter a PO number to continue",
            variant: "destructive",
          });
          return false;
        }
        
        // Validation removed as requested
        
        return true;

      case 2: // GeoJSON Upload
        // Check if GeoJSON is uploaded
        if (!hasUploadedGeoJSON) {
          toast({
            title: "GeoJSON required",
            description: "Please upload a GeoJSON file to continue",
            variant: "destructive",
          });
          return false;
        }
        
        // Check if validation is in progress
        if (isValidating) {
          toast({
            title: "Validation in progress",
            description: "Please wait for the GeoJSON validation to complete",
            variant: "destructive",
          });
          return false;
        }
        
        // Allow proceeding even with failed validations
        // The declaration can be saved as draft but won't be submittable later
        return true;

      case 3: // Upload Evidence
        // Check if at least one file is uploaded
        if (uploadedFiles.length === 0) {
          toast({
            title: "Evidence required",
            description: "Please upload at least one document as evidence",
            variant: "destructive",
          });
          return false;
        }
        return true;

      case 4: // Customer Selection (outbound only)
        if (declarationType === "outbound" && !selectedCustomer) {
          toast({
            title: "Selection required",
            description: "Please select a customer to continue",
            variant: "destructive",
          });
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  // Submit declaration
  const submitDeclaration = () => {
    if (!validateCurrentStep()) return;

    // Format items for submission
    const formattedItems = items.filter(item => 
      item.hsnCode.trim() !== "" && 
      item.productName.trim() !== "" && 
      item.quantity.trim() !== ""
    ).map(item => ({
      hsnCode: item.hsnCode,
      productName: item.productName,
      scientificName: item.scientificName,
      quantity: parseFloat(item.quantity),
      unit: item.unit,
      rmId: item.rmId
    }));

    // Determine declaration status based on GeoJSON validation results
    let status = "pending";
    
    if (geometryValid === false) {
      status = "non-compliant-geometry";
    } else if (satelliteValid === false) {
      status = "non-compliant-satellite";
    } else if (declarationType === "inbound") {
      status = "validating";
    }
    
    // Get the first product name as the primary name for the declaration
    const firstProduct = formattedItems[0]?.productName || "Unnamed Product";
    
    // Create a simplified payload with only required fields
    const payload = {
      type: declarationType,
      supplierId: selectedSupplierId || 1, // Ensure we always have a supplier ID
      productName: firstProduct,
      productDescription: formattedItems[0]?.scientificName || "",
      hsnCode: formattedItems[0]?.hsnCode || "",
      quantity: Number(formattedItems[0]?.quantity) || 0,
      unit: formattedItems[0]?.unit || "kg",
      status: status,
      riskLevel: "medium",
      industry: "Food & Beverage", // Default industry
      referenceNumberPairs: showReferenceNumbers ? referenceNumberPairs.filter(pair => 
        pair.referenceNumber.trim() !== '' || pair.verificationNumber.trim() !== ''
      ) : []
    };

    createDeclaration.mutate(payload);
  };

  // Reset form state
  const resetForm = () => {
    setCurrentStep(1);
    setCompletedSteps([]);
    setDeclarationType("inbound");
    setItems([
      {
        id: "item-1",
        hsnCode: "",
        productName: "",
        scientificName: "",
        quantity: "",
        unit: "kg",
        rmId: ""
      }
    ]);
    setUploadedFiles([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setValidityPeriod("custom");
    setShowCustomDates(true);
    setSelectedSupplierId(null);
    setSelectedSupplierName("");
    setSupplierSearchTerm("");
    setShowSupplierDropdown(false);
    setPoNumber("");
    setSupplierSoNumber("");
    setShipmentNumber("");
    setSelectedCustomer(null);
    setComments("");
    // Reset reference numbers
    setReferenceNumberPairs([]);
    setShowReferenceNumbers(false);
    // Reset GeoJSON and validation state
    setHasUploadedGeoJSON(false);
    setGeometryValid(null);
    setSatelliteValid(null);
    setIsValidating(false);
    setShowValidationDetails(null);
    setSelectedPlot(null);
    setValidationPlots([]);
    setPlotSearchTerm("");
  };

  // Set validity period presets
  const handleValidityPeriodChange = (value: string) => {
    setValidityPeriod(value);
    const today = new Date();
    
    switch (value) {
      case "na":
        setStartDate(undefined);
        setEndDate(undefined);
        setShowCustomDates(false);
        break;
      case "30days":
        setStartDate(today);
        setEndDate(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000));
        setShowCustomDates(false);
        break;
      case "6months":
        setStartDate(today);
        setEndDate(new Date(today.getFullYear(), today.getMonth() + 6, today.getDate()));
        setShowCustomDates(false);
        break;
      case "9months":
        setStartDate(today);
        setEndDate(new Date(today.getFullYear(), today.getMonth() + 9, today.getDate()));
        setShowCustomDates(false);
        break;
      case "1year":
        setStartDate(today);
        setEndDate(new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()));
        setShowCustomDates(false);
        break;
      case "custom":
        setShowCustomDates(true);
        break;
    }
  };

  // Steps configuration
  const stepsConfig = [
    { label: "Declaration Details" },
    { label: "GeoJSON Upload" },
    { label: "Upload Evidence" },
    { label: "Review" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Declaration</DialogTitle>
          <DialogDescription>
            Create a new declaration to document and track compliance for your products.
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
          onChange={handleDocumentFileChange}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt,.geojson,.json"
          multiple
          style={{ display: 'none' }}
        />

        <div className="mt-2 mb-6">
          <Stepper 
            steps={stepsConfig} 
            currentStep={currentStep} 
            completedSteps={completedSteps}
          />
        </div>

        <div className="space-y-6">
          {/* Step 1: Declaration Basic Info */}
          {currentStep === 1 && (
            <div>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <Label htmlFor="poNumber" className="text-base font-medium">PO Number</Label>
                  <Input
                    id="poNumber"
                    placeholder="Enter PO number"
                    className="mt-2"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="supplierSoNumber" className="text-base font-medium">
                    Supplier SO Number
                    <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                  </Label>
                  <Input
                    id="supplierSoNumber"
                    placeholder="Enter supplier SO number"
                    className="mt-2"
                    value={supplierSoNumber}
                    onChange={(e) => setSupplierSoNumber(e.target.value)}
                  />
                </div>
              </div>

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

              <div className="mb-6">
                <Label className="text-base font-medium">Supplier Selection</Label>
                <p className="text-sm text-gray-500 mb-2">Select the supplier associated with this declaration.</p>
                
                <div className="relative" ref={supplierDropdownRef}>
                  <Input
                    placeholder="Search suppliers..."
                    className="pl-9"
                    value={supplierSearchTerm}
                    onClick={() => setShowSupplierDropdown(true)}
                    onChange={(e) => {
                      setSupplierSearchTerm(e.target.value);
                      setShowSupplierDropdown(true);
                    }}
                  />
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  
                  {showSupplierDropdown && (
                    <div className="absolute z-10 mt-1 w-full max-h-64 overflow-auto bg-white border rounded-md shadow-lg">
                      {suppliers.filter(supplier => 
                        supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase())
                      ).map((supplier) => (
                        <div
                          key={supplier.id}
                          className={cn(
                            "p-3 cursor-pointer hover:bg-gray-50",
                            selectedSupplierId === supplier.id ? "bg-primary/10" : ""
                          )}
                          onClick={() => {
                            setSelectedSupplierId(supplier.id);
                            setSelectedSupplierName(supplier.name);
                            setSupplierSearchTerm(supplier.name);
                            setShowSupplierDropdown(false);
                            // Check if EU reference numbers should be shown
                            checkForReferenceNumbers(supplier);
                          }}
                        >
                          <div className="font-medium">{supplier.name}</div>
                          {supplier.country && (
                            <div className="text-sm text-gray-500">Country: {supplier.country}</div>
                          )}
                        </div>
                      ))}
                      {suppliers.filter(supplier => 
                        supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="p-3 text-center text-gray-500">No matching suppliers found.</div>
                      )}
                    </div>
                  )}
                </div>
                
                {selectedSupplierId && selectedSupplierName && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <div className="flex justify-between">
                      <div className="font-medium">{selectedSupplierName}</div>
                      <Badge className="bg-primary">Selected</Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Upstream Reference Numbers section - only visible for EU suppliers */}
              {showReferenceNumbers && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-base font-medium">Upstream Reference Numbers</Label>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={addReferenceNumberPair}
                      className="h-8 bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Reference
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Add reference numbers from upstream supplier documentation
                  </p>

                  <div className="space-y-3">
                    {referenceNumberPairs.map((pair, index) => (
                      <div key={pair.id} className="grid grid-cols-2 gap-4 p-4 border rounded-md items-end relative">
                        <div>
                          <Label htmlFor={`ref-eudr-${pair.id}`} className="text-sm">EUDR Reference Number</Label>
                          <Input
                            id={`ref-eudr-${pair.id}`}
                            placeholder="Enter EUDR reference number"
                            value={pair.referenceNumber}
                            onChange={(e) => updateReferenceNumberPair(pair.id, 'referenceNumber', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`ref-verification-${pair.id}`} className="text-sm">EUDR Verification Number</Label>
                          <Input
                            id={`ref-verification-${pair.id}`}
                            placeholder="Enter EUDR verification number"
                            value={pair.verificationNumber}
                            onChange={(e) => updateReferenceNumberPair(pair.id, 'verificationNumber', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-gray-500 absolute top-2 right-2"
                          onClick={() => removeReferenceNumberPair(pair.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-base font-medium">Declaration Items</Label>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Import Items
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={addItem}
                      className="h-8 bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 text-xs font-medium text-gray-700 w-[22%]">
                          Product Name <span className="text-red-500">*</span>
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-700 w-[12%]">
                          HSN Code <span className="text-red-500">*</span>
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-700 w-[12%]">
                          RM ID
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-700 w-[16%]">
                          Scientific Name
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-700 w-[12%]">
                          Quantity <span className="text-red-500">*</span>
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-700 w-[10%]">
                          Unit <span className="text-red-500">*</span>
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-700 w-[4%]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-2">
                            <ProductSearchCombobox
                              value={item.productName}
                              onProductSelect={(productName, hsnCode) => {
                                updateItem(item.id, 'productName', productName);
                                if (hsnCode) {
                                  updateItem(item.id, 'hsnCode', hsnCode);
                                }
                              }}
                              placeholder="Search or type product name..."
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              placeholder="e.g. 1511.10.00"
                              value={item.hsnCode}
                              onChange={(e) => updateItem(item.id, 'hsnCode', e.target.value)}
                              className={cn(
                                "text-xs h-8",
                                item.hsnCode && item.productName ? "bg-gray-50 text-gray-600" : ""
                              )}
                              readOnly={!!(item.hsnCode && item.productName)}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              placeholder="e.g. RM12345"
                              value={item.rmId || ''}
                              onChange={(e) => updateItem(item.id, 'rmId', e.target.value)}
                              className="text-xs h-8"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              placeholder="e.g. Elaeis guineen"
                              value={item.scientificName}
                              onChange={(e) => updateItem(item.id, 'scientificName', e.target.value)}
                              className="text-xs h-8"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              placeholder="e.g. 5000"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                              className="text-xs h-8"
                            />
                          </td>
                          <td className="p-2">
                            <Select
                              value={item.unit}
                              onValueChange={(value) => updateItem(item.id, 'unit', value)}
                            >
                              <SelectTrigger className="text-xs h-8">
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="tons">tons</SelectItem>
                                <SelectItem value="liters">liters</SelectItem>
                                <SelectItem value="m³">m³</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            {items.length > 1 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 text-gray-500"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: GeoJSON Upload */}
          {currentStep === 2 && (
            <div>
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
                          <span className="text-sm text-green-600">Compliant</span>
                        ) : geometryValid === false ? (
                          <span className="text-sm text-red-600">Non-Compliant</span>
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
                            <span className="text-sm text-green-600">Compliant</span>
                          ) : satelliteValid === false ? (
                            <span className="text-sm text-red-600">Non-Compliant</span>
                          ) : (
                            <span className="text-sm text-gray-500">Pending</span>
                          )}
                        </div>
                      )}
                      
                      {/* Single View Validation Details button to open GeoJSON Validator */}
                      {!isValidating && (geometryValid !== null || satelliteValid !== null) && (
                        <div className="mt-4 flex justify-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center"
                            onClick={() => setShowGeoJSONValidationModal(true)}
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
                              className="mr-2"
                            >
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            View Validation Details
                          </Button>
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
            </div>
          )}

          {/* Step 3: Upload Evidence Documents */}
          {currentStep === 3 && (
            <div>
              <div className="mb-6">
                <Label className="text-base font-medium">Upload Evidence Documents</Label>
                <p className="text-sm text-gray-500 mb-4">
                  Please upload all relevant documentation to support your declaration, including:
                  GeoJSON data, certificates, shipping documents, and any other evidence.
                </p>

                <div 
                  className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:bg-gray-50"
                  onClick={handleDocumentUpload}
                >
                  <div className="mx-auto flex justify-center">
                    <Upload className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="mt-4 text-sm text-gray-600">
                    Drag and drop your files here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Accepted formats: PDF, JPG, PNG, GeoJSON (max 10MB)
                  </p>
                  <Button 
                    variant="secondary" 
                    className="mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDocumentUpload();
                    }}
                  >
                    Browse Files
                  </Button>
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                <div>
                  <h3 className="text-base font-medium mb-2">Uploaded Files</h3>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-primary/10 rounded-md flex items-center justify-center">
                            <svg 
                              className="h-4 w-4 text-primary" 
                              xmlns="http://www.w3.org/2000/svg" 
                              viewBox="0 0 20 20" 
                              fill="currentColor"
                            >
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="ml-2 text-sm font-medium">{file}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-gray-500"
                          onClick={() => removeFile(file)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Customer Selection (for outbound only) */}
          {currentStep === 4 && declarationType === "outbound" && (
            <div>
              <h3 className="text-lg font-medium mb-4">Customer Selection</h3>
              <div className="relative mb-4">
                <Input 
                  type="text" 
                  placeholder="Search customers..." 
                  className="pl-9"
                />
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              </div>

              <div className="space-y-3">
                {customers.map((customer) => (
                  <div 
                    key={customer.id}
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer",
                      selectedCustomer?.id === customer.id ? "border-primary bg-primary/5" : "hover:bg-gray-50"
                    )}
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start">
                        <User className="h-5 w-5 text-gray-500 mr-3 mt-1" />
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.company} - {customer.type}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
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
                        {selectedCustomer?.id === customer.id && (
                          <Badge className="bg-primary ml-2">Selected</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 mt-2 pl-8">
                      <div><span className="text-gray-400">Country:</span> {customer.country}</div>
                      <div><span className="text-gray-400">Registration:</span> {customer.registrationNumber}</div>
                      <div><span className="text-gray-400">Contact:</span> {customer.contactPerson}</div>
                      <div><span className="text-gray-400">Email:</span> {customer.contactEmail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4/5: Review (Final Step) */}
          {((currentStep === 4 && declarationType === "inbound") || 
            (currentStep === 5 && declarationType === "outbound")) && (
            <div>
              <h3 className="text-lg font-medium mb-6">Review Declaration</h3>

              {declarationType === "inbound" && (
                <div className="mb-6">
                  <Label htmlFor="comments" className="text-base font-medium">Add Comments</Label>
                  <Textarea
                    id="comments"
                    placeholder="Add any notes or comments about this declaration"
                    className="min-h-[100px] mt-2"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </div>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Declaration Type</h4>
                    <p className="mt-1">{declarationType === "inbound" ? "Inbound" : "Outbound"}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Validity Period</h4>
                    <p className="mt-1">
                      {startDate && endDate ? 
                        `${format(startDate, "PP")} to ${format(endDate, "PP")}` : 
                        "Not specified"}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Supplier</h4>
                    <p className="mt-1">
                      {selectedSupplierId ? 
                        suppliers.find(s => s.id === selectedSupplierId)?.name || "Unknown supplier" : 
                        "Not selected"}
                    </p>
                  </div>

                  {declarationType === "outbound" && (
                    <div className="col-span-2">
                      <h4 className="text-sm font-medium text-gray-500">Customer</h4>
                      {selectedCustomer ? (
                        <div className="mt-1 p-3 bg-gray-50 rounded-md">
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
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-red-500">Not selected</p>
                      )}
                    </div>
                  )}

                  <div className="col-span-2">
                    <h4 className="text-sm font-medium text-gray-500">Items</h4>
                    <div className="mt-1 space-y-2">
                      {items.filter(item => item.productName).map((item, index) => (
                        <div key={item.id} className="text-sm">
                          {index + 1}. {item.productName} ({item.quantity} {item.unit}) - HSN: {item.hsnCode}
                          {item.scientificName && ` - ${item.scientificName}`}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reference Numbers in review panel */}
                  {showReferenceNumbers && referenceNumberPairs.length > 0 && (
                    <div className="col-span-2">
                      <h4 className="text-sm font-medium text-gray-500">Upstream Reference Numbers</h4>
                      <div className="mt-1 space-y-1">
                        {referenceNumberPairs.filter(pair => pair.referenceNumber.trim() !== '' || pair.verificationNumber.trim() !== '').map((pair) => (
                          <div key={pair.id} className="text-sm space-y-1">
                            {pair.referenceNumber && <div><span className="font-medium">EUDR Reference Number:</span> {pair.referenceNumber}</div>}
                            {pair.verificationNumber && <div><span className="font-medium">EUDR Verification Number:</span> {pair.verificationNumber}</div>}
                          </div>
                        ))}
                        {referenceNumberPairs.filter(pair => pair.referenceNumber.trim() !== '' || pair.verificationNumber.trim() !== '').length === 0 && (
                          <div className="text-sm text-amber-600">No reference numbers provided</div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="col-span-2">
                    <h4 className="text-sm font-medium text-gray-500">Evidence Documents</h4>
                    <div className="mt-1">
                      {uploadedFiles.length === 0 ? (
                        <span className="text-red-500">No documents uploaded</span>
                      ) : (
                        <ul className="list-disc list-inside">
                          {uploadedFiles.map((file, index) => (
                            <li key={index} className="text-sm">{file}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <h4 className="text-sm font-medium text-gray-500">GeoJSON Validation</h4>
                    <div className="mt-1">
                      {!hasUploadedGeoJSON ? (
                        <span className="text-red-500">No GeoJSON file uploaded</span>
                      ) : (
                        <div className="flex flex-col space-y-1">
                          <div className="text-sm">
                            Geometry Check: 
                            <span className={cn(
                              "ml-2 px-2 py-0.5 rounded-full text-xs font-medium",
                              geometryValid === true ? "bg-green-100 text-green-800" :
                              geometryValid === false ? "bg-red-100 text-red-800" :
                              "bg-gray-100 text-gray-800"
                            )}>
                              {geometryValid === true ? "Compliant" : 
                               geometryValid === false ? "Non-Compliant" : 
                               "Pending"}
                            </span>
                          </div>

                          {geometryValid === true && (
                            <div className="text-sm">
                              Satellite Check: 
                              <span className={cn(
                                "ml-2 px-2 py-0.5 rounded-full text-xs font-medium",
                                satelliteValid === true ? "bg-green-100 text-green-800" :
                                satelliteValid === false ? "bg-red-100 text-red-800" :
                                "bg-gray-100 text-gray-800"
                              )}>
                                {satelliteValid === true ? "Compliant" : 
                                 satelliteValid === false ? "Non-Compliant" : 
                                 "Pending"}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Validation Details Dialog using separate component */}
        <ValidationDetailsDialog 
          open={showValidationDetails !== null}
          onOpenChange={(open) => !open && setShowValidationDetails(null)}
          validationPlots={validationPlots}
        />
        
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

          {((currentStep < 4 && declarationType === "inbound") || 
            (currentStep < 5 && declarationType === "outbound")) ? (
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
        open={showGeoJSONValidationModal}
        onOpenChange={setShowGeoJSONValidationModal}
        geometryValid={geometryValid}
        satelliteValid={satelliteValid}
      />
    </Dialog>
  );
}