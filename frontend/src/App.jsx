import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import HomePage from "@/pages/HomePage";

const BookingWizard = lazy(() => import("@/pages/booking/BookingWizard"));
const DiagnosticTestsPage = lazy(() => import("@/pages/DiagnosticTestsPage"));
const AdminLoginPage = lazy(() => import("@/pages/admin/AdminLoginPage"));
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const BookingsDashboard = lazy(() => import("@/pages/admin/BookingsDashboard"));
const BookingDetailPage = lazy(() => import("@/pages/admin/BookingDetailPage"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage"));

const PageLoader = () => (
  <div className="flex min-h-svh items-center justify-center bg-background">
    <div className="h-8 w-8 animate-pulse rounded-full bg-primary/20" />
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/book" element={<BookingWizard />} />
            <Route path="/tests" element={<DiagnosticTestsPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/bookings" replace />} />
              <Route path="bookings" element={<BookingsDashboard />} />
              <Route path="bookings/:id" element={<BookingDetailPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Routes>
        </Suspense>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              fontSize: "var(--text-sm)",
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
