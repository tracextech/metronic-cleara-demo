import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

// Custom CSS styles for phone input
const phoneInputStyles = `
  .phone-input-container .react-tel-input .form-control {
    width: 100%;
    height: 40px;
    border-radius: 6px;
    border: 1px solid hsl(var(--input));
    font-size: 14px;
    padding-left: 48px;
    background-color: transparent;
  }
  
  .phone-input-container .react-tel-input .form-control:focus {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 1px hsl(var(--primary));
    outline: none;
  }
  
  .phone-input-container .react-tel-input .flag-dropdown {
    border-radius: 6px 0 0 6px;
    border: 1px solid hsl(var(--input));
    background-color: transparent;
  }
  
  .phone-input-container .react-tel-input .flag-dropdown.open {
    background-color: transparent;
    border-color: hsl(var(--primary));
  }
  
  .phone-input-container .react-tel-input .flag-dropdown.open .selected-flag {
    background-color: transparent;
  }
`;

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// List of all countries for dropdowns
const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina",
  "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados",
  "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina",
  "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
  "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", 
  "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", 
  "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", 
  "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", 
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", 
  "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", 
  "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", 
  "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", 
  "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", 
  "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", 
  "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", 
  "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", 
  "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", 
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", 
  "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", 
  "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", 
  "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", 
  "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", 
  "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", 
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

interface SimplifiedSupplierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
}

export default function SimplifiedSupplierForm({
  open,
  onOpenChange,
  initialData,
}: SimplifiedSupplierFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Create a default form state
  const getDefaultFormState = () => ({
    // Company Details
    companyName: initialData?.name || "",
    businessRegistration: initialData?.businessRegistration || "",
    country: initialData?.country || "",
    
    // Business Address
    businessAddress: initialData?.businessAddress || "",
    
    // Primary Contact
    contactName: initialData?.contactName || "",
    email: initialData?.email || "",
    phoneNumber: initialData?.phoneNumber || "",
  });
  
  const [formData, setFormData] = useState(getDefaultFormState());
  
  // Reset the form when the dialog is closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form data when closing
      setFormData(getDefaultFormState());
    }
    onOpenChange(open);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      phoneNumber: value
    }));
  };

  // Function to format phone number consistently
  const formatPhoneNumber = (phoneNumber: string, countryCode: string = ''): string => {
    // Remove all non-digit characters except + at the beginning
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it already starts with +, return as is with proper spacing
    if (cleaned.startsWith('+')) {
      // Add proper spacing based on length and patterns
      if (cleaned.length >= 10) {
        // Format international numbers with spaces for readability
        const withoutPlus = cleaned.substring(1);
        const countryCode = withoutPlus.substring(0, 2);
        const rest = withoutPlus.substring(2);
        
        // Add spaces every 3-4 digits for better readability
        if (rest.length >= 6) {
          const part1 = rest.substring(0, 2);
          const part2 = rest.substring(2, 6);
          const part3 = rest.substring(6);
          return `+${countryCode} ${part1} ${part2} ${part3}`;
        } else if (rest.length >= 3) {
          const part1 = rest.substring(0, 2);
          const part2 = rest.substring(2);
          return `+${countryCode} ${part1} ${part2}`;
        }
      }
      return cleaned;
    }
    
    // If no country code, try to add one based on selected country or default
    if (cleaned.length >= 10) {
      // Default to international format with common country codes
      const countryMap: { [key: string]: string } = {
        'algeria': '+213',
        'argentina': '+54',
        'austria': '+43',
        'brazil': '+55',
        'germany': '+49',
        'malaysia': '+60',
        'vietnam': '+84',
        'sweden': '+46',
        'us': '+1',
        'united states': '+1'
      };
      
      const selectedCountry = formData.country.toLowerCase();
      const prefix = countryMap[selectedCountry] || '+1';
      
      // Format with spaces for readability
      const formatted = cleaned.substring(0, 10);
      return `${prefix} ${formatted.substring(0, 2)} ${formatted.substring(2, 6)} ${formatted.substring(6)}`;
    }
    
    return phoneNumber;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const method = initialData ? "PATCH" : "POST";
      const endpoint = initialData
        ? `/api/suppliers/${initialData.id}`
        : "/api/suppliers";

      // Prepare submission data for the new form fields with the correct field names
      const submissionData = {
        name: formData.companyName,
        businessRegistration: formData.businessRegistration,
        country: formData.country,
        businessAddress: formData.businessAddress,
        addressLine1: formData.businessAddress, // Also set addressLine1 for compatibility
        contactName: formData.contactName,
        email: formData.email,
        phoneNumber: formatPhoneNumber(formData.phoneNumber, formData.country),
        
        // Set other required fields with default values to maintain compatibility
        partnerType: "supplier",
        partnerRole: "supplier",
        partnerRoleName: "supplier", // Required field in the schema
        status: "pending",
      };

      console.log("Submitting supplier data:", submissionData);

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // Ignore if we can't parse the JSON
        }
        
        console.error("Server response:", response.status, errorData);
        throw new Error(`Failed to save supplier data: ${errorData?.message || response.statusText}`);
      }

      const savedSupplier = await response.json();
      console.log("Supplier saved successfully:", savedSupplier);

      // Show success message
      toast({
        title: initialData ? "Supplier Updated" : "Supplier Added",
        description: `${submissionData.name} has been ${initialData ? "updated" : "added"} successfully.`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      
      // Reset form data
      setFormData(getDefaultFormState());
      
      // Close form
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving supplier:", error);
      
      // Show error message
      toast({
        title: "Error",
        description: "Failed to save supplier. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <style dangerouslySetInnerHTML={{ __html: phoneInputStyles }} />
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Supplier" : "Add New Supplier"}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update the supplier information."
              : "Fill in the supplier details in the form below."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            {/* Company Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Company Information</h3>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder="e.g., GreenAgri Suppliers Ltd."
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="businessRegistration">Business Registration Number *</Label>
                <Input
                  id="businessRegistration"
                  name="businessRegistration"
                  placeholder="e.g., BRN-458912"
                  value={formData.businessRegistration}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="country">Country *</Label>
                <Select 
                  onValueChange={(value) => handleSelectChange("country", value)} 
                  value={formData.country}
                >
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {countries.map((country) => (
                      <SelectItem key={country} value={country.toLowerCase()}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="businessAddress">Business Address *</Label>
                <Textarea
                  id="businessAddress"
                  name="businessAddress"
                  placeholder="e.g., 123 Farm Lane, Springfield, IL, 62701"
                  value={formData.businessAddress}
                  onChange={handleChange}
                  className="min-h-[100px]"
                  required
                />
              </div>
            </div>

            {/* Primary Contact */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Primary Contact Information</h3>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="contactName">Primary Contact Name *</Label>
                <Input
                  id="contactName"
                  name="contactName"
                  placeholder="e.g., Jane Doe"
                  value={formData.contactName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="e.g., jane.doe@greenagri.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <div className="phone-input-container">
                  <PhoneInput
                    country={'us'}
                    value={formData.phoneNumber}
                    onChange={handlePhoneChange}
                    inputProps={{
                      name: 'phoneNumber',
                      id: 'phoneNumber',
                      required: true,
                      placeholder: 'e.g., +1-234-567-8901'
                    }}
                    containerClass="phone-input"
                    inputClass="phone-input-field"
                    buttonClass="country-dropdown"
                    containerStyle={{ width: '100%' }}
                    inputStyle={{ width: '100%', height: '40px', paddingLeft: '48px' }}
                    buttonStyle={{ height: '40px' }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="ml-auto"
            >
              {isSubmitting ? "Saving..." : "Save Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}