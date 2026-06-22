import { Suspense, lazy } from 'react';
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AnimatePresence } from "framer-motion";
import NotFound from "@/pages/not-found";

const Login = lazy(() => import("@/pages/Login"));

const PageLoader = () => {
  console.log("PageLoader: Rendering fallback spinner.");
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

// Layouts
const HrLayout    = lazy(() => import("@/components/layout/HrLayout"));
const AdminLayout = lazy(() => import("@/components/layout/AdminLayout"));

// HR pages
const HrDashboard    = lazy(() => import("@/pages/hr/Dashboard"));
const HrStudents     = lazy(() => import("@/pages/hr/Students"));
const HrNewStudent   = lazy(() => import("@/pages/hr/NewStudent"));
const HrStudentDetail= lazy(() => import("@/pages/hr/StudentDetail"));
const HrOfferLetters = lazy(() => import("@/pages/hr/OfferLetters"));
const HrCertificates = lazy(() => import("@/pages/hr/Certificates"));
const HrPayments     = lazy(() => import("@/pages/hr/Payments"));
const HrSettings     = lazy(() => import("@/pages/hr/Settings"));

// Admin pages
const AdminDashboard    = lazy(() => import("@/pages/admin/Dashboard"));
const AdminStudents     = lazy(() => import("@/pages/admin/Students"));
const AdminPayments     = lazy(() => import("@/pages/admin/Payments"));
const AdminUsers        = lazy(() => import("@/pages/admin/Users"));
const AdminSettings     = lazy(() => import("@/pages/admin/Settings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false, // Prevents loading spinners every time the window is focused
      retry: 1,
    },
  },
});

function AnimatedRoutes() {
  const [location] = useLocation();
  console.log("AnimatedRoutes: Rendering started. Current path:", location);

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />} key={location}>
        <Switch location={location}>
          <Route path="/login" component={Login} />

          {/* ── HR Portal ─────────────────────────────── */}
          <Route path="/hr/*">
            <ProtectedRoute allowedRoles={['hr']}>
              <HrLayout>
                <Switch>
                  <Route path="/hr/dashboard"     component={HrDashboard} />
                  <Route path="/hr/students/new"  component={HrNewStudent} />
                  <Route path="/hr/students/:id"  component={HrStudentDetail} />
                  <Route path="/hr/students"      component={HrStudents} />
                  <Route path="/hr/offer-letters" component={HrOfferLetters} />
                  <Route path="/hr/certificates"  component={HrCertificates} />
                  <Route path="/hr/payments"      component={HrPayments} />
                  <Route path="/hr/settings"      component={HrSettings} />
                  <Route component={NotFound} />
                </Switch>
              </HrLayout>
            </ProtectedRoute>
          </Route>

          {/* ── Admin Portal ──────────────────────────── */}
          <Route path="/admin/*">
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout>
                <Switch>
                  <Route path="/admin/dashboard"     component={AdminDashboard} />
                  <Route path="/admin/students/new"  component={HrNewStudent} />
                  <Route path="/admin/students/:id"  component={HrStudentDetail} />
                  <Route path="/admin/students"      component={AdminStudents} />
                  <Route path="/admin/payments"      component={AdminPayments} />
                  <Route path="/admin/users"         component={AdminUsers} />
                  <Route path="/admin/settings"      component={AdminSettings} />
                  <Route component={NotFound} />
                </Switch>
              </AdminLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/">
            {() => { window.location.href = "/login"; return null; }}
          </Route>

          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AnimatePresence>
  );
}

function App() {
  console.log("App component: Rendering started.");
  return (
    <ErrorBoundary>
      {console.log("App: ErrorBoundary rendered.") || (
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {console.log("App: ThemeProvider rendered.") || (
            <QueryClientProvider client={queryClient}>
              {console.log("App: QueryClientProvider rendered.") || (
                <AuthProvider>
                  {console.log("App: AuthProvider rendered.") || (
                    <TooltipProvider>
                      {console.log("App: TooltipProvider rendered.") || (
                        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                          {console.log("App: WouterRouter rendered.") || (
                            <AnimatedRoutes />
                          )}
                        </WouterRouter>
                      )}
                    </TooltipProvider>
                  )}
                </AuthProvider>
              )}
            </QueryClientProvider>
          )}
        </ThemeProvider>
      )}
    </ErrorBoundary>
  );
}

export default App;
