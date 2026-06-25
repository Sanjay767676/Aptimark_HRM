import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { Redirect, Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";

const Login = lazy(() => import("@/pages/Login"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const HrLayout = lazy(() => import("@/components/layout/HrLayout"));
const AdminLayout = lazy(() => import("@/components/layout/AdminLayout"));

const HrDashboard = lazy(() => import("@/pages/hr/Dashboard"));
const HrStudents = lazy(() => import("@/pages/hr/Students"));
const HrNewStudent = lazy(() => import("@/pages/hr/NewStudent"));
const HrStudentDetail = lazy(() => import("@/pages/hr/StudentDetail"));
const HrOfferLetters = lazy(() => import("@/pages/hr/OfferLetters"));
const HrCertificates = lazy(() => import("@/pages/hr/Certificates"));
const HrPayments = lazy(() => import("@/pages/hr/Payments"));
const HrSettings = lazy(() => import("@/pages/hr/Settings"));

const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminStudents = lazy(() => import("@/pages/admin/Students"));
const AdminPayments = lazy(() => import("@/pages/admin/Payments"));
const AdminUsers = lazy(() => import("@/pages/admin/Users"));
const AdminSettings = lazy(() => import("@/pages/admin/Settings"));
const AdminFinancialDashboard = lazy(() => import("@/pages/admin/FinancialDashboard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function HrPage({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['hr']}>
      <HrLayout>{children}</HrLayout>
    </ProtectedRoute>
  );
}

function AdminPage({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}

function AnimatedRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/login" component={Login} />

        <Route path="/hr/dashboard"><HrPage><HrDashboard /></HrPage></Route>
        <Route path="/hr/students/new"><HrPage><HrNewStudent /></HrPage></Route>
        <Route path="/hr/students/:id"><HrPage><HrStudentDetail /></HrPage></Route>
        <Route path="/hr/students"><HrPage><HrStudents /></HrPage></Route>
        <Route path="/hr/offer-letters"><HrPage><HrOfferLetters /></HrPage></Route>
        <Route path="/hr/certificates"><HrPage><HrCertificates /></HrPage></Route>
        <Route path="/hr/payments"><HrPage><HrPayments /></HrPage></Route>
        <Route path="/hr/settings"><HrPage><HrSettings /></HrPage></Route>
        <Route path="/hr"><Redirect to="/hr/dashboard" /></Route>


        <Route path="/admin/dashboard"><AdminPage><AdminDashboard /></AdminPage></Route>
        <Route path="/admin/financial-dashboard"><AdminPage><AdminFinancialDashboard /></AdminPage></Route>
        <Route path="/admin/students/new"><AdminPage><HrNewStudent /></AdminPage></Route>
        <Route path="/admin/students/:id"><AdminPage><HrStudentDetail /></AdminPage></Route>
        <Route path="/admin/students"><AdminPage><AdminStudents /></AdminPage></Route>
        <Route path="/admin/payments"><AdminPage><AdminPayments /></AdminPage></Route>
        <Route path="/admin/users"><AdminPage><AdminUsers /></AdminPage></Route>
        <Route path="/admin/settings"><AdminPage><AdminSettings /></AdminPage></Route>
        <Route path="/admin"><Redirect to="/admin/dashboard" /></Route>

        <Route path="/"><Redirect to="/login" /></Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AuthProvider>
              <AnimatedRoutes />
              <Toaster />
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
