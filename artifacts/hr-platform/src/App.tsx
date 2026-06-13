import { Suspense, lazy } from 'react';
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AnimatePresence } from "framer-motion";
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
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />} key={location}>
        <Switch location={location}>
          <Route path="/login" component={Login} />

          <Route path="/hr/*">
            <ProtectedRoute allowedRoles={['hr']}>
              <HrLayout>
                <Switch>
                  <Route path="/hr/dashboard" component={HrDashboard} />
                  <Route component={NotFound} />
                </Switch>
              </HrLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/*">
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout>
                <Switch>
                  <Route path="/admin/dashboard" component={AdminDashboard} />
                  <Route component={NotFound} />
                </Switch>
              </AdminLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/">
            {() => {
              window.location.href = "/login";
              return null;
            }}
          </Route>

          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AnimatedRoutes />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
