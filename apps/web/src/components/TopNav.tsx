import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { useMeta } from "../lib/meta";
import { api } from "../lib/api";
import { cn } from "../lib/format";

const TAB_LABEL: Record<string, string> = { buy: "Buy", rent: "Rent", invest: "Invest" };

export function TopNav() {
  const meta = useMeta();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: alertData } = useQuery({
    queryKey: ["alerts", "nav", user?.id],
    queryFn: api.alerts,
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });
  const unread = alertData?.alerts.filter((a) => !a.readAt).length ?? 0;

  return (
    <header className="sticky top-0 z-40 bg-primary text-white">
      <nav className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span aria-hidden="true">🎯</span>
          <span>Strikepoint</span>
        </Link>

        <div className="ml-2 hidden items-center gap-1 rounded-pill bg-white/10 p-1 sm:flex">
          {meta.buyer.modeTabs.map((tab) => {
            const active = location.search.includes(`mode=${tab}`);
            return (
              <Link
                key={tab}
                to={`/results?mode=${tab}`}
                className={cn(
                  "rounded-pill px-4 py-1.5 text-sm font-medium transition",
                  active ? "bg-white text-primary" : "text-white/90 hover:bg-white/10",
                )}
              >
                {TAB_LABEL[tab] ?? tab}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-1 text-sm">
          <Link
            to="/affordability"
            className="hidden rounded-pill px-3 py-1.5 hover:bg-white/10 md:inline"
          >
            Set budget
          </Link>
          {user ? (
            <>
              <Link
                to="/saved"
                className="relative rounded-pill px-3 py-1.5 hover:bg-white/10"
                aria-label={`Saved & watchdog${unread ? `, ${unread} new alerts` : ""}`}
              >
                ♥ Saved
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-cta px-1 text-[11px] font-bold text-ink">
                    {unread}
                  </span>
                )}
              </Link>
              <button
                onClick={() => {
                  void logout().then(() => navigate("/"));
                }}
                className="rounded-pill px-3 py-1.5 hover:bg-white/10"
              >
                {user.name.split(" ")[0]} · Log out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-pill bg-cta px-4 py-1.5 font-semibold text-ink hover:bg-cta-deep"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
