import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Status badge variants
const statusVariants = {
  "freeTrial": { variant: "outline", label: "Free Trial" },
  "licensed": { variant: "default", label: "Licensed" },
  "pending": { variant: "secondary", label: "Pending" },
  "approved": { variant: "success", label: "Approved" },
  "rejected": { variant: "destructive", label: "Rejected" }
};

export default function EntitiesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [openNewEntityDialog, setOpenNewEntityDialog] = useState(false);
  const [openInviteDialog, setOpenInviteDialog] = useState(false);
  const { toast } = useToast();

  // Fetch entities based on active tab
  const { data: entities, isLoading } = useQuery({
    queryKey: ["/api/entities", activeTab],
    queryFn: async () => {
      const statusParam = activeTab !== "all" ? `status=${activeTab}` : "";
      const res = await fetch(`/api/entities?${statusParam}`);
      if (!res.ok) throw new Error("Failed to fetch entities");
      return res.json();
    },
  });

  // Fetch entity statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/entities/stats"],
    queryFn: async () => {
      const res = await fetch("/api/entities/stats");
      if (!res.ok) throw new Error("Failed to fetch entity stats");
      return res.json();
    },
  });

  // Fetch all invitations
  const { data: invitations } = useQuery({
    queryKey: ["/api/invitations"],
    queryFn: async () => {
      const res = await fetch("/api/invitations");
      if (!res.ok) throw new Error("Failed to fetch invitations");
      console.log("Fetching invitations from API");
      const data = await res.json();
      console.log("Received invitations:", data);
      return data;
    },
  });

  // Create new entity mutation
  const createEntityMutation = useMutation({
    mutationFn: async (newEntity: any) => {
      const res = await apiRequest("/api/entities", { 
        method: "POST", 
        body: JSON.stringify(newEntity) 
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Entity created",
        description: "The new entity has been created successfully.",
      });
      setOpenNewEntityDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create entity",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: async (invitation: any) => {
      const res = await apiRequest("/api/invitations", {
        method: "POST",
        body: JSON.stringify(invitation)
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "The invitation has been sent successfully.",
      });
      setOpenInviteDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update entity status mutation
  const updateEntityStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest(`/api/entities/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "The entity status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Resend invitation mutation
  const resendInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const res = await apiRequest(`/api/invitations/${invitationId}/resend`, {
        method: "POST"
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation resent",
        description: "The invitation has been resent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resend invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update entity registration status mutation
  const updateRegistrationStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest(`/api/entities/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ registrationStatus: status })
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration status updated",
        description: "The registration status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update registration status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle new entity form submission
  const handleNewEntitySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createEntityMutation.mutate({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      website: formData.get("website"),
      country: formData.get("country"),
      address: formData.get("address"),
      registrationNumber: formData.get("registrationNumber"),
      taxId: formData.get("taxId"),
      status: "freeTrial", // Default status for manually created entities
      registrationStatus: "approved", // Default approved for manually created
    });
  };

  // Handle invitation form submission
  const handleInviteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createInvitationMutation.mutate({
      email: formData.get("email"),
      name: formData.get("name"),
      fullName: formData.get("fullName"),
      invitedBy: 1, // Admin user ID
    });
  };

  // Handle license status change
  const handleLicenseStatusChange = (entityId: number, status: string) => {
    updateEntityStatusMutation.mutate({ id: entityId, status });
  };

  // Handle registration status change
  const handleRegistrationStatusChange = (entityId: number, status: string) => {
    updateRegistrationStatusMutation.mutate({ id: entityId, status });
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entity Management</h1>
          <p className="text-muted-foreground">
            Manage entities, licenses, and invitations
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openInviteDialog} onOpenChange={setOpenInviteDialog}>
            <DialogTrigger asChild>
              <Button>Send Invitation</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New Entity</DialogTitle>
                <DialogDescription>
                  Send an invitation to a company to join the platform.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInviteSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Company Name</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      placeholder="Global Compliance Inc."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fullName">Contact's Full Name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      required
                      placeholder="John Smith"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expiryInfo">Expiry Date</Label>
                    <div className="p-2 text-sm text-muted-foreground border rounded-md bg-muted/10">
                      The invitation will expire in 48 hours if not accepted.
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenInviteDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createInvitationMutation.isPending}>
                    {createInvitationMutation.isPending ? "Sending..." : "Send Invitation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium">Total Entities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? stats.total : <Skeleton className="h-8 w-16" />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium">Free Trial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? stats.freeTrial : <Skeleton className="h-8 w-16" />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium">Licensed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? stats.licensed : <Skeleton className="h-8 w-16" />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium">Pending Registration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? stats.pending : <Skeleton className="h-8 w-16" />}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" onValueChange={setActiveTab} className="mb-8">
        <TabsList>
          <TabsTrigger value="all">All Entities</TabsTrigger>
          <TabsTrigger value="freeTrial">Free Trial</TabsTrigger>
          <TabsTrigger value="licensed">Licensed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <EntityTable 
            entities={entities || []} 
            isLoading={isLoading}
            onLicenseStatusChange={handleLicenseStatusChange}
            onRegistrationStatusChange={handleRegistrationStatusChange}
          />
        </TabsContent>
        
        <TabsContent value="freeTrial" className="mt-4">
          <EntityTable 
            entities={entities || []} 
            isLoading={isLoading}
            onLicenseStatusChange={handleLicenseStatusChange}
            onRegistrationStatusChange={handleRegistrationStatusChange}
          />
        </TabsContent>
        
        <TabsContent value="licensed" className="mt-4">
          <EntityTable 
            entities={entities || []} 
            isLoading={isLoading}
            onLicenseStatusChange={handleLicenseStatusChange}
            onRegistrationStatusChange={handleRegistrationStatusChange}
          />
        </TabsContent>
        
        <TabsContent value="pending" className="mt-4">
          <EntityTable 
            entities={entities || []} 
            isLoading={isLoading}
            onLicenseStatusChange={handleLicenseStatusChange}
            onRegistrationStatusChange={handleRegistrationStatusChange}
          />
        </TabsContent>
      </Tabs>

      <h2 className="text-xl font-bold mt-8 mb-4">Entity Invitations</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Sent Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!invitations ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex justify-center py-4">
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No invitations found
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((invitation: any) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.name}</TableCell>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {invitation.status === 'expired' ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : invitation.status === 'accepted' ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>
                      ) : (
                        <Badge variant="secondary">Sent</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {invitation.status === 'expired' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => resendInvitationMutation.mutate(invitation.id)}
                          disabled={resendInvitationMutation.isPending}
                        >
                          {resendInvitationMutation.isPending && resendInvitationMutation.variables === invitation.id 
                            ? "Sending..." 
                            : "Resend"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

interface EntityTableProps {
  entities: any[];
  isLoading: boolean;
  onLicenseStatusChange: (entityId: number, status: string) => void;
  onRegistrationStatusChange: (entityId: number, status: string) => void;
}

function EntityTable({ 
  entities, 
  isLoading,
  onLicenseStatusChange,
  onRegistrationStatusChange
}: EntityTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>License Status</TableHead>
              <TableHead>Trial End Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : entities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No entities found
                </TableCell>
              </TableRow>
            ) : (
              entities.map((entity) => (
                <TableRow key={entity.id}>
                  <TableCell className="font-medium">{entity.name}</TableCell>
                  <TableCell>{entity.email}</TableCell>
                  <TableCell>{entity.country}</TableCell>
                  <TableCell>
                    <Select 
                      defaultValue={entity.status} 
                      onValueChange={(value) => onLicenseStatusChange(entity.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freeTrial">
                          <Badge variant="outline" className="mr-2">Free Trial</Badge>
                        </SelectItem>
                        <SelectItem value="licensed">
                          <Badge className="mr-2">Licensed</Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell>
                    {entity.trialEndDate
                      ? new Date(entity.trialEndDate).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/entities/${entity.id}`}>
                      <Button size="sm" variant="outline">
                        Manage
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}