import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  CalendarIcon, 
  CheckIcon, 
  FilterIcon, 
  MoreHorizontal, 
  Ban, 
  RefreshCw, 
  UploadCloud 
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Invitation {
  id: number;
  email: string;
  name: string;
  fullName?: string;
  token: string;
  status: string;
  licenseStatus: string; // Added license status field
  invitedBy: number;
  createdAt: string;
  expiresAt: string;
}

export default function InvitationsPage() {
  const [openInviteDialog, setOpenInviteDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [nameFilter, setNameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });
  const { toast } = useToast();

  // Fetch all invitations
  const { data: invitations, isLoading, error } = useQuery({
    queryKey: ["/api/invitations"],
    queryFn: async () => {
      console.log("Fetching invitations from API");
      const res = await fetch("/api/invitations");
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API error:", errorText);
        throw new Error(`Failed to fetch invitations: ${errorText}`);
      }
      
      const data = await res.json();
      console.log("Received invitations:", data);
      return data;
    },
    // Don't cache empty results during development
    staleTime: 10000
  });

  // Define invitation interface
  interface Invitation {
    id: number;
    email: string;
    name: string;
    fullName?: string;
    token: string;
    status: string;
    licenseStatus?: string;
    invitedBy: number;
    createdAt: string;
    expiresAt: string;
  }
  
  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: async (invitation: {
      email: FormDataEntryValue | null;
      name: FormDataEntryValue | null;
      fullName: FormDataEntryValue | null;
      expiryDate: string;
      invitedBy: number;
    }) => {
      return await apiRequest("/api/invitations", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invitation)
      });
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "The invitation has been sent successfully.",
      });
      setOpenInviteDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update invitation status mutation
  const updateInvitationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest(`/api/invitations/${id}`, {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
    },
    onSuccess: () => {
      toast({
        title: "Invitation updated",
        description: "The invitation status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle invitation form submission
  const handleInviteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Get expiry date from form
    const expiryDate = formData.get("expiryDate") as string;
    
    // Validate expiry date is in the future
    const selectedDate = new Date(expiryDate);
    const today = new Date();
    
    if (selectedDate <= today) {
      toast({
        title: "Invalid expiry date",
        description: "Expiry date must be in the future",
        variant: "destructive",
      });
      return;
    }
    
    // Combine the contact name and company name since we don't have a separate column
    const companyName = formData.get("name") as string;
    const contactFullName = formData.get("fullName") as string;
    const combinedName = `${contactFullName} (${companyName})`;
    
    createInvitationMutation.mutate({
      email: formData.get("email"),
      name: combinedName,
      fullName: "", // Not used, as we're combining in the name field
      expiryDate: expiryDate,
      invitedBy: 1, // Admin user ID
    });
  };

  // Handle invitation status change
  const handleStatusChange = (invitationId: number, status: string) => {
    updateInvitationMutation.mutate({ id: invitationId, status });
  };

  // Helper to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Filter invitations based on criteria
  const filteredInvitations = useMemo(() => {
    if (!invitations) return [];
    
    return invitations.filter((invitation: Invitation) => {
      // Status filter
      if (statusFilter.length > 0 && !statusFilter.includes(invitation.status)) {
        return false;
      }
      
      // Name filter (check both parsed company name and full name)
      if (nameFilter) {
        const match = invitation.name.match(/(.*?)\s*\((.*?)\)$/);
        const contactName = match ? match[1].trim() : "";
        const companyName = match ? match[2].trim() : invitation.name;
        
        const nameMatches = 
          companyName.toLowerCase().includes(nameFilter.toLowerCase()) || 
          contactName.toLowerCase().includes(nameFilter.toLowerCase());
          
        if (!nameMatches) {
          return false;
        }
      }
      
      // Email filter
      if (emailFilter && !invitation.email.toLowerCase().includes(emailFilter.toLowerCase())) {
        return false;
      }
      
      // Date range filter
      if (dateRange.start || dateRange.end) {
        const invitationDate = new Date(invitation.createdAt);
        
        if (dateRange.start && invitationDate < dateRange.start) {
          return false;
        }
        
        if (dateRange.end) {
          // End of the selected day (11:59:59 PM)
          const endOfDay = new Date(dateRange.end);
          endOfDay.setHours(23, 59, 59, 999);
          
          if (invitationDate > endOfDay) {
            return false;
          }
        }
      }
      
      return true;
    });
  }, [invitations, statusFilter, nameFilter, emailFilter, dateRange]);

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invitations Management</h1>
          <p className="text-muted-foreground">
            Track and manage entity invitations
          </p>
        </div>
        <Dialog open={openInviteDialog} onOpenChange={setOpenInviteDialog}>
          <DialogTrigger asChild>
            <Button>Send New Invitation</Button>
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
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    name="expiryDate"
                    type="date"
                    required
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // Tomorrow
                  />
                  <p className="text-xs text-muted-foreground">
                    The invitation will expire on this date if not accepted.
                  </p>
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

      <Card>
        <CardHeader className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <CardTitle>Customer Invitations</CardTitle>
            <div className="flex gap-2">
              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2 lg:px-3">
                    <FilterIcon className="h-3.5 w-3.5 mr-2" />
                    <span>Status</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuCheckboxItem
                    checked={statusFilter.includes("pending")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setStatusFilter([...statusFilter, "pending"]);
                      } else {
                        setStatusFilter(statusFilter.filter(s => s !== "pending"));
                      }
                    }}
                  >
                    Sent
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter.includes("accepted")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setStatusFilter([...statusFilter, "accepted"]);
                      } else {
                        setStatusFilter(statusFilter.filter(s => s !== "accepted"));
                      }
                    }}
                  >
                    Completed
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter.includes("expired")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setStatusFilter([...statusFilter, "expired"]);
                      } else {
                        setStatusFilter(statusFilter.filter(s => s !== "expired"));
                      }
                    }}
                  >
                    Expired
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Date Range Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 lg:px-3"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                    <span>Date Sent</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.start || new Date()}
                    selected={{
                      from: dateRange.start || undefined,
                      to: dateRange.end || undefined
                    }}
                    onSelect={(range) => {
                      setDateRange({
                        start: range?.from || null,
                        end: range?.to || null
                      });
                    }}
                  />
                  {(dateRange.start || dateRange.end) && (
                    <div className="px-4 pb-3 pt-0 flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setDateRange({ start: null, end: null })}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              
              {/* Clear all filters button */}
              {(statusFilter.length > 0 || nameFilter || emailFilter || dateRange.start || dateRange.end) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8"
                  onClick={() => {
                    setStatusFilter([]);
                    setNameFilter("");
                    setEmailFilter("");
                    setDateRange({ start: null, end: null });
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
          
          {/* Search filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Filter by company name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Filter by email address..."
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                className="h-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredInvitations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Contact Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Date Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>License Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvitations.map((invitation: Invitation) => {
                  // Extract contact name and company name from the combined string
                  // Format is: "Contact Name (Company Name)"
                  let contactName = "—";
                  let companyName = invitation.name;
                  
                  const match = invitation.name.match(/(.*?)\s*\((.*?)\)$/);
                  if (match) {
                    contactName = match[1].trim();
                    companyName = match[2].trim();
                  }
                  
                  return (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{companyName}</TableCell>
                      <TableCell>{contactName}</TableCell>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>{formatDate(invitation.createdAt)}</TableCell>
                      <TableCell>{formatDate(invitation.expiresAt)}</TableCell>
                      <TableCell>
                        <Badge 
                          className={cn(
                            invitation.status === "pending" && "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
                            invitation.status === "accepted" && "bg-green-100 text-green-700 hover:bg-green-100",
                            (invitation.status === "expired" || invitation.status === "rejected") && 
                              "bg-red-100 text-red-700 hover:bg-red-100"
                          )}
                          variant="outline"
                        >
                          {invitation.status === "pending" 
                            ? "Sent" 
                            : invitation.status === "accepted" 
                              ? "Completed" 
                              : invitation.status === "expired" 
                                ? "Expired"
                                : invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)
                          }
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={cn(
                            invitation.licenseStatus === "free" 
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                              : "bg-purple-100 text-purple-700 hover:bg-purple-100"
                          )}
                          variant="outline"
                        >
                          {invitation.licenseStatus === "free" ? "Free" : "Licensed"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => toast({
                                title: "Invitation Revoked",
                                description: `Invitation for ${companyName} revoked.`
                              })}
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Revoke Invitation
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toast({
                                title: "Invitation Resent",
                                description: `Invitation resent to ${invitation.email}.`
                              })}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Resend Invitation
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {invitation.licenseStatus === 'free' ? (
                              <DropdownMenuItem
                                onClick={() => toast({
                                  title: "License Upgraded",
                                  description: `${companyName} license upgraded to Licensed.`
                                })}
                              >
                                <UploadCloud className="h-4 w-4 mr-2" />
                                Upgrade License
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => toast({
                                  title: "License Downgraded",
                                  description: `${companyName} license downgraded to Free.`
                                })}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Downgrade License
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : invitations && invitations.length > 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No results match your filter criteria. Try adjusting or clearing filters.
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No invitations found. Send invitations to customers to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}