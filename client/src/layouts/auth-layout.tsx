import { ReactNode } from "react";
import { Link } from "wouter";
import enumeraLogo from "@/assets/enumera-logo.png";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#f5f8fa] items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={enumeraLogo} 
              alt="Enumera" 
              className="h-12 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Enumera Compliance Dashboard</h1>
          <p className="text-gray-500 mt-2">European Union Deforestation Regulation</p>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-8">
          {children}
        </div>
        
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>© 2025 Enumera. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
