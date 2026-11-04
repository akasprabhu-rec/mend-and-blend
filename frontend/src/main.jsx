import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.jsx";
import "./index.css";
import App from "./App.jsx";
import RequireAuth from "./routes/RequireAuth.jsx";
import LoginPage from "./routes/LoginPage.jsx";
import MyTicketsPage from "./routes/MyTicketsPage.jsx";
import NotFoundPage from "./routes/NotFoundPage.jsx";
import AdminLoginPage from "./routes/AdminLoginPage.jsx";
import AdminOnlyRoute from "./routes/AdminOnlyRoute.jsx";
import AdminDashboardPage from "./routes/AdminDashboardPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
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
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
