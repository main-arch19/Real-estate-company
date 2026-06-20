import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { MetaProvider } from "./lib/meta";
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MetaProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MetaProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
