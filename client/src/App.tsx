import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import SupplyChain from "@/pages/supply-chain";
import RiskAssessment from "@/pages/risk-assessment";
import Documents from "@/pages/documents";
import Declarations from "@/pages/declarations";
import Customers from "@/pages/customers";
import Suppliers from "@/pages/suppliers";
import Compliance from "@/pages/compliance";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import SAQs from "@/pages/saqs";
import OrganizationHierarchy from "@/pages/organization-hierarchy";

import Login from "@/pages/login";
import Register from "@/pages/register";
import RegistrationConfirmation from "@/pages/registration-confirmation";
import ActivateSupplier from "@/pages/activate-supplier";
import OnboardingWelcome from "@/pages/onboarding/welcome";
import OrganizationProfile from "@/pages/onboarding/organization-profile";
import Entities from "@/pages/admin/entities";
import EntityDetails from "@/pages/admin/entity-details";
import Invitations from "@/pages/admin/invitations";
import Products from "@/pages/admin/products";
import AppLayout from "@/layouts/app-layout";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Head } from "@/components/head";
import { ProtectedRoute } from "@/components/protected-route";

function Router() {
  const { user } = useAuth();
  
  return (
    <Switch>
      {/* Authentication Routes */}
      <Route path="/login">
        {user ? <Redirect to="/" /> : <Login />}
      </Route>
      
      <Route path="/register">
        {user ? <Redirect to="/" /> : <Register />}
      </Route>
      
      <Route path="/registration-confirmation">
        {/* No authentication check here to allow completed registration to show confirmation */}
        <RegistrationConfirmation />
      </Route>
      
      <Route path="/activate-supplier/:token">
        <ActivateSupplier />
      </Route>
      
      {/* Onboarding routes removed as per requirement */}
      
      {/* Protected App Routes */}
      <Route path="/">
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/supply-chain">
        <ProtectedRoute>
          <AppLayout>
            <SupplyChain />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/risk-assessment">
        <ProtectedRoute>
          <AppLayout>
            <RiskAssessment />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/documents">
        <ProtectedRoute>
          <AppLayout>
            <Documents />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/declarations">
        <ProtectedRoute>
          <AppLayout>
            <Declarations />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/customers">
        <ProtectedRoute>
          <AppLayout>
            <Customers />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/suppliers">
        <ProtectedRoute>
          <AppLayout>
            <Suppliers />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/compliance">
        <ProtectedRoute>
          <AppLayout>
            <Compliance />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/reports">
        <ProtectedRoute>
          <AppLayout>
            <Reports />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/settings">
        <ProtectedRoute>
          <AppLayout>
            <Settings />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/saqs">
        <ProtectedRoute>
          <AppLayout>
            <SAQs />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/organization-hierarchy">
        <ProtectedRoute>
          <AppLayout>
            <OrganizationHierarchy />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      

      {/* Admin Routes */}
      <Route path="/admin/entities">
        <ProtectedRoute>
          <AppLayout>
            <Entities />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/entities/:id">
        <ProtectedRoute>
          <AppLayout>
            <EntityDetails />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/invitations">
        <ProtectedRoute>
          <AppLayout>
            <Invitations />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/products">
        <ProtectedRoute>
          <AppLayout>
            <Products />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Fallback to 404 */}
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Head title="EUDR Comply" description="European Union Deforestation Regulation Compliance Platform" />
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
