import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { ThemeProvider } from "./theme/ThemeContext.jsx";
import "./index.css";
import App from "./App.jsx";
import RequireAuth from "./routes/RequireAuth.jsx";
import LoginPage from "./routes/LoginPage.jsx";
import MyTicketsPage from "./routes/MyTicketsPage.jsx";
import MyReservationsPage from "./routes/MyReservationsPage.jsx";
import NotFoundPage from "./routes/NotFoundPage.jsx";
import AdminLoginPage from "./routes/AdminLoginPage.jsx";
import AdminOnlyRoute from "./routes/AdminOnlyRoute.jsx";
import AdminDashboardPage from "./routes/AdminDashboardPage.jsx";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <div key={`${location.pathname}${location.search}`} className="route-transition">
      <Routes location={location}>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/my-tickets"
          element={
            <RequireAuth>
              <MyTicketsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/my-reservations"
          element={
            <RequireAuth>
              <MyReservationsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminOnlyRoute>
              <AdminDashboardPage />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/admin/workshops"
          element={
            <AdminOnlyRoute>
              <AdminDashboardPage />
            </AdminOnlyRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AnimatedRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
