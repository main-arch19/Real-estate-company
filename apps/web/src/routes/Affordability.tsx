import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { EmploymentType } from "@rep/shared";
import { computeAffordability } from "@rep/shared";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { money, pct } from "../lib/format";
import { Button, Card, Input, Select } from "../components/ui";
import { Disclaimer } from "../components/Disclaimer";

export function Affordability() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [income, setIncome] = useState(6_000_000);
  const [debts, setDebts] = useState(40_000);
  const [down, setDown] = useState(4_000_000);
  const [employment, setEmployment] = useState<EmploymentType>("salaried");
  const [dependents, setDependents] = useState(0);

  // Prefill from a saved profile if signed in.
  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
    enabled: Boolean(user),
  });
  useEffect(() => {
    const p = profileData?.profile;
    if (p) {
      setIncome(p.grossAnnualIncome);
      setDebts(p.monthlyDebts);
      setDown(p.downPayment);
      setEmployment(p.employmentType);
      setDependents(p.dependents ?? 0);
    }
  }, [profileData]);

  // Live, client-side preview (same math the server uses).
  const result = useMemo(
    () =>
      computeAffordability({
        id: "preview",
        userId: "preview",
        grossAnnualIncome: income,
        monthlyDebts: debts,
        downPayment: down,
        employmentType: employment,
        dependents,
        updatedAt: new Date().toISOString(),
      }),
    [income, debts, down, employment, dependents],
  );

  const saveMut = useMutation({
    mutationFn: () =>
      api.saveProfile({
        grossAnnualIncome: income,
        monthlyDebts: debts,
        downPayment: down,
        employmentType: employment,
        dependents,
      }),
    onSuccess: () => navigate("/results?affordable=1"),
  });

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8">
      <h1 className="font-display text-3xl font-bold">What can you really afford?</h1>
      <p className="mt-1 text-muted">
        Tell us a few numbers and we'll reverse-engineer your real price ceiling and true monthly cost —
        then hide everything above it.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_360px]">
        {/* Wizard */}
        <Card className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Gross annual income</span>
            <Input
              type="number"
              inputMode="numeric"
              value={income}
              onChange={(e) => setIncome(Number(e.target.value) || 0)}
            />
          </label>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Monthly debt payments — {money(debts)}
            </label>
            <input
              type="range"
              min={0}
              max={300_000}
              step={5_000}
              value={debts}
              onChange={(e) => setDebts(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Monthly debts"
            />
            <p className="text-xs text-muted">Loans, cards, hire-purchase — anything you pay monthly.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Down payment — {money(down)}
            </label>
            <input
              type="range"
              min={0}
              max={30_000_000}
              step={250_000}
              value={down}
              onChange={(e) => setDown(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Down payment"
            />
            <p className="text-xs text-muted">Drag to see how a bigger deposit changes your options.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Employment</span>
              <Select
                value={employment}
                onChange={(e) => setEmployment(e.target.value as EmploymentType)}
              >
                <option value="salaried">Salaried</option>
                <option value="self_employed">Self-employed</option>
                <option value="contract">Contract</option>
                <option value="other">Other</option>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Dependents</span>
              <Input
                type="number"
                min={0}
                value={dependents}
                onChange={(e) => setDependents(Number(e.target.value) || 0)}
              />
            </label>
          </div>

          <Disclaimer which="privacy" />
        </Card>

        {/* Live result */}
        <div className="space-y-4">
          <Card className="bg-primary p-5 text-white">
            <p className="text-sm text-white/80">You can likely afford up to</p>
            <p className="tnum mt-1 font-display text-3xl font-bold">
              {money(result.maxAffordablePrice)}
            </p>
            <div className="mt-3 space-y-1 text-sm text-white/90">
              <Row label="Monthly housing budget" value={money(result.monthlyHousingBudget)} />
              <Row label="Assumed rate" value={pct(result.assumedAnnualRate, 2)} />
              <Row label="Term" value={`${result.termYears} years`} />
            </div>
          </Card>

          <Button
            variant="cta"
            className="w-full"
            onClick={() => {
              if (!user) {
                navigate("/auth", { state: { from: "/affordability" } });
                return;
              }
              saveMut.mutate();
            }}
            disabled={saveMut.isPending}
          >
            {user ? "Save & see homes that fit →" : "Sign in to save your budget"}
          </Button>

          <Disclaimer which="affordability" />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="tnum font-semibold">{value}</span>
    </div>
  );
}
