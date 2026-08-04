import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "@/lib/useDebounce";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiSearch } from "react-icons/fi";
import api from "@/lib/api";
import { getApiData } from "@/lib/apiHelpers";
import { formatDate, formatSlotRange } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const QUICK_FILTERS = [
  { key: "", label: "All" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "Pending", label: "Pending" },
  { key: "Accepted", label: "Accepted" },
  { key: "Completed", label: "Completed" },
];

export default function BookingsDashboard() {
  const [summary, setSummary] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [quick, setQuick] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [tests, setTests] = useState([]);
  const [packages, setPackages] = useState([]);
  const [advanced, setAdvanced] = useState({
    technician_id: "",
    date_from: "",
    date_to: "",
    test_id: "",
    package_id: "",
    area: "",
    has_prescription: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search: debouncedSearch || undefined };
      if (quick === "today" || quick === "tomorrow") params.date_filter = quick;
      else if (quick) params.status = quick;
      if (advanced.technician_id) params.technician_id = advanced.technician_id;
      if (advanced.date_from) params.date_from = advanced.date_from;
      if (advanced.date_to) params.date_to = advanced.date_to;
      if (advanced.test_id) params.test_id = advanced.test_id;
      if (advanced.package_id) params.package_id = advanced.package_id;
      if (advanced.area) params.area = advanced.area;
      if (advanced.has_prescription === "yes") params.has_prescription = true;
      if (advanced.has_prescription === "no") params.has_prescription = false;

      const [sumRes, listRes] = await Promise.all([
        api.get("/admin/bookings/summary"),
        api.get("/admin/bookings", { params }),
      ]);
      setSummary(getApiData(sumRes));
      setBookings(getApiData(listRes));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, quick, advanced]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get("/admin/technicians").then((r) => setTechnicians(getApiData(r)));
    api.get("/admin/tests").then((r) => setTests(getApiData(r)));
    api.get("/admin/packages").then((r) => setPackages(getApiData(r)));
  }, []);

  const onSearchChange = (value) => setSearch(value);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary ? (
          <>
            <SummaryCard label="Pending" value={summary.pending} />
            <SummaryCard label="Today's bookings" value={summary.today} />
            <SummaryCard label="Accepted" value={summary.accepted} />
            <SummaryCard label="Completed" value={summary.completed} />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <FiSearch className="text-muted absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <Input
            className="pl-9"
            placeholder="Search booking ID, patient, phone, tests, area…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
        </div>
        <Button type="button" variant="outline" onClick={load}>
          Search
        </Button>
        <Button type="button" variant="ghost" onClick={() => setShowAdvanced((v) => !v)}>
          {showAdvanced ? "Hide filters" : "Advanced"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((f) => (
          <Button
            key={f.label}
            size="sm"
            variant={quick === f.key ? "default" : "outline"}
            onClick={() => setQuick(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {showAdvanced && (
        <Card>
          <CardContent className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-3">
            <FilterSelect
              label="Technician"
              value={advanced.technician_id}
              onChange={(v) => setAdvanced((a) => ({ ...a, technician_id: v }))}
              options={technicians.map((t) => ({ value: t.id, label: t.name }))}
            />
            <div>
              <label className="text-sm font-medium">Date from</label>
              <Input
                type="date"
                value={advanced.date_from}
                onChange={(e) => setAdvanced((a) => ({ ...a, date_from: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Date to</label>
              <Input
                type="date"
                value={advanced.date_to}
                onChange={(e) => setAdvanced((a) => ({ ...a, date_to: e.target.value }))}
              />
            </div>
            <FilterSelect
              label="Test"
              value={advanced.test_id}
              onChange={(v) => setAdvanced((a) => ({ ...a, test_id: v }))}
              options={tests.map((t) => ({ value: t.id, label: t.name }))}
            />
            <FilterSelect
              label="Package"
              value={advanced.package_id}
              onChange={(v) => setAdvanced((a) => ({ ...a, package_id: v }))}
              options={packages.map((p) => ({ value: p.id, label: p.name }))}
            />
            <div>
              <label className="text-sm font-medium">Area</label>
              <Input
                value={advanced.area}
                onChange={(e) => setAdvanced((a) => ({ ...a, area: e.target.value }))}
              />
            </div>
            <FilterSelect
              label="Prescription"
              value={advanced.has_prescription}
              onChange={(v) => setAdvanced((a) => ({ ...a, has_prescription: v }))}
              options={[
                { value: "", label: "Any" },
                { value: "yes", label: "Uploaded" },
                { value: "no", label: "Not uploaded" },
              ]}
            />
            <Button type="button" className="sm:col-span-2 lg:col-span-3" onClick={load}>
              Apply filters
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface lg:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-border bg-primary-light/50">
            <tr>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Booking ID</th>
              <th className="p-3 font-medium">Patient</th>
              <th className="p-3 font-medium">Phone</th>
              <th className="p-3 font-medium">Tests / Package</th>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Time</th>
              <th className="p-3 font-medium">Technician</th>
              <th className="p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={9} className="p-3">
                    <Skeleton className="h-8 w-full" />
                  </td>
                </tr>
              ))}
            {!loading &&
              bookings.map((b) => (
                <tr key={b.id} className="border-b border-border hover:bg-primary-light/30">
                  <td className="p-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="p-3 font-mono text-xs">{b.booking_number}</td>
                  <td className="p-3">{b.patient_name}</td>
                  <td className="p-3">{b.phone}</td>
                  <td className="p-3 max-w-[200px] truncate">{b.tests_summary}</td>
                  <td className="p-3">{formatDate(b.preferred_date)}</td>
                  <td className="p-3">{formatSlotRange(b.slot_start, b.slot_end)}</td>
                  <td className="p-3">{b.assigned_technician_name || "—"}</td>
                  <td className="p-3">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/bookings/${b.id}`}>Open</Link>
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 lg:hidden">
        {loading && <Skeleton className="h-32 w-full" />}
        {!loading &&
          bookings.map((b) => (
            <Card key={b.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex items-center justify-between">
                  <StatusBadge status={b.status} />
                  <span className="font-mono text-xs">{b.booking_number}</span>
                </div>
                <p className="text-lg font-semibold">{b.patient_name}</p>
                <p className="text-muted text-sm">{b.phone}</p>
                <p className="text-sm">{b.tests_summary}</p>
                <p className="text-sm">
                  {formatDate(b.preferred_date)} · {formatSlotRange(b.slot_start, b.slot_end)}
                </p>
                <p className="text-muted text-sm">Area: {b.area || "—"}</p>
                <Button asChild className="w-full">
                  <Link to={`/admin/bookings/${b.id}`}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-muted text-sm">{label}</p>
        <p className="text-2xl font-semibold text-primary">{value}</p>
      </CardContent>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <select
        className="border-input bg-surface mt-1 h-10 w-full rounded-md border px-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
