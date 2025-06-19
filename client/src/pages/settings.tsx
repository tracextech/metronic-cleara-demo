import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import HierarchyModal from "@/components/hierarchy-modal";
import GroupsTab from "@/components/groups-tab";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CardFooter } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getInitials } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus, ChevronDown, Network, UserPlus, MoreHorizontal, Camera, Edit3, Eye, Trash2, ChevronRight, GripVertical } from "lucide-react";
import { 
  FaUserCircle, 
  FaSave, 
  FaUpload, 
  FaTrashAlt, 
  FaSpinner, 
  FaLock, 
  FaCopy, 
  FaPlus, 
  FaEye, 
  FaPencilAlt, 
  FaCalendarAlt, 
  FaUsers, 
  FaFileAlt,
  FaTimes,
  FaExpandAlt,
  FaInfoCircle
} from "react-icons/fa";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FaEdit, FaTrash, FaCheckCircle } from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showHierarchyEditor, setShowHierarchyEditor] = useState(false);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    email: user?.email || "",
    fullName: user?.fullName || "",
    avatar: user?.avatar || "",
  });
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    email: true,
    browser: true,
    mobile: false,
    compliance: true,
    riskAlerts: true,
    documentExpiry: true,
    supplierUpdates: false,
    weeklyReports: true,
  });
  
  // API settings
  const [apiSettings, setApiSettings] = useState({
    apiEnabled: false,
    apiKey: "••••••••••••••••••••••••••••••",
    accessLevel: "read_only",
  });
  
  // Display settings
  const [displaySettings, setDisplaySettings] = useState({
    theme: "light",
    sidebarCompact: false,
    showMetrics: true,
    dateFormat: "MM/DD/YYYY",
    language: "en",
  });
  
  // Questionnaire state
  const [questionnaires, setQuestionnaires] = useState([
    {
      id: 1,
      name: "Supplier Assessment Form",
      lastUpdated: "Jan 15, 2023",
      supplierType: "Farmer",
      active: true,
    },
    {
      id: 2,
      name: "Trader Evaluation Form",
      lastUpdated: "Jan 10, 2023",
      supplierType: "Trader",
      active: false,
    }
  ]);
  
  // Role & Access Management state
  const [activeTab, setActiveTab] = useState('groups');
  
  const [roles, setRoles] = useState([
    {
      id: 1,
      name: "Admin",
      description: "Full system access with all permissions",
      users: 12,
      status: "active"
    },
    {
      id: 2,
      name: "Auditor",
      description: "View-only access to compliance data",
      users: 8,
      status: "active"
    }
  ]);
  
  // User assignment state
  const [users, setUsers] = useState([
    {
      id: 1,
      name: "Neeraj M.",
      email: "neeraj@gigitech.com",
      role: "Admin",
      lastLogin: "2h ago",
      status: "active",
      avatar: ""
    }
  ]);
  
  // Create new role modal state
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
    permissions: [
      { 
        module: "Product Masters", 
        view: true, 
        create: true, 
        edit: true, 
        delete: "N/A", 
        approve: "N/A",
        isExpandable: false,
        subModules: []
      },
      { 
        module: "Supplier Management", 
        view: true, 
        create: true, 
        edit: true, 
        delete: "N/A", 
        approve: "N/A",
        isExpandable: false,
        subModules: []
      },
      { 
        module: "Customer Management", 
        view: true, 
        create: true, 
        edit: true, 
        delete: "N/A", 
        approve: "N/A",
        isExpandable: false,
        subModules: []
      },
      { 
        module: "Inbound Declaration", 
        view: true, 
        create: true, 
        edit: true, 
        delete: "N/A", 
        approve: "trigger",
        isExpandable: true,
        subModules: [
          { name: "Geometry Check", view: "N/A", create: "N/A", edit: "N/A", delete: "N/A", approve: "System Trigger" },
          { name: "Satellite Check", view: "N/A", create: "N/A", edit: "N/A", delete: "N/A", approve: "Async Trigger" },
          { name: "Notify Non-Compliant Suppliers", view: "N/A", create: "N/A", edit: "N/A", delete: "N/A", approve: "Manual Trigger" },
          { name: "File in EU-IS", view: "N/A", create: "N/A", edit: "N/A", delete: "N/A", approve: "Submit to EU-IS" }
        ]
      },
      { 
        module: "Outbound Declaration", 
        view: true, 
        create: true, 
        edit: true, 
        delete: "N/A", 
        approve: "trigger",
        isExpandable: true,
        subModules: [
          { name: "Geometry Check", view: "N/A", create: "N/A", edit: "N/A", delete: "N/A", approve: "trigger" },
          { name: "Satellite Check", view: "N/A", create: "N/A", edit: "N/A", delete: "N/A", approve: "trigger" },
          { name: "Notify Non-Compliant Suppliers", view: "N/A", create: "N/A", edit: "N/A", delete: "N/A", approve: "trigger" },
          { name: "File in EU-IS", view: "N/A", create: "N/A", edit: "N/A", delete: "N/A", approve: "trigger" }
        ]
      },
      { 
        module: "Location Masters", 
        view: true, 
        create: true, 
        edit: true, 
        delete: "N/A", 
        approve: "N/A",
        isExpandable: false,
        subModules: []
      }
    ]
  });
  
  // Add new user modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "",
    groups: [] as string[],
  });
  
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All Roles");
  
  // Organization hierarchy groups data
  const organizationGroups = [
    { id: "1", name: "New Group - Test", level: 0 },
    { id: "2", name: "New Group - vajfcs", level: 1 },
    { id: "3", name: "New Group - 54gbag", level: 2 },
    { id: "4", name: "New Group - 8ktw6n", level: 1 },
    { id: "5", name: "New Group - 0eznrk", level: 2 },
    { id: "6", name: "New Group - wqtndq", level: 3 },
  ];
  
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    }, 1000);
  };
  
  const handleGenerateApiKey = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setApiSettings({
        ...apiSettings,
        apiKey: "eu7xk3tpsqm2z8n9v4rj5fblage6hw",
        apiEnabled: true,
      });
      
      toast({
        title: "API Key Generated",
        description: "Your new API key has been generated successfully.",
      });
    }, 1000);
  };
  
  const handleRevokeApiKey = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setApiSettings({
        ...apiSettings,
        apiKey: "••••••••••••••••••••••••••••••",
        apiEnabled: false,
      });
      
      toast({
        title: "API Key Revoked",
        description: "Your API key has been revoked successfully.",
      });
    }, 1000);
  };
  
  const handleSaveSettings = (settingType: string) => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast({
        title: `${settingType} settings saved`,
        description: `Your ${settingType.toLowerCase()} settings have been updated successfully.`,
      });
    }, 1000);
  };
  
  // Form builder state
  const [showFormBuilderModal, setShowFormBuilderModal] = useState(false);
  const [formBuilderActiveTab, setFormBuilderActiveTab] = useState("form");
  const [formQuestions, setFormQuestions] = useState([
    {
      id: 1,
      text: "What is your company name?",
      type: "short_answer",
      required: false,
      options: []
    },
    {
      id: 2,
      text: "Select your business type:",
      type: "dropdown",
      required: true,
      options: ["Manufacturer", "Distributor"]
    }
  ]);
  const [businessRules, setBusinessRules] = useState<string[]>([]);
  const [newBusinessRule, setNewBusinessRule] = useState("");
  const [addingNewQuestion, setAddingNewQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    type: "short_answer",
    required: false,
    options: [] as string[]
  });
  const [newOption, setNewOption] = useState("");
  
  // Functions for questionnaire management
  const handleAddQuestionnaire = () => {
    setShowQuestionnaireModal(true);
  };
  
  const handleToggleActive = (id: number, newState: boolean) => {
    setQuestionnaires(
      questionnaires.map(q => 
        q.id === id ? { ...q, active: newState } : q
      )
    );
    
    toast({
      title: newState ? "Questionnaire Activated" : "Questionnaire Deactivated",
      description: `The questionnaire has been ${newState ? "activated" : "deactivated"} successfully.`,
    });
  };
  
  const handleChooseTemplate = () => {
    setShowQuestionnaireModal(false);
    setShowTemplateModal(true);
  };
  
  const handleDraftFromScratch = () => {
    setShowFormBuilderModal(true);
  };
  
  const handleDeleteQuestionnaire = (id: number) => {
    if (window.confirm("Are you sure you want to delete this questionnaire?")) {
      setQuestionnaires(questionnaires.filter(q => q.id !== id));
      toast({
        title: "Questionnaire Deleted",
        description: "The questionnaire has been deleted successfully.",
      });
    }
  };
  
  const handleAddQuestion = () => {
    setAddingNewQuestion(true);
  };
  
  const handleSaveQuestion = () => {
    if (newQuestion.text.trim() === "") {
      toast({
        title: "Error",
        description: "Question text cannot be empty.",
        variant: "destructive"
      });
      return;
    }
    
    setFormQuestions([
      ...formQuestions,
      {
        id: formQuestions.length > 0 ? Math.max(...formQuestions.map(q => q.id)) + 1 : 1,
        text: newQuestion.text,
        type: newQuestion.type,
        required: newQuestion.required,
        options: newQuestion.options
      }
    ]);
    
    setNewQuestion({
      text: "",
      type: "short_answer",
      required: false,
      options: []
    });
    
    setAddingNewQuestion(false);
  };
  
  const handleAddOption = () => {
    if (newOption.trim() === "") return;
    setNewQuestion({
      ...newQuestion,
      options: [...newQuestion.options, newOption]
    });
    setNewOption("");
  };
  
  const handleRemoveOption = (index: number) => {
    setNewQuestion({
      ...newQuestion,
      options: newQuestion.options.filter((_, i) => i !== index)
    });
  };
  
  const handleAddBusinessRule = () => {
    if (newBusinessRule.trim() === "") return;
    setBusinessRules([...businessRules, newBusinessRule]);
    setNewBusinessRule("");
  };
  
  const handleSaveQuestionnaire = () => {
    if (formQuestions.length === 0) {
      toast({
        title: "Error",
        description: "Questionnaire must have at least one question.",
        variant: "destructive"
      });
      return;
    }
    
    setQuestionnaires([
      ...questionnaires,
      {
        id: questionnaires.length > 0 ? Math.max(...questionnaires.map(q => q.id)) + 1 : 1,
        name: "New Questionnaire",
        lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        supplierType: "All",
        active: false
      }
    ]);
    
    toast({
      title: "Questionnaire Saved",
      description: "Your questionnaire has been saved successfully.",
    });
    
    setShowFormBuilderModal(false);
    setFormQuestions([]);
    setBusinessRules([]);
  };
  
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your account and application preferences</p>
        </div>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="api">API Access</TabsTrigger>
          <TabsTrigger value="display">Display & Language</TabsTrigger>
          <TabsTrigger value="questionnaires">Questionnaire Configuration</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="roles">Role & Access</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your account profile information and email address
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      />
                    </div>
                    
                    <div className="pt-4">
                      <Button type="submit" disabled={loading}>
                        {loading ? (
                          <FaSpinner className="mr-2 animate-spin" />
                        ) : (
                          <FaSave className="mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                  <CardDescription>
                    Upload a new profile picture
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={user?.avatar} alt={user?.fullName || user?.username} />
                    <AvatarFallback className="text-lg">
                      {user?.fullName ? getInitials(user.fullName) : user?.username?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex flex-col w-full space-y-2">
                    <Button variant="outline" className="w-full">
                      <i className="fas fa-upload mr-2"></i>
                      Upload
                    </Button>
                    <Button variant="outline" className="w-full" disabled={!user?.avatar}>
                      <i className="fas fa-trash-alt mr-2"></i>
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>
                    Update your account password
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input id="currentPassword" type="password" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input id="confirmPassword" type="password" />
                    </div>
                    
                    <Button className="w-full">
                      <i className="fas fa-lock mr-2"></i>
                      Update Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Notification Channels</h3>
                  <p className="text-sm text-gray-500 mb-4">Select your preferred notification channels</p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Email Notifications</Label>
                        <p className="text-sm text-gray-500">Receive notifications via email</p>
                      </div>
                      <Switch 
                        checked={notifications.email} 
                        onCheckedChange={(checked) => setNotifications({...notifications, email: checked})}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Browser Notifications</Label>
                        <p className="text-sm text-gray-500">Show notifications in your browser</p>
                      </div>
                      <Switch 
                        checked={notifications.browser} 
                        onCheckedChange={(checked) => setNotifications({...notifications, browser: checked})}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Mobile Notifications</Label>
                        <p className="text-sm text-gray-500">Receive push notifications on your mobile device</p>
                      </div>
                      <Switch 
                        checked={notifications.mobile} 
                        onCheckedChange={(checked) => setNotifications({...notifications, mobile: checked})}
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium">Notification Types</h3>
                  <p className="text-sm text-gray-500 mb-4">Select which types of notifications you want to receive</p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="compliance">Compliance Status Changes</Label>
                      <Switch 
                        id="compliance" 
                        checked={notifications.compliance} 
                        onCheckedChange={(checked) => setNotifications({...notifications, compliance: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="risk">Risk Alerts</Label>
                      <Switch 
                        id="risk" 
                        checked={notifications.riskAlerts} 
                        onCheckedChange={(checked) => setNotifications({...notifications, riskAlerts: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="documents">Document Expiry Warnings</Label>
                      <Switch 
                        id="documents" 
                        checked={notifications.documentExpiry} 
                        onCheckedChange={(checked) => setNotifications({...notifications, documentExpiry: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="suppliers">Supplier Updates</Label>
                      <Switch 
                        id="suppliers" 
                        checked={notifications.supplierUpdates} 
                        onCheckedChange={(checked) => setNotifications({...notifications, supplierUpdates: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reports">Weekly Reports</Label>
                      <Switch 
                        id="reports" 
                        checked={notifications.weeklyReports} 
                        onCheckedChange={(checked) => setNotifications({...notifications, weeklyReports: checked})}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={() => handleSaveSettings("Notification")} disabled={loading}>
                    {loading ? (
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                    ) : (
                      <i className="fas fa-save mr-2"></i>
                    )}
                    Save Notification Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Access Management</CardTitle>
              <CardDescription>
                Generate and manage API keys for third-party integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">API Access</Label>
                    <p className="text-sm text-gray-500">Enable or disable API access for your account</p>
                  </div>
                  <Switch 
                    checked={apiSettings.apiEnabled} 
                    onCheckedChange={(checked) => setApiSettings({...apiSettings, apiEnabled: checked})}
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <div className="flex">
                      <Input 
                        id="apiKey" 
                        value={apiSettings.apiKey} 
                        readOnly 
                        className="font-mono text-sm"
                      />
                      <Button variant="outline" className="ml-2" onClick={() => {
                        navigator.clipboard.writeText(apiSettings.apiKey);
                        toast({
                          title: "Copied to clipboard",
                          description: "API key has been copied to your clipboard.",
                        });
                      }}>
                        <i className="fas fa-copy"></i>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="accessLevel">Access Level</Label>
                    <Select 
                      value={apiSettings.accessLevel} 
                      onValueChange={(value) => setApiSettings({...apiSettings, accessLevel: value})}
                    >
                      <SelectTrigger id="accessLevel">
                        <SelectValue placeholder="Select access level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read_only">Read Only</SelectItem>
                        <SelectItem value="read_write">Read & Write</SelectItem>
                        <SelectItem value="full_access">Full Access</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Determines what operations can be performed using this API key
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                  <Button onClick={handleGenerateApiKey} disabled={loading}>
                    {loading ? (
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                    ) : (
                      <i className="fas fa-key mr-2"></i>
                    )}
                    Generate New API Key
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleRevokeApiKey} 
                    disabled={loading || !apiSettings.apiEnabled}
                  >
                    <i className="fas fa-ban mr-2"></i>
                    Revoke API Key
                  </Button>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">API Documentation</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Access our API documentation to learn how to integrate with your systems
                  </p>
                  <Button variant="outline">
                    <i className="fas fa-external-link-alt mr-2"></i>
                    View API Documentation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="display">
          <Card>
            <CardHeader>
              <CardTitle>Display & Language Settings</CardTitle>
              <CardDescription>
                Customize your application appearance and localization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Application Theme</Label>
                    <Select 
                      value={displaySettings.theme} 
                      onValueChange={(value) => setDisplaySettings({...displaySettings, theme: value})}
                    >
                      <SelectTrigger id="theme">
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Compact Sidebar</Label>
                      <p className="text-sm text-gray-500">Use a more compact sidebar layout</p>
                    </div>
                    <Switch 
                      checked={displaySettings.sidebarCompact} 
                      onCheckedChange={(checked) => setDisplaySettings({...displaySettings, sidebarCompact: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Show Dashboard Metrics</Label>
                      <p className="text-sm text-gray-500">Display metrics and KPIs on the dashboard</p>
                    </div>
                    <Switch 
                      checked={displaySettings.showMetrics} 
                      onCheckedChange={(checked) => setDisplaySettings({...displaySettings, showMetrics: checked})}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select 
                      value={displaySettings.language} 
                      onValueChange={(value) => setDisplaySettings({...displaySettings, language: value})}
                    >
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select 
                      value={displaySettings.dateFormat} 
                      onValueChange={(value) => setDisplaySettings({...displaySettings, dateFormat: value})}
                    >
                      <SelectTrigger id="dateFormat">
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={() => handleSaveSettings("Display")} disabled={loading}>
                    {loading ? (
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                    ) : (
                      <i className="fas fa-save mr-2"></i>
                    )}
                    Save Display Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="questionnaires">
          <div className="mb-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Questionnaire Configuration</CardTitle>
                    <CardDescription>
                      Create and manage supplier questionnaires with ease.
                    </CardDescription>
                  </div>
                  <div className="relative group">
                    <Button>
                      <FaPlus className="mr-2" />
                      Add Questionnaire
                    </Button>
                    <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-64 bg-white rounded-md border shadow-lg z-10">
                      <div className="p-2">
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start mb-1"
                          onClick={handleDraftFromScratch}
                        >
                          <FaFileAlt className="mr-2" />
                          Draft from Scratch
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start"
                          onClick={handleChooseTemplate}
                        >
                          <FaCopy className="mr-2" />
                          Choose from Template
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {questionnaires.map((questionnaire) => (
                    <div 
                      key={questionnaire.id} 
                      className="border rounded-lg p-5 shadow-sm relative"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-medium">{questionnaire.name}</h3>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <FaEye className="text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <FaPencilAlt className="text-gray-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteQuestionnaire(questionnaire.id)}
                          >
                            <FaTrashAlt />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-gray-500">
                          <FaCalendarAlt className="mr-2" />
                          Last updated: {questionnaire.lastUpdated}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <FaUsers className="mr-2" />
                          Supplier Type: {questionnaire.supplierType}
                        </div>
                      </div>
                      
                      <div className="absolute bottom-5 right-5 flex items-center">
                        <span className="text-sm mr-2">
                          {questionnaire.active ? 'Active' : 'Inactive'}
                        </span>
                        <Switch 
                          checked={questionnaire.active} 
                          onCheckedChange={(checked) => handleToggleActive(questionnaire.id, checked)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Add Questionnaire Modal */}
          {showQuestionnaireModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                  <CardTitle>Add New Questionnaire</CardTitle>
                  <CardDescription>
                    Choose how you would like to create your questionnaire
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full py-8 text-lg" 
                    variant="outline"
                    onClick={handleDraftFromScratch}
                  >
                    <FaFileAlt className="mr-2 text-xl" />
                    Draft from Scratch
                  </Button>
                  <Button 
                    className="w-full py-8 text-lg" 
                    variant="outline"
                    onClick={handleChooseTemplate}
                  >
                    <FaCopy className="mr-2 text-xl" />
                    Choose from Template
                  </Button>
                </CardContent>
                <div className="flex justify-end p-4 border-t">
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowQuestionnaireModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            </div>
          )}
          
          {/* Template Selection Modal */}
          {showTemplateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-4xl mx-auto">
                <CardHeader>
                  <CardTitle>Choose a Template</CardTitle>
                  <CardDescription>
                    Select a pre-built template to start with
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4 cursor-pointer hover:border-primary hover:shadow-md">
                      <h3 className="font-medium mb-2">EUDR Compliance Basic</h3>
                      <p className="text-sm text-gray-500 mb-3">Basic assessment for EUDR compliance readiness</p>
                      <div className="text-xs text-gray-400">15 questions</div>
                    </div>
                    <div className="border rounded-lg p-4 cursor-pointer hover:border-primary hover:shadow-md">
                      <h3 className="font-medium mb-2">Supplier Due Diligence</h3>
                      <p className="text-sm text-gray-500 mb-3">Comprehensive due diligence assessment</p>
                      <div className="text-xs text-gray-400">32 questions</div>
                    </div>
                    <div className="border rounded-lg p-4 cursor-pointer hover:border-primary hover:shadow-md">
                      <h3 className="font-medium mb-2">Environmental Impact</h3>
                      <p className="text-sm text-gray-500 mb-3">Environmental and sustainability assessment</p>
                      <div className="text-xs text-gray-400">24 questions</div>
                    </div>
                  </div>
                </CardContent>
                <div className="flex justify-end p-4 border-t">
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowTemplateModal(false)}
                    className="mr-2"
                  >
                    Cancel
                  </Button>
                  <Button>
                    Use Selected Template
                  </Button>
                </div>
              </Card>
            </div>
          )}
          
          {/* Form Builder Modal */}
          {showFormBuilderModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-6xl mx-auto max-h-[90vh] overflow-hidden flex flex-col">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Create New Questionnaire</CardTitle>
                      <CardDescription>
                        Design your questionnaire and set up business rules
                      </CardDescription>
                    </div>
                    <Button variant="ghost" onClick={() => setShowFormBuilderModal(false)} className="w-8 h-8 p-0">
                      <FaTimes />
                    </Button>
                  </div>
                </CardHeader>
                
                <div className="flex border-b">
                  <button 
                    className={`px-6 py-3 font-medium text-sm ${formBuilderActiveTab === 'form' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
                    onClick={() => setFormBuilderActiveTab('form')}
                  >
                    <span className="flex items-center">
                      <span className="bg-primary/10 text-primary w-5 h-5 rounded-full inline-flex items-center justify-center mr-2">1</span>
                      Form Builder
                    </span>
                  </button>
                  <button 
                    className={`px-6 py-3 font-medium text-sm ${formBuilderActiveTab === 'rules' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
                    onClick={() => setFormBuilderActiveTab('rules')}
                  >
                    <span className="flex items-center">
                      <span className="bg-primary/10 text-primary w-5 h-5 rounded-full inline-flex items-center justify-center mr-2">2</span>
                      Business Rules
                    </span>
                  </button>
                </div>
                
                <div className="overflow-auto flex-grow">
                  {formBuilderActiveTab === 'form' ? (
                    <div className="p-6 grid grid-cols-2 gap-6">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">Questions</h3>
                          <Button size="sm" onClick={handleAddQuestion}>
                            <FaPlus className="mr-2" size={14} />
                            Add Question
                          </Button>
                        </div>
                        
                        {/* Question List */}
                        <div className="space-y-4">
                          {formQuestions.map((question, index) => (
                            <div key={question.id} className="border rounded-lg p-4 bg-white">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-medium text-sm">{question.text}</h4>
                                  <div className="text-xs text-gray-500 mt-1 flex items-center">
                                    <span className="capitalize mr-3">{question.type.replace('_', ' ')}</span>
                                    {question.required && (
                                      <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-medium">Required</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <FaPencilAlt size={12} />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500">
                                    <FaTrashAlt size={12} />
                                  </Button>
                                </div>
                              </div>
                              
                              {question.options.length > 0 && (
                                <div className="mt-2 text-sm">
                                  <div className="text-xs text-gray-500 mb-1">Options:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {question.options.map((option, idx) => (
                                      <span key={idx} className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 text-xs">
                                        {option}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Add Question Form */}
                        {addingNewQuestion && (
                          <div className="border rounded-lg p-4 bg-gray-50">
                            <h4 className="font-medium mb-3">Add New Question</h4>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="questionText">Question Text</Label>
                                <Input 
                                  id="questionText" 
                                  value={newQuestion.text}
                                  onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})}
                                  placeholder="Enter your question here"
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="questionType">Question Type</Label>
                                <Select 
                                  value={newQuestion.type}
                                  onValueChange={(value) => setNewQuestion({...newQuestion, type: value})}
                                >
                                  <SelectTrigger id="questionType">
                                    <SelectValue placeholder="Select question type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="short_answer">Short Answer</SelectItem>
                                    <SelectItem value="long_answer">Long Answer</SelectItem>
                                    <SelectItem value="dropdown">Dropdown</SelectItem>
                                    <SelectItem value="checkbox">Checkbox</SelectItem>
                                    <SelectItem value="radio">Radio Buttons</SelectItem>
                                    <SelectItem value="rating">Rating Scale</SelectItem>
                                    <SelectItem value="file_upload">File Upload</SelectItem>
                                    <SelectItem value="date">Date Picker</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="required" 
                                  checked={newQuestion.required}
                                  onCheckedChange={(checked: boolean | "indeterminate") => 
                                    setNewQuestion({...newQuestion, required: checked === true})
                                  }
                                />
                                <Label htmlFor="required">Required</Label>
                              </div>
                              
                              {['dropdown', 'checkbox', 'radio'].includes(newQuestion.type) && (
                                <div className="space-y-2">
                                  <Label>Options</Label>
                                  <div className="flex items-center space-x-2">
                                    <Input 
                                      value={newOption}
                                      onChange={(e) => setNewOption(e.target.value)}
                                      placeholder="Add an option"
                                      className="flex-1"
                                    />
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={handleAddOption}
                                      type="button"
                                    >
                                      Add
                                    </Button>
                                  </div>
                                  
                                  {newQuestion.options.length > 0 && (
                                    <div className="mt-2">
                                      <div className="text-sm font-medium mb-1">Added options:</div>
                                      <div className="flex flex-wrap gap-2">
                                        {newQuestion.options.map((option, idx) => (
                                          <div key={idx} className="bg-gray-100 rounded flex items-center overflow-hidden">
                                            <span className="px-2 py-1 text-sm">{option}</span>
                                            <button
                                              className="bg-gray-200 hover:bg-gray-300 p-1"
                                              onClick={() => handleRemoveOption(idx)}
                                              type="button"
                                            >
                                              <FaTimes size={12} />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="ghost" 
                                  onClick={() => setAddingNewQuestion(false)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={handleSaveQuestion}
                                >
                                  Add Question
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Preview Pane */}
                      <div className="border rounded-lg bg-gray-50 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-medium">Preview</h3>
                          <Button variant="outline" size="sm">
                            <FaExpandAlt className="mr-2" size={14} />
                            Full Screen
                          </Button>
                        </div>
                        
                        <div className="bg-white border rounded-lg p-4 shadow-sm space-y-5">
                          {formQuestions.map((question) => (
                            <div key={question.id} className="space-y-2">
                              <div className="flex items-start justify-between">
                                <label className="block text-sm font-medium">
                                  {question.text}
                                  {question.required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                {question.required && (
                                  <div className="flex items-center">
                                    <Switch checked={true} />
                                  </div>
                                )}
                              </div>
                              
                              {question.type === 'short_answer' && (
                                <Input placeholder="Enter your answer" />
                              )}
                              
                              {question.type === 'long_answer' && (
                                <textarea 
                                  className="w-full min-h-[100px] px-3 py-2 border rounded-md resize-y"
                                  placeholder="Enter your answer"
                                />
                              )}
                              
                              {question.type === 'dropdown' && (
                                <Select>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an option" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {question.options.map((option, idx) => (
                                      <SelectItem key={idx} value={option}>{option}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              
                              {question.type === 'checkbox' && (
                                <div className="space-y-2">
                                  {question.options.map((option, idx) => (
                                    <div key={idx} className="flex items-center space-x-2">
                                      <Checkbox id={`${question.id}-${idx}`} />
                                      <label 
                                        htmlFor={`${question.id}-${idx}`}
                                        className="text-sm"
                                      >
                                        {option}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {question.type === 'radio' && (
                                <div className="space-y-2">
                                  {question.options.map((option, idx) => (
                                    <div key={idx} className="flex items-center space-x-2">
                                      <input 
                                        type="radio" 
                                        id={`${question.id}-${idx}`}
                                        name={`question-${question.id}`}
                                        className="rounded-full"
                                      />
                                      <label 
                                        htmlFor={`${question.id}-${idx}`}
                                        className="text-sm"
                                      >
                                        {option}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {question.type === 'date' && (
                                <Input type="date" />
                              )}
                              
                              {question.type === 'file_upload' && (
                                <div className="border-2 border-dashed rounded-md p-4 text-center">
                                  <div className="text-sm text-gray-500">
                                    Drag and drop a file here, or click to browse
                                  </div>
                                  <Button variant="outline" size="sm" className="mt-2">
                                    Browse Files
                                  </Button>
                                </div>
                              )}
                              
                              {question.type === 'rating' && (
                                <div className="flex items-center space-x-1">
                                  {[1, 2, 3, 4, 5].map((rating) => (
                                    <Button 
                                      key={rating}
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      {rating}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium">Business Rules</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Add business rules to validate answers and control question visibility
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={() => document.getElementById('business-rule-input')?.focus()}
                        >
                          <FaPlus className="mr-2" size={14} />
                          Add Rule
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="border rounded-lg p-4 bg-white shadow-sm">
                          <Label htmlFor="business-rule-input" className="mb-2 block">Add Business Rule</Label>
                          <div className="flex space-x-2">
                            <Textarea 
                              id="business-rule-input"
                              placeholder="Type your business rule in natural language, e.g. 'If business type is Manufacturer, show question about manufacturing capacity'"
                              value={newBusinessRule}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewBusinessRule(e.target.value)}
                              className="flex-1"
                            />
                            <Button onClick={handleAddBusinessRule}>Add</Button>
                          </div>
                        </div>
                        
                        {businessRules.length > 0 ? (
                          <div className="space-y-2">
                            {businessRules.map((rule, index) => (
                              <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="text-xs text-gray-500 mb-1">Rule #{index + 1}</div>
                                    <p className="text-sm">{rule}</p>
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500">
                                    <FaTrashAlt size={12} />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <div className="mb-2 flex justify-center">
                              <FaInfoCircle size={24} />
                            </div>
                            <p className="text-sm">No business rules added yet</p>
                            <p className="text-xs mt-1">Business rules define conditional logic for your questionnaire</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-4 border-t bg-gray-50 flex justify-between">
                  <Button variant="ghost" onClick={() => setShowFormBuilderModal(false)}>
                    Cancel
                  </Button>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline">Save Draft</Button>
                    <Button onClick={handleSaveQuestionnaire}>Save Questionnaire</Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>
        <TabsContent value="roles">
          <div className="grid gap-6 grid-cols-1">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Role & Access Management</CardTitle>
                    <CardDescription>
                      Manage user roles and permissions across your organization
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <Tabs defaultValue="roles" className="w-full" onValueChange={(value) => setActiveTab(value)}>
                    <TabsList className="mb-4">
                      <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
                      <TabsTrigger value="users">User Assignment</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="roles">
                      <div className="flex justify-between items-center mb-6">
                        <Select 
                          value={selectedRoleFilter} 
                          onValueChange={setSelectedRoleFilter}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter roles" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All Roles">All Roles</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <div className="relative group">
                          <Button className="bg-blue-600 text-white hover:bg-blue-700">
                            <FaPlus className="mr-2" />
                            Create
                          </Button>
                          <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setShowHierarchyEditor(true);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                              >
                                Create/Edit Hierarchy
                              </button>
                              <button
                                onClick={() => setShowCreateRoleModal(true)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                              >
                                Create Role
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[200px]">ROLE NAME</TableHead>
                              <TableHead>DESCRIPTION</TableHead>
                              <TableHead className="text-center">USERS</TableHead>
                              <TableHead className="text-center">STATUS</TableHead>
                              <TableHead className="text-center">ACTIONS</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {roles.map((role) => (
                              <TableRow key={role.id}>
                                <TableCell className="font-medium">{role.name}</TableCell>
                                <TableCell>{role.description}</TableCell>
                                <TableCell className="text-center">{role.users} users</TableCell>
                                <TableCell className="text-center">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    role.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {role.status === 'active' ? (
                                      <>
                                        <FaCheckCircle className="mr-1 h-2 w-2" />
                                        Active
                                      </>
                                    ) : 'Inactive'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center space-x-2">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <FaEdit className="h-4 w-4 text-gray-500" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <FaEye className="h-4 w-4 text-gray-500" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <FaTrash className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="users">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="relative w-80">
                            <Input 
                              placeholder="Search by name or email" 
                              className="pl-8"
                            />
                            <div className="absolute left-2 top-2.5 text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.3-4.3"></path>
                              </svg>
                            </div>
                          </div>
                          
                          <div className="flex space-x-3">
                            <Select>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by Role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="auditor">Auditor</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Select>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Button onClick={() => setShowAddUserModal(true)}>
                              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14"></path>
                                <path d="M5 12h14"></path>
                              </svg>
                              Assign User to Role
                            </Button>
                          </div>
                        </div>
                        
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[200px]">USER NAME</TableHead>
                                <TableHead>EMAIL</TableHead>
                                <TableHead>ROLE ASSIGNED</TableHead>
                                <TableHead>LAST LOGIN</TableHead>
                                <TableHead>STATUS</TableHead>
                                <TableHead>ACTIONS</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {users.map((user) => (
                                <TableRow key={user.id}>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback className="text-xs">
                                          {getInitials(user.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium">{user.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{user.email}</TableCell>
                                  <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {user.role}
                                    </span>
                                  </TableCell>
                                  <TableCell>{user.lastLogin}</TableCell>
                                  <TableCell>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {user.status === 'active' ? (
                                        <>
                                          <FaCheckCircle className="mr-1 h-2 w-2" />
                                          Active
                                        </>
                                      ) : 'Inactive'}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Button size="sm" variant="outline">Change Role</Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Connect with third-party services and manage external integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* SAP Integration */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">SAP</span>
                        </div>
                        <div>
                          <h3 className="font-medium">SAP ERP</h3>
                          <p className="text-sm text-gray-500">Enterprise Resource Planning</p>
                        </div>
                      </div>
                      <Switch />
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Sync supplier data and purchase orders with SAP systems
                    </p>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>

                  {/* Oracle Integration */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <span className="text-red-600 font-semibold text-xs">ORC</span>
                        </div>
                        <div>
                          <h3 className="font-medium">Oracle Cloud</h3>
                          <p className="text-sm text-gray-500">Cloud Applications</p>
                        </div>
                      </div>
                      <Switch />
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Integrate with Oracle Supply Chain Management
                    </p>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>

                  {/* Microsoft Integration */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <span className="text-green-600 font-semibold text-xs">MS</span>
                        </div>
                        <div>
                          <h3 className="font-medium">Microsoft 365</h3>
                          <p className="text-sm text-gray-500">Office Suite</p>
                        </div>
                      </div>
                      <Switch />
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Connect with SharePoint and Teams for document management
                    </p>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>

                  {/* Salesforce Integration */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-xs">SF</span>
                        </div>
                        <div>
                          <h3 className="font-medium">Salesforce</h3>
                          <p className="text-sm text-gray-500">Customer Relationship Management</p>
                        </div>
                      </div>
                      <Switch />
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Sync customer and supplier relationship data
                    </p>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>

                  {/* Slack Integration */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <span className="text-purple-600 font-semibold text-xs">SL</span>
                        </div>
                        <div>
                          <h3 className="font-medium">Slack</h3>
                          <p className="text-sm text-gray-500">Team Communication</p>
                        </div>
                      </div>
                      <Switch />
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Receive compliance alerts and notifications in Slack
                    </p>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>

                  {/* Power BI Integration */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <span className="text-yellow-600 font-semibold text-xs">PBI</span>
                        </div>
                        <div>
                          <h3 className="font-medium">Power BI</h3>
                          <p className="text-sm text-gray-500">Business Intelligence</p>
                        </div>
                      </div>
                      <Switch />
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Export compliance data for advanced analytics and reporting
                    </p>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4">Webhook Configuration</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="webhookUrl">Webhook URL</Label>
                      <Input
                        id="webhookUrl"
                        placeholder="https://your-domain.com/webhook"
                        className="max-w-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="webhookSecret">Webhook Secret</Label>
                      <Input
                        id="webhookSecret"
                        type="password"
                        placeholder="Enter webhook secret"
                        className="max-w-md"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Test Webhook
                      </Button>
                      <Button size="sm">
                        Save Configuration
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Create New Role Modal */}
      {showCreateRoleModal && (
        <Dialog open={showCreateRoleModal} onOpenChange={setShowCreateRoleModal}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Define role permissions for different modules in the application.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="roleName">Role Name</Label>
                <Input 
                  id="roleName" 
                  placeholder="Enter role name" 
                  value={newRole.name}
                  onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="roleDescription">Description</Label>
                <Textarea 
                  id="roleDescription" 
                  placeholder="Describe the role's purpose" 
                  value={newRole.description}
                  onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                />
              </div>
              
              <div className="pt-2 pb-2">
                <h4 className="text-sm font-medium mb-2">Permissions</h4>
                <p className="text-xs text-gray-500 mb-4">Click on a module to view and configure specific feature permissions.</p>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-white z-10 sticky top-0">
                      <TableRow>
                        <TableHead>Module / Sub-Module</TableHead>
                        <TableHead className="text-center">VIEW</TableHead>
                        <TableHead className="text-center">CREATE</TableHead>
                        <TableHead className="text-center">EDIT</TableHead>
                        <TableHead className="text-center">DELETE</TableHead>
                        <TableHead className="text-center">APPROVE / TRIGGER</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newRole.permissions.map((permission, moduleIndex) => (
                        <React.Fragment key={`module-${permission.module}`}>
                          <TableRow 
                            className={`bg-gray-50 hover:bg-gray-100 ${permission.isExpandable ? 'cursor-pointer' : ''}`}
                            onClick={permission.isExpandable ? () => {
                              setExpandedModules({
                                ...expandedModules,
                                [permission.module]: !expandedModules[permission.module]
                              });
                            } : undefined}
                          >
                            <TableCell className="font-medium flex items-center">
                              {permission.isExpandable && (
                                <span className="mr-2">
                                  {expandedModules[permission.module] ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </span>
                              )}
                              {permission.module}
                            </TableCell>
                            <TableCell className="text-center">
                              {typeof permission.view === 'boolean' ? (
                                <Checkbox 
                                  checked={permission.view} 
                                  onCheckedChange={(checked) => {
                                    const updatedPermissions = [...newRole.permissions];
                                    updatedPermissions[moduleIndex] = { 
                                      ...permission, 
                                      view: checked as boolean
                                    };
                                    setNewRole({ ...newRole, permissions: updatedPermissions });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="text-gray-400 font-medium">X</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {typeof permission.create === 'boolean' ? (
                                <Checkbox 
                                  checked={permission.create} 
                                  onCheckedChange={(checked) => {
                                    const updatedPermissions = [...newRole.permissions];
                                    updatedPermissions[moduleIndex] = { 
                                      ...permission, 
                                      create: checked as boolean
                                    };
                                    setNewRole({ ...newRole, permissions: updatedPermissions });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="text-gray-400 font-medium">X</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {typeof permission.edit === 'boolean' ? (
                                <Checkbox 
                                  checked={permission.edit} 
                                  onCheckedChange={(checked) => {
                                    const updatedPermissions = [...newRole.permissions];
                                    updatedPermissions[moduleIndex] = { 
                                      ...permission, 
                                      edit: checked as boolean
                                    };
                                    setNewRole({ ...newRole, permissions: updatedPermissions });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="text-gray-400 font-medium">X</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {typeof permission.delete === 'boolean' ? (
                                <Checkbox 
                                  checked={permission.delete} 
                                  onCheckedChange={(checked) => {
                                    const updatedPermissions = [...newRole.permissions];
                                    updatedPermissions[moduleIndex] = { 
                                      ...permission, 
                                      delete: checked ? "allowed" : "denied"
                                    };
                                    setNewRole({ ...newRole, permissions: updatedPermissions });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="text-gray-400 font-medium">X</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {permission.approve === "trigger" ? (
                                <Checkbox 
                                  checked={true} 
                                  onCheckedChange={(checked) => {
                                    const updatedPermissions = [...newRole.permissions];
                                    updatedPermissions[moduleIndex] = { 
                                      ...permission, 
                                      approve: checked ? "trigger" : "denied"
                                    };
                                    setNewRole({ ...newRole, permissions: updatedPermissions });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : typeof permission.approve === 'boolean' ? (
                                <Checkbox 
                                  checked={permission.approve} 
                                  onCheckedChange={(checked) => {
                                    const updatedPermissions = [...newRole.permissions];
                                    updatedPermissions[moduleIndex] = { 
                                      ...permission, 
                                      approve: checked ? "allowed" : "denied"
                                    };
                                    setNewRole({ ...newRole, permissions: updatedPermissions });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="text-gray-400 font-medium">X</span>
                              )}
                            </TableCell>
                          </TableRow>
                          
                          {/* Sub-module rows (only shown when module is expanded) */}
                          {permission.isExpandable && expandedModules[permission.module] && permission.subModules.map((subModule, subIndex) => (
                            <TableRow key={`${permission.module}-${subModule.name}-${subIndex}`} className="bg-white">
                              <TableCell className="pl-10 text-sm text-gray-600">{subModule.name}</TableCell>
                              <TableCell className="text-center">
                                <span className="text-gray-400 font-medium">X</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="text-gray-400 font-medium">X</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="text-gray-400 font-medium">X</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="text-gray-400 font-medium">X</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox 
                                  checked={subModule.approve !== "denied"} 
                                  onCheckedChange={(checked) => {
                                    const updatedPermissions = [...newRole.permissions];
                                    const modulePermission = updatedPermissions[moduleIndex];
                                    const updatedSubModules = [...modulePermission.subModules];
                                    updatedSubModules[subIndex] = {
                                      ...subModule,
                                      approve: checked ? "trigger" : "denied"
                                    };
                                    updatedPermissions[moduleIndex] = {
                                      ...modulePermission,
                                      subModules: updatedSubModules
                                    };
                                    setNewRole({ ...newRole, permissions: updatedPermissions });
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
            
            <DialogFooter className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setShowCreateRoleModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRole}>
                Create Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Add New User Modal */}
      {showAddUserModal && (
        <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                To add a user, please fill the mandatory fields below.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="userName" className="flex-none">Name</Label>
                  <span className="text-red-500 ml-1">*</span>
                </div>
                <Input 
                  id="userName" 
                  placeholder="Search and Select" 
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                />
                <div className="text-xs text-gray-400 text-right">0/50</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="userEmail" className="flex-none">Email</Label>
                  <span className="text-red-500 ml-1">*</span>
                </div>
                <Input 
                  id="userEmail" 
                  type="email"
                  placeholder="Type the Email" 
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                />
                <div className="text-xs text-gray-400 text-right">0/100</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="userRole" className="flex-none">Role</Label>
                  <span className="text-red-500 ml-1">*</span>
                </div>
                <Select 
                  value={newUser.role} 
                  onValueChange={(value) => setNewUser({...newUser, role: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="userGroups" className="flex-none">Group</Label>
                </div>
                <Select 
                  value=""
                  onValueChange={(value) => {
                    if (value && !newUser.groups.includes(value)) {
                      setNewUser({...newUser, groups: [...newUser.groups, value]});
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Groups" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizationGroups.map(group => (
                      <SelectItem 
                        key={group.id} 
                        value={group.name}
                        disabled={newUser.groups.includes(group.name)}
                      >
                        <div className="flex items-center">
                          <span style={{ marginLeft: `${group.level * 16}px` }}>
                            {group.name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Display selected groups */}
                {newUser.groups.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm font-medium mb-1">Selected Groups:</div>
                    <div className="flex flex-wrap gap-2">
                      {newUser.groups.map((groupName, index) => (
                        <div key={index} className="bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm flex items-center">
                          <span>{groupName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setNewUser({
                                ...newUser, 
                                groups: newUser.groups.filter(g => g !== groupName)
                              });
                            }}
                            className="ml-2 hover:bg-blue-200 rounded-full p-0.5"
                          >
                            <FaTimes size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setShowAddUserModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUser}>
                Add User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
  
  function getInitials(name: string) {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  }
  
  // Handle creating a new role
  async function handleCreateRole() {
    if (!newRole.name.trim()) {
      toast({
        title: "Error",
        description: "Role name is required.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const roleData = {
        name: newRole.name,
        description: newRole.description || null,
        permissions: newRole.permissions,
        entityId: 1, // Default entity ID
        isActive: true
      };

      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create role');
      }

      const createdRole = await response.json();
      
      // Add the new role to the local state
      const newRoleObj = {
        id: createdRole.id,
        name: createdRole.name,
        description: createdRole.description,
        users: 0,
        status: "active" as const
      };
    
      setRoles([...roles, newRoleObj]);
      
      toast({
        title: "Role Created",
        description: `Role "${createdRole.name}" has been created successfully.`
      });
      
      setShowCreateRoleModal(false);
      setExpandedModules({}); // Reset expanded modules
      
      // Reset the form with default values that use the new structure
      setNewRole({
        name: "",
        description: "",
        permissions: [
          { 
            module: "Product Masters", 
            view: true, 
            create: true, 
            edit: true, 
            delete: "N/A", 
            approve: "N/A",
            isExpandable: false,
            subModules: []
          },
          { 
            module: "Supplier Management", 
            view: true, 
            create: true, 
            edit: true, 
            delete: "N/A", 
            approve: "N/A",
            isExpandable: false,
            subModules: []
          },
          { 
            module: "Customer Management", 
            view: true, 
            create: true, 
            edit: true, 
            delete: "N/A", 
            approve: "N/A",
            isExpandable: false,
            subModules: []
          },
          { 
            module: "Inbound Declaration", 
            view: true, 
            create: true, 
            edit: true, 
            delete: "N/A", 
            approve: "trigger",
            isExpandable: true,
            subModules: [
              { name: "Geometry Check", view: "N/A", create: "N/A", edit: "N/A", delete: "N/A", approve: "System Trigger" },
              { name: "Satellite Check", view: "N/A", create: "N/A", edit: "N/A", delete: "N/A", approve: "Async Trigger" },
              { name: "Notify Non-Compliant Suppliers", view: "N/A", create: "N/A", edit: "N/A", delete: "N/A", approve: "Manual Trigger" },
              { name: "File in EU-IS", view: "N/A", create: "N/A", edit: "N/A", delete: "N/A", approve: "Submit to EU-IS" }
            ]
          },
          { 
            module: "Outbound Declaration", 
            view: true, 
            create: true, 
            edit: true, 
            delete: "N/A", 
            approve: "trigger",
            isExpandable: true,
            subModules: [
              { name: "Geometry Check", view: "N/A", create: "N/A", edit: "N/A", delete: "N/A", approve: "trigger" },
              { name: "Satellite Check", view: "N/A", create: "N/A", edit: "N/A", delete: "N/A", approve: "trigger" },
              { name: "Notify Non-Compliant Suppliers", view: "N/A", create: "N/A", edit: "N/A", delete: "N/A", approve: "trigger" },
              { name: "File in EU-IS", view: "N/A", create: "N/A", edit: "N/A", delete: "N/A", approve: "trigger" }
            ]
          },
          { 
            module: "Location Masters", 
            view: true, 
            create: true, 
            edit: true, 
            delete: "N/A", 
            approve: "N/A",
            isExpandable: false,
            subModules: []
          }
        ]
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }
  
  // Handle adding a new user
  function handleAddUser() {
    // Validate required fields
    if (!newUser.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required.",
        variant: "destructive"
      });
      return;
    }
    
    if (!newUser.email.trim()) {
      toast({
        title: "Error",
        description: "Email is required.",
        variant: "destructive"
      });
      return;
    }
    
    if (!newUser.role) {
      toast({
        title: "Error",
        description: "Role is required.",
        variant: "destructive"
      });
      return;
    }
    
    const newUserObj = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      lastLogin: "Just now",
      status: "active" as const,
      avatar: ""
    };
    
    setUsers([...users, newUserObj]);
    
    // Find the role and increment the users count
    setRoles(
      roles.map(role => 
        role.name === newUser.role 
          ? { ...role, users: role.users + 1 } 
          : role
      )
    );
    
    toast({
      title: "User Added",
      description: `User "${newUser.name}" has been added successfully with role "${newUser.role}".`
    });
    
    setShowAddUserModal(false);
    setNewUser({
      name: "",
      email: "",
      role: "",
      groups: [],
    });
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your account and application preferences</p>
        </div>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="api">API Access</TabsTrigger>
          <TabsTrigger value="display">Display & Language</TabsTrigger>
          <TabsTrigger value="questionnaires">Questionnaire Configuration</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="roles">Role & Access</TabsTrigger>
        </TabsList>
        
        <TabsContent value="roles">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Role & Access Management</h3>
                <p className="text-sm text-gray-500">Manage user roles and permissions across your organization</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => {
                  console.log("Hierarchy editor clicked!");
                  setShowHierarchyEditor(true);
                }} className="bg-blue-600">
                  <Network className="w-4 h-4 mr-2" />
                  Create/Edit Hierarchy
                </Button>
              </div>
            </div>

            {/* Sub-tabs for Role & Access Management */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex space-x-8">
                <button 
                  onClick={() => {
                    console.log('Groups tab clicked');
                    setActiveTab('groups');
                  }}
                  className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
                    activeTab === 'groups' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Groups
                </button>
                <button 
                  onClick={() => setActiveTab('roles')}
                  className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
                    activeTab === 'roles' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Roles & Permissions
                </button>
                <button 
                  onClick={() => setActiveTab('hierarchy')}
                  className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
                    activeTab === 'hierarchy' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Organization Hierarchy
                </button>
                <button 
                  onClick={() => setActiveTab('assignment')}
                  className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
                    activeTab === 'assignment' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  User Assignment
                </button>
              </nav>
            </div>

            {/* Conditional Content Based on Active Tab */}
            {activeTab === 'groups' && <GroupsTab />}
            
            {activeTab === 'roles' && (
              <>
                {/* Filter and Create Section */}
                <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Select defaultValue="all">
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateRole}>
                <Plus className="w-4 h-4 mr-2" />
                Add Role
              </Button>
            </div>

            {/* Roles Table */}
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-medium">ROLE NAME</TableHead>
                    <TableHead className="font-medium">DESCRIPTION</TableHead>
                    <TableHead className="font-medium">USERS</TableHead>
                    <TableHead className="font-medium">STATUS</TableHead>
                    <TableHead className="font-medium">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Admin</TableCell>
                    <TableCell>Full system access with all permissions</TableCell>
                    <TableCell>12 users</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Auditor</TableCell>
                    <TableCell>View-only access to compliance data</TableCell>
                    <TableCell>8 users</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
                </div>
              </>
            )}
            
            {activeTab === 'hierarchy' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Organization Hierarchy</h3>
                    <p className="text-gray-500">Create and manage your organization's hierarchical structure</p>
                  </div>
                  <Button onClick={() => setShowHierarchyEditor(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Network className="w-4 h-4 mr-2" />
                    Edit Hierarchy
                  </Button>
                </div>
                
                <div className="bg-white border rounded-lg p-6">
                  <div className="text-center">
                    <Network className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Organization Structure</h4>
                    <p className="text-gray-500 mb-6">
                      Build your organization's hierarchy with departments, teams, and reporting structures.
                    </p>
                    <Button onClick={() => setShowHierarchyEditor(true)} variant="outline">
                      Create Organization Chart
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">Visual Editor</h5>
                    <p className="text-sm text-blue-800">
                      Drag and drop interface to create organizational charts with groups and roles.
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h5 className="font-medium text-green-900 mb-2">Role Assignment</h5>
                    <p className="text-sm text-green-800">
                      Assign users to specific positions and define reporting relationships.
                    </p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h5 className="font-medium text-purple-900 mb-2">Access Control</h5>
                    <p className="text-sm text-purple-800">
                      Automatically inherit permissions based on organizational position.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'assignment' && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">User Assignment</h3>
                <p className="text-gray-500">Assign users to specific roles and manage permissions</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="profile">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" defaultValue="John" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue="Doe" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john.doe@example.com" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="utc">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Standard Time</SelectItem>
                      <SelectItem value="pst">Pacific Standard Time</SelectItem>
                      <SelectItem value="cet">Central European Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button>Save Changes</Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Upload a new profile picture</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src="/api/placeholder/96/96" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm">
                  <Camera className="w-4 h-4 mr-2" />
                  Change Photo
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      <HierarchyModal 
        isOpen={showHierarchyEditor} 
        onClose={() => setShowHierarchyEditor(false)} 
      />
    </div>
  );
}
