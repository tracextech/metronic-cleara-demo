import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepProps {
  index: number;
  title: string;
  isActive: boolean;
  isCompleted: boolean;
}

function Step({ index, title, isActive, isCompleted }: StepProps) {
  return (
    <div className="flex flex-col items-center max-w-24">
      <div 
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full border transition-colors",
          isActive ? "bg-primary border-primary text-white" : 
          isCompleted ? "bg-primary/10 border-primary text-primary" : 
          "bg-gray-100 border-gray-300 text-gray-500"
        )}
      >
        {isCompleted ? <Check className="h-4 w-4" /> : index}
      </div>
      <span 
        className={cn(
          "mt-2 text-xs font-medium text-center whitespace-nowrap", 
          isActive ? "text-primary" : 
          isCompleted ? "text-primary" : 
          "text-gray-500"
        )}
      >
        {title}
      </span>
    </div>
  );
}

interface StepConfig {
  label: string;
}

interface StepperProps {
  steps: (string | StepConfig)[];
  currentStep: number;
  completedSteps: number[];
}

export default function Stepper({ steps, currentStep, completedSteps }: StepperProps) {
  return (
    <div className="flex justify-center items-start w-full px-4">
      <div className="flex items-center justify-between w-full max-w-4xl">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isCompleted = completedSteps.includes(stepNumber);
          const stepTitle = typeof step === 'string' ? step : step.label;
          
          return (
            <div key={index} className="flex items-center">
              <div className="flex flex-col items-center">
                <Step 
                  index={stepNumber}
                  title={stepTitle}
                  isActive={isActive}
                  isCompleted={isCompleted}
                />
              </div>
              
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    "h-0.5 w-20 mx-6",
                    isCompleted || (completedSteps.includes(stepNumber) && isActive) ? 
                    "bg-primary" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}