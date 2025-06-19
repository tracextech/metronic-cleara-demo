import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EyeIcon, EyeOffIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { GoogleIcon, MicrosoftIcon } from "@/components/icons";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import '@/styles/phone-input.css';

const registerSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  phoneVerified: z.boolean().default(false),
  otp: z.string().length(6, "OTP must be 6 digits").optional(),
  industryType: z.string().min(1, "Industry type is required"),
  complianceFocus: z.array(z.string()).default([]), // Make compliance focus optional
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions"
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// Industry options from the provided image
const industryOptions = [
  "Agriculture",
  "Forestry & Timber",
  "Food & Beverage",
  "Retail & Consumer Goods",
  "Textile & Apparel",
  "Automotive",
  "Chemicals",
  "Energy & Utilities",
  "Oil & Gas",
  "Pharmaceuticals",
  "Construction",
  "Electronics",
  "Financial Services",
  "Transportation & Logistics",
  "Mining & Metals",
  "Waste Management",
  "Education",
  "Healthcare",
  "Telecommunications"
];

// Helper function to validate OTP format
const isValidOTP = (otp: string | undefined): boolean => {
  return typeof otp === 'string' && otp.length === 6;
};

export default function Register() {
  const { register: registerUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedComplianceFocus, setSelectedComplianceFocus] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const { register, handleSubmit, setValue, watch, formState: { errors }, getValues, trigger } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      companyName: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      phoneVerified: false,
      otp: "",
      industryType: "",
      complianceFocus: [],
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });
  
  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);
  
  // Handle phone number change
  const handlePhoneChange = (value: string) => {
    setValue('phoneNumber', value, { shouldValidate: true });
    if (otpSent) {
      setOtpSent(false);
      setValue('phoneVerified', false);
    }
  };
  
  // Send OTP to the provided phone number
  const handleSendOTP = async () => {
    // Validate phone number first
    const isValid = await trigger('phoneNumber');
    if (!isValid) return;
    
    const phoneNumber = getValues('phoneNumber');
    
    setSendingOtp(true);
    try {
      // Call the send OTP API endpoint
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }
      
      // Set the OTP as sent and start countdown
      setOtpSent(true);
      setResendCooldown(60); // 60 seconds cooldown
      
      toast({
        title: "OTP Sent",
        description: "A 6-digit verification code has been sent to your phone.",
      });
      
      // If we're in development mode, also show the OTP (for easier testing)
      if (data.code) {
        console.log("Development OTP code:", data.code);
        toast({
          title: "Development OTP",
          description: `Use code: ${data.code}`,
          duration: 10000,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to send OTP",
        description: error instanceof Error ? error.message : "Please check your phone number and try again.",
        variant: "destructive",
      });
    } finally {
      setSendingOtp(false);
    }
  };
  
  // Verify the provided OTP
  const handleVerifyOTP = async () => {
    const otpValue = getValues('otp');
    const phoneNumber = getValues('phoneNumber');
    
    if (!otpValue || otpValue.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit code sent to your phone.",
        variant: "destructive",
      });
      return;
    }
    
    setVerifyingOtp(true);
    try {
      // Call the verify OTP API endpoint
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber,
          code: otpValue 
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to verify OTP');
      }
      
      // Set phone number as verified
      setValue('phoneVerified', true);
      
      toast({
        title: "Phone Verified",
        description: "Your phone number has been successfully verified.",
      });
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "The code you entered is incorrect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Handle industry selection
  const handleIndustryChange = (value: string) => {
    setValue('industryType', value, { shouldValidate: true });
  };

  // Handle compliance focus selection
  const handleComplianceFocusChange = (value: string) => {
    const currentValues = [...selectedComplianceFocus];
    const index = currentValues.indexOf(value);
    
    if (index === -1) {
      currentValues.push(value);
    } else {
      currentValues.splice(index, 1);
    }
    
    // Update the selected values
    setSelectedComplianceFocus(currentValues);
    setValue('complianceFocus', currentValues, { shouldValidate: true });
    
    // Show a toast if removing the last option (but still allow it)
    if (currentValues.length === 0 && index !== -1) {
      toast({
        title: "Note",
        description: "At least one compliance focus is required",
      });
    }
  };
  
  const onSubmit = async (data: RegisterFormValues) => {
    // Check if phone number is verified
    if (!data.phoneVerified) {
      toast({
        title: "Phone Verification Required",
        description: "Please verify your phone number to continue.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Create a username from the first name and last name
      const username = `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}`;
      const fullName = `${data.firstName} ${data.lastName}`;
      
      // Register with all collected data
      const newUser = await registerUser(
        username, 
        data.email, 
        data.password, 
        fullName,
        data.companyName,
        data.industryType,
        data.complianceFocus,
        data.phoneNumber // Add phone number to registration data
      );
      
      // Save user ID for the confirmation page
      localStorage.setItem('registeredUserId', String(newUser.id));
      
      toast({
        title: "Registration Successful",
        description: "Your 15-day trial has started.",
      });
      
      // Redirect to registration confirmation page
      setLocation("/registration-confirmation");
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: "There was an error registering your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-end">
        <div>
          <span className="text-sm text-gray-600">Already have an account?</span>{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Log In →
          </Link>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-4xl">
          {/* Heading Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Get Started with TraceX Comply</h1>
            <p className="text-gray-600">
              Register your business and automate ESG reporting with AI-driven compliance solutions.
            </p>
          </div>
          
          {/* Progress Indicator */}
          <div className="mb-8 flex justify-center">
            <div className="w-full max-w-md flex">
              <div className="flex-1">
                <div className="h-1 bg-primary rounded"></div>
                <div className="mt-2 text-center text-sm font-medium">Account Details</div>
              </div>
              <div className="flex-1">
                <div className="h-1 bg-gray-200 rounded"></div>
                <div className="mt-2 text-center text-sm text-gray-500">Confirmation</div>
              </div>
            </div>
          </div>
          
          {/* Registration Form */}
          <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Enter your company name"
                  {...register("companyName")}
                  className={errors.companyName ? "border-red-300" : ""}
                />
                {errors.companyName && (
                  <p className="text-sm text-red-500">{errors.companyName.message}</p>
                )}
              </div>
              
              {/* First Name & Last Name - Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="Enter first name"
                    {...register("firstName")}
                    className={errors.firstName ? "border-red-300" : ""}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500">{errors.firstName.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Enter last name"
                    {...register("lastName")}
                    className={errors.lastName ? "border-red-300" : ""}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
              
              {/* Business Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Business Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  {...register("email")}
                  className={errors.email ? "border-red-300" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              
              {/* Phone Number with Country Code */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <div className="flex gap-2 items-start">
                  <div className={`flex-grow ${watch('phoneVerified') ? 'opacity-70' : ''}`}>
                    <PhoneInput
                      country={'us'}
                      value={watch('phoneNumber')}
                      onChange={handlePhoneChange}
                      inputProps={{
                        id: 'phoneNumber',
                        name: 'phoneNumber',
                        required: true,
                        disabled: watch('phoneVerified')
                      }}
                      containerClass={`w-full ${errors.phoneNumber ? 'phone-input-error' : ''}`}
                      inputClass={`w-full ${watch('phoneVerified') ? 'bg-gray-100' : ''}`}
                      buttonClass={watch('phoneVerified') ? 'bg-gray-100' : ''}
                      disableSearchIcon
                    />
                  </div>
                  {!watch('phoneVerified') && (
                    <Button 
                      type="button" 
                      onClick={handleSendOTP}
                      disabled={sendingOtp || !watch('phoneNumber') || watch('phoneNumber').length < 8}
                      className="whitespace-nowrap"
                      variant={otpSent ? "outline" : "default"}
                    >
                      {sendingOtp ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : otpSent && resendCooldown > 0 ? (
                        `Resend (${resendCooldown}s)`
                      ) : otpSent ? (
                        "Resend OTP"
                      ) : (
                        "Send OTP"
                      )}
                    </Button>
                  )}
                  {watch('phoneVerified') && (
                    <div className="flex items-center px-3 py-2 bg-green-50 text-green-700 rounded border border-green-200">
                      <span className="text-sm font-medium">✓ Verified</span>
                    </div>
                  )}
                </div>
                {errors.phoneNumber && (
                  <p className="text-sm text-red-500">{errors.phoneNumber.message}</p>
                )}
                
                {/* OTP Input Field (appears after OTP is sent) */}
                {otpSent && !watch('phoneVerified') && (
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="otp">Enter Verification Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="otp"
                        placeholder="6-digit code"
                        maxLength={6}
                        {...register("otp")}
                        className={`flex-grow ${errors.otp ? "border-red-300" : ""}`}
                      />
                      <Button 
                        type="button" 
                        onClick={handleVerifyOTP}
                        disabled={verifyingOtp || (getValues('otp') || '').length !== 6}
                      >
                        {verifyingOtp ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          "Verify"
                        )}
                      </Button>
                    </div>
                    {errors.otp && (
                      <p className="text-sm text-red-500">{errors.otp.message}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      A 6-digit verification code has been sent to your phone.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Industry Type */}
              <div className="space-y-2">
                <Label htmlFor="industryType">Industry Type</Label>
                <Select onValueChange={handleIndustryChange}>
                  <SelectTrigger className={errors.industryType ? "border-red-300" : ""}>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industryOptions.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.industryType && (
                  <p className="text-sm text-red-500">{errors.industryType.message}</p>
                )}
              </div>
              
              {/* ESG Compliance Focus */}
              <div className="space-y-3">
                <Label>ESG Compliance Focus</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="eudr" 
                      checked={selectedComplianceFocus.includes('EUDR')}
                      onCheckedChange={() => handleComplianceFocusChange('EUDR')}
                    />
                    <Label htmlFor="eudr" className="font-normal">EUDR</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="fsma" 
                      checked={selectedComplianceFocus.includes('FSMA')}
                      onCheckedChange={() => handleComplianceFocusChange('FSMA')}
                    />
                    <Label htmlFor="fsma" className="font-normal">FSMA</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="csrd" 
                      checked={selectedComplianceFocus.includes('CSRD')}
                      onCheckedChange={() => handleComplianceFocusChange('CSRD')}
                    />
                    <Label htmlFor="csrd" className="font-normal">CSRD</Label>
                  </div>
                </div>
                {errors.complianceFocus && (
                  <p className="text-sm text-red-500">{errors.complianceFocus.message}</p>
                )}
              </div>
              
              {/* Password with Show/Hide */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    {...register("password")}
                    className={errors.password ? "border-red-300 pr-10" : "pr-10"}
                  />
                  <button 
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>
              
              {/* Confirm Password with Show/Hide */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    {...register("confirmPassword")}
                    className={errors.confirmPassword ? "border-red-300 pr-10" : "pr-10"}
                  />
                  <button 
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>
              
              {/* Terms and Conditions */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acceptTerms"
                  checked={watch("acceptTerms")}
                  onCheckedChange={(checked) => {
                    setValue("acceptTerms", checked === true, { shouldValidate: true });
                  }}
                />
                <Label 
                  htmlFor="acceptTerms" 
                  className="text-sm font-normal cursor-pointer"
                  onClick={() => setValue("acceptTerms", !watch("acceptTerms"), { shouldValidate: true })}
                >
                  I accept the <a href="#" className="text-primary underline">Terms of Service</a> and <a href="#" className="text-primary underline">Privacy Policy</a>
                </Label>
              </div>
              {errors.acceptTerms && (
                <p className="text-sm text-red-500 -mt-4">{errors.acceptTerms.message}</p>
              )}
              
              {/* Create Account Button */}
              <Button 
                type="submit" 
                className="w-full bg-primary" 
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
              
              {/* Or continue with */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>
              
              {/* OAuth Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5">
                    <GoogleIcon />
                  </span>
                  <span>Google</span>
                </Button>
                <Button variant="outline" className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5">
                    <MicrosoftIcon />
                  </span>
                  <span>Microsoft</span>
                </Button>
              </div>
            </form>
          </div>
          
          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-primary text-xl">📊</span>
              </div>
              <h3 className="font-semibold mb-2">Automated ESG Reporting</h3>
              <p className="text-sm text-gray-600">
                Save time with AI-powered report generation and analysis
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-primary text-xl">📈</span>
              </div>
              <h3 className="font-semibold mb-2">Real-time Compliance Dashboard</h3>
              <p className="text-sm text-gray-600">
                Monitor your ESG metrics in real-time with interactive dashboards
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-primary text-xl">🔒</span>
              </div>
              <h3 className="font-semibold mb-2">Secure & GDPR Compliant</h3>
              <p className="text-sm text-gray-600">
                Your data is protected with enterprise-grade security
              </p>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-500">
        <div className="flex justify-center space-x-6 mb-4">
          <a href="#" className="hover:text-gray-800">Privacy Policy</a>
          <a href="#" className="hover:text-gray-800">Terms of Service</a>
          <a href="#" className="hover:text-gray-800">Contact Support</a>
        </div>
        <p>Copyright © ESGCompliance 2025</p>
      </footer>
    </div>
  );
}