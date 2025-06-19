import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

// Define the activation schema
const activationSchema = z.object({
  password: z.string().min(8, {
    message: "Password must be at least 8 characters",
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ActivationData = z.infer<typeof activationSchema>;

export default function ActivateSupplier() {
  const { token } = useParams();
  const [_, navigate] = useLocation();
  const [tokenData, setTokenData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isActivated, setIsActivated] = useState(false);

  // Initialize form
  const form = useForm<ActivationData>({
    resolver: zodResolver(activationSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Verify token on component mount
  useEffect(() => {
    async function verifyToken() {
      try {
        const response = await fetch(`/api/supplier-activation/${token}`);
        const data = await response.json();

        if (data.valid) {
          setTokenData(data);
          setIsTokenValid(true);
        } else {
          setErrorMessage(data.message || "Invalid or expired activation link");
        }
      } catch (error) {
        console.error("Error verifying token:", error);
        setErrorMessage("Failed to verify activation link");
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      verifyToken();
    } else {
      setErrorMessage("No activation token provided");
      setIsLoading(false);
    }
  }, [token]);

  // Handle form submission
  async function onSubmit(data: ActivationData) {
    try {
      setIsLoading(true);
      setErrorMessage("");
      
      const response = await fetch(`/api/supplier-activation/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: data.password,
          confirmPassword: data.confirmPassword
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setIsActivated(true);
        // If the user was automatically logged in, we could redirect to dashboard
        // but for now we'll show the success message
      } else {
        setErrorMessage(result.message || "Failed to activate account");
      }
    } catch (error) {
      console.error("Error activating account:", error);
      setErrorMessage("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Account Activation</CardTitle>
            <CardDescription>Verifying your activation link...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show success message after activation
  if (isActivated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Account Activated!</CardTitle>
            <CardDescription>Your supplier account has been successfully set up.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-6 p-6">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="text-center">
                You can now log in to the EUDR Compliance Platform using your email address and the password you just created.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate("/login")}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show error message for invalid token
  if (!isTokenValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Activation Failed</CardTitle>
            <CardDescription>There was a problem with your activation link</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            <p className="text-center text-sm text-muted-foreground">
              If you believe this is an error, please contact your organization
              administrator or support for assistance.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show activation form
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Activate Your Account</CardTitle>
          <CardDescription>
            Set up your account to access the EUDR Compliance Platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokenData && tokenData.supplier && (
            <div className="mb-6">
              <h3 className="font-medium">Supplier Information</h3>
              <div className="mt-2 rounded-lg bg-muted p-4 text-sm">
                <p><span className="font-medium">Company:</span> {tokenData.supplier.name}</p>
                <p><span className="font-medium">Email:</span> {tokenData.supplier.email}</p>
                {tokenData.supplier.firstName && tokenData.supplier.lastName && (
                  <p><span className="font-medium">Contact:</span> {tokenData.supplier.firstName} {tokenData.supplier.lastName}</p>
                )}
              </div>
            </div>
          )}

          <Separator className="my-4" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Create Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormDescription>
                      Password must be at least 8 characters long
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {errorMessage && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Activate Account"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}