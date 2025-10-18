// src/router.js
import React, { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import MinimalHeaderLayout from "./layouts/MinimalHeaderLayout";

// Lazy imports (automatic code splitting)
const LoginPage = lazy(() => import("./pages/LoginPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const LedgerPage = lazy(() => import("./pages/LedgerPage"));
const RulesPage = lazy(() => import("./pages/RulesPage"));
const CasinoPage = lazy(() => import("./pages/CasinoPage"));
const TeenPlayPage = lazy(() => import("./pages/TeenPlayPage"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage"));
const StatementPage = lazy(() => import("./pages/StatementPage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ComingSoonPage = lazy(() => import("./pages/ComingSoonPage"));

// Tiny wrapper for lazy fallbacks
const withSuspense = (el) => <Suspense fallback={null}>{el}</Suspense>;

export const router = createBrowserRouter(
  [
    // Public route (no header/bars)
    { path: "/", element: withSuspense(<LoginPage />) },

    // Minimal header only
    {
      element: <MinimalHeaderLayout />,
      children: [{ path: "/coming-soon", element: withSuspense(<ComingSoonPage />) }],
    },

    // Full app shell
    {
      element: <AppLayout />,
      children: [
        { path: "/home", element: withSuspense(<HomePage />) },
        { path: "/rules", element: withSuspense(<RulesPage />) },
        { path: "/ledger", element: withSuspense(<LedgerPage />) },
        { path: "/statement", element: withSuspense(<StatementPage />) },
        { path: "/casino", element: withSuspense(<CasinoPage />) },
        { path: "/teen-play", element: withSuspense(<TeenPlayPage />) },
        { path: "/user-management", element: withSuspense(<UserManagementPage />) },
        { path: "/password", element: withSuspense(<ChangePasswordPage />) },
        { path: "/profile", element: withSuspense(<ProfilePage />) },
      ],
    },
  ],
  {
    future: { v7_startTransition: true, v7_relativeSplatPath: true },
  }
);
