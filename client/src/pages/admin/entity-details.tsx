import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const statusVariants = {
  "freeTrial": { variant: "outline", label: "Free Trial" },
  "licensed": { variant: "default", label: "Licensed" },
  "pending": { variant: "secondary", label: "Pending" },
  "approved": { variant: "success", label: "Approved" },
  "rejected": { variant: "destructive", label: "Rejected" }
};

export default function EntityDetailsPage() {
  const [, params] = useRoute("/admin/entities/:id");
  const entityId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();

  // Fetch entity details
  const { data: entity, isLoading } = useQuery({
    queryKey: [`/api/entities/${entityId}`],
    queryFn: async () => {
      if (!entityId) return null;
      const res = await fetch(`/api/entities/${entityId}`);
      if (!res.ok) throw new Error("Failed to fetch entity details");
      return res.json();
    },
    enabled: !!entityId,
  });

  // Update modules mutation
  const updateModulesMutation = useMutation({
    mutationFn: async (modules: any) => {
      const res = await apiRequest("PATCH", `/api/entities/${entityId}/modules`, modules);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Modules updated",
        description: "Entity modules have been updated successfully.",
      });
      queryClient.invalidateQueries();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update modules",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update entity status mutation
  const updateEntityStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PATCH", `/api/entities/${entityId}`, { status });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Status updated",
        description: "Entity status has been updated successfully.",
      });
      queryClient.invalidateQueries();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Local state for module toggles
  const [modules, setModules] = useState({
    supplierOnboarding: false,
    customerOnboarding: false,
    eudrDeclaration: false,
    supplierAssessment: false,
  });

  // Update local state when entity data is loaded
  useEffect(() => {
    if (entity?.modules) {
      setModules({
        supplierOnboarding: entity.modules.supplierOnboarding || false,
        customerOnboarding: entity.modules.customerOnboarding || false,
        eudrDeclaration: entity.modules.eudrDeclaration || false,
        supplierAssessment: entity.modules.supplierAssessment || false,
      });
    }
  }, [entity]);

  // Handle module toggle
  const handleModuleToggle = (module: string) => {
    const updatedModules = {
      ...modules,
      [module]: !modules[module as keyof typeof modules],
    };
    setModules(updatedModules);
    updateModulesMutation.mutate(updatedModules);
  };

  // Handle license status change
  const handleStatusChange = (status: string) => {
    updateEntityStatusMutation.mutate(status);
  };

  if (isLoading || !entity) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        
        <div className="grid gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{entity.name}</h1>
          <p className="text-muted-foreground">{entity.email}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">License Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span>Current Status:</span>
                <Badge variant={statusVariants[entity.status as keyof typeof statusVariants]?.variant as any || "default"}>
                  {statusVariants[entity.status as keyof typeof statusVariants]?.label || entity.status}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Registration:</span>
                {entity.registrationStatus === 'approved' ? (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                    {statusVariants[entity.registrationStatus as keyof typeof statusVariants]?.label || entity.registrationStatus}
                  </Badge>
                ) : (
                  <Badge variant={statusVariants[entity.registrationStatus as keyof typeof statusVariants]?.variant as any || "secondary"}>
                    {statusVariants[entity.registrationStatus as keyof typeof statusVariants]?.label || entity.registrationStatus}
                  </Badge>
                )}
              </div>
              
              {entity.trialStartDate && (
                <div className="flex justify-between items-center">
                  <span>Trial Start:</span>
                  <span>{new Date(entity.trialStartDate).toLocaleDateString()}</span>
                </div>
              )}
              
              {entity.trialEndDate && (
                <div className="flex justify-between items-center">
                  <span>Trial End:</span>
                  <span>{new Date(entity.trialEndDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button 
              className="w-full" 
              variant={entity.status === "licensed" ? "outline" : "default"}
              onClick={() => handleStatusChange(entity.status === "licensed" ? "freeTrial" : "licensed")}
            >
              {entity.status === "licensed" ? "Convert to Free Trial" : "Convert to Licensed"}
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium mb-1">Email</h3>
                <p className="text-sm">{entity.email || "Not provided"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Phone</h3>
                <p className="text-sm">{entity.phone || "Not provided"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Website</h3>
                <p className="text-sm">
                  {entity.website ? (
                    <a 
                      href={entity.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {entity.website}
                    </a>
                  ) : (
                    "Not provided"
                  )}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Address</h3>
                <p className="text-sm">{entity.address || "Not provided"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Country</h3>
                <p className="text-sm">{entity.country || "Not provided"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Registration Number</h3>
                <p className="text-sm">{entity.registrationNumber || "Not provided"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Module Management</CardTitle>
          <CardDescription>
            Enable or disable modules for this entity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="supplierOnboarding">Supplier Onboarding</Label>
                <p className="text-xs text-muted-foreground">
                  Manage suppliers and supplier data
                </p>
              </div>
              <Switch
                id="supplierOnboarding"
                checked={modules.supplierOnboarding}
                onCheckedChange={() => handleModuleToggle("supplierOnboarding")}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="customerOnboarding">Customer Onboarding</Label>
                <p className="text-xs text-muted-foreground">
                  Manage customers and customer data
                </p>
              </div>
              <Switch
                id="customerOnboarding"
                checked={modules.customerOnboarding}
                onCheckedChange={() => handleModuleToggle("customerOnboarding")}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="eudrDeclaration">EUDR Declaration</Label>
                <p className="text-xs text-muted-foreground">
                  Create and manage EUDR declarations
                </p>
              </div>
              <Switch
                id="eudrDeclaration"
                checked={modules.eudrDeclaration}
                onCheckedChange={() => handleModuleToggle("eudrDeclaration")}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="supplierAssessment">Supplier Assessment</Label>
                <p className="text-xs text-muted-foreground">
                  Assess suppliers and manage questionnaires
                </p>
              </div>
              <Switch
                id="supplierAssessment"
                checked={modules.supplierAssessment}
                onCheckedChange={() => handleModuleToggle("supplierAssessment")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="activity" className="mb-8">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-4">
                No recent activity for this entity
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-4">
                No documents found for this entity
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-4">
                No users associated with this entity
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}