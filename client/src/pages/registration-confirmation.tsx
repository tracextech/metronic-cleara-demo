import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckIcon, BookOpenIcon, LifeBuoyIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function RegistrationConfirmation() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(5);
  
  // Check if user exists. In real app, we'd fetch the user details from API
  useEffect(() => {
    if (!user) {
      console.log("No user found in registration confirmation");
    }
  }, [user]);
  
  // Auto-redirect to login after 5 seconds
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setLocation("/login");
    }
  }, [countdown, setLocation]);
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-4xl">
        {/* Progress Indicator */}
        <div className="mb-12 flex justify-center">
          <div className="w-full max-w-md flex">
            <div className="flex-1">
              <div className="h-1 bg-primary rounded-l"></div>
              <div className="mt-2 text-center text-sm font-medium flex items-center justify-center">
                <span className="w-5 h-5 bg-primary text-white rounded-full inline-flex items-center justify-center mr-2 text-xs">1</span>
                Account Details
              </div>
            </div>
            <div className="flex-1">
              <div className="h-1 bg-primary rounded-r"></div>
              <div className="mt-2 text-center text-sm font-medium flex items-center justify-center">
                <span className="w-5 h-5 bg-primary text-white rounded-full inline-flex items-center justify-center mr-2 text-xs">2</span>
                Confirmation
              </div>
            </div>
          </div>
        </div>
        
        {/* Confirmation Content */}
        <div className="bg-white rounded-lg shadow-sm p-12 max-w-xl mx-auto text-center">
          {/* Success Icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Welcome to TraceX Comply!</h1>
          <p className="text-gray-600 mb-8">Your 15-day trial has been successfully activated. Please wait — you will be redirected to the login screen.</p>
          
          <div className="flex items-center justify-center mb-8">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
            <span className="text-gray-600">Redirecting in {countdown} seconds...</span>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>© 2025 ESGCompliance. All rights reserved.</p>
      </footer>
    </div>
  );
}