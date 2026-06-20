import { Input, Select } from "./ui";

export interface Filters {
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  type?: string;
  affordableOnly?: boolean;
}

export function FilterRail({
  filters,
  onChange,
  affordableAvailable,
  onRequestBudget,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  affordableAvailable: boolean;
  onRequestBudget: () => void;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const num = (v: string): number | undefined => (v === "" ? undefined : Number(v));

  return (
    <div className="space-y-5">
      {/* Affordability-fit toggle */}
      <div className="rounded-[10px] border border-success/30 bg-success/5 p-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-success"
            checked={Boolean(filters.affordableOnly)}
            onChange={(e) => {
              if (e.target.checked && !affordableAvailable) {
                onRequestBudget();
                return;
              }
              set({ affordableOnly: e.target.checked });
            }}
          />
          <span>
            <span className="block text-sm font-semibold text-ink">Affordable-fit only</span>
            <span className="block text-xs text-muted">
              Hide everything above what you can really afford.
              {!affordableAvailable && " Set your budget first."}
            </span>
          </span>
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Price</legend>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Min"
            aria-label="Minimum price"
            value={filters.minPrice ?? ""}
            onChange={(e) => set({ minPrice: num(e.target.value) })}
          />
          <span className="text-muted">–</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Max"
            aria-label="Maximum price"
            value={filters.maxPrice ?? ""}
            onChange={(e) => set({ maxPrice: num(e.target.value) })}
          />
        </div>
      </fieldset>

      <div>
        <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="f-type">
          Property type
        </label>
        <Select
          id="f-type"
          value={filters.type ?? ""}
          onChange={(e) => set({ type: e.target.value || undefined })}
        >
          <option value="">Any type</option>
          <option value="house">House</option>
          <option value="apartment">Apartment</option>
          <option value="townhouse">Townhouse</option>
          <option value="land">Land</option>
          <option value="commercial">Commercial</option>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="f-beds">
            Beds
          </label>
          <Select
            id="f-beds"
            value={filters.beds ?? ""}
            onChange={(e) => set({ beds: num(e.target.value) })}
          >
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="f-baths">
            Baths
          </label>
          <Select
            id="f-baths"
            value={filters.baths ?? ""}
            onChange={(e) => set({ baths: num(e.target.value) })}
          >
            <option value="">Any</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
