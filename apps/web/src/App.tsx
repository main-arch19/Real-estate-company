import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { TopNav } from "./components/TopNav";
import { useAuth } from "./lib/auth";
import { Home } from "./routes/Home";
import { Results } from "./routes/Results";
import { Listing } from "./routes/Listing";
import { Affordability } from "./routes/Affordability";
import { OfferDraft } from "./routes/OfferDraft";
import { Saved } from "./routes/Saved";
import { Auth } from "./routes/Auth";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-8 text-muted">Loading…</div>;
  if (!user) return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

export default function App() {
  const location = useLocation();
  // The offer draft route renders a print-optimized page without the nav.
  const isPrintRoute = location.pathname.startsWith("/offer/");

  return (
    <div className="flex min-h-screen flex-col">
      {!isPrintRoute && <TopNav />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results" element={<Results />} />
          <Route path="/listing/:id" element={<Listing />} />
          <Route path="/affordability" element={<Affordability />} />
          <Route
            path="/offer/:id"
            element={
              <RequireAuth>
                <OfferDraft />
              </RequireAuth>
            }
          />
          <Route
            path="/saved"
            element={
              <RequireAuth>
                <Saved />
              </RequireAuth>
            }
          />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
