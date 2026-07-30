import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiSearch, FiHome, FiPhone } from "react-icons/fi";
import api from "@/lib/api";
import { getApiData } from "@/lib/apiHelpers";
import { Button } from "@/components/ui/button";

export default function DiagnosticTestsPage() {
  const [tests, setTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Tests");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get("/public/categories"), api.get("/public/tests")])
      .then(([catRes, testRes]) => {
        setCategories(getApiData(catRes));
        setTests(getApiData(testRes));
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredTests = tests.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "All Tests" ||
      categories.find((c) => c.name === selectedCategory)?.id === t.category_id;
    return matchesSearch && matchesCategory;
  });

  const handleBookNow = (testId) => {
    // In a real app, you might use context to prepopulate the booking wizard.
    // For now, we'll navigate to /book.
    navigate("/book", { state: { preselectedTest: testId } });
  };

  return (
    <div className="flex min-h-svh flex-col bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 flex flex-col gap-4 border-b border-border bg-surface px-4 py-4">
        <div className="flex items-center justify-center">
          <h1 className="text-xl font-bold text-foreground">Diagnostic Tests</h1>
        </div>
        <p className="text-center text-sm text-muted">
          Find and book from our comprehensive range of clinical diagnostic tests.
        </p>

        {/* Search */}
        <div className="relative mt-2">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="text"
            placeholder="Search tests (e.g. Complete Blood Count)"
            className="w-full rounded-md border border-border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Categories (Pills) */}
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${selectedCategory === "All Tests"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-foreground hover:bg-background"
              }`}
            onClick={() => setSelectedCategory("All Tests")}
          >
            All Tests
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${selectedCategory === c.name
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground hover:bg-background"
                }`}
              onClick={() => setSelectedCategory(c.name)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-pulse rounded-full bg-primary/20" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredTests.length === 0 ? (
              <p className="text-center text-muted">No tests found.</p>
            ) : (
              filteredTests.map((test) => (
                <div key={test.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
                  {/* Badges */}
                  <div className="flex gap-2">
                    {test.patient_instruction?.toLowerCase().includes("fasting") && (
                      <span className="rounded bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                        Fasting Required
                      </span>
                    )}
                    {(!test.patient_instruction || !test.patient_instruction.toLowerCase().includes("fasting")) && (
                      <span className="rounded bg-primary-light px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Fast Results
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <h3 className="font-bold text-foreground">{test.name}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {test.patient_instruction || "Comprehensive analysis to assess your overall health."}
                    </p>
                  </div>

                  {/* Price & Action */}
                  <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-3">
                    <span className="text-lg font-bold text-foreground">
                      ₹{test.price ? test.price.toFixed(2) : "N/A"}
                    </span>
                    <Button size="sm" onClick={() => handleBookNow(test.id)}>
                      Book Now
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-surface px-2 py-2 shadow-lg">
        <Button asChild variant="ghost" className="flex flex-1 flex-col items-center justify-center gap-1 h-auto py-2 rounded-r-none border-r border-border text-foreground hover:bg-background">
          <Link to="/book">
            <FiHome className="text-lg" aria-hidden />
            <span className="text-[10px] font-medium uppercase tracking-wider">Book Home Collection</span>
          </Link>
        </Button>
        <Button asChild variant="ghost" className="flex flex-1 flex-col items-center justify-center gap-1 h-auto py-2 rounded-l-none text-foreground hover:bg-background">
          <a href="tel:+919876543210">
            <FiPhone className="text-lg" aria-hidden />
            <span className="text-[10px] font-medium uppercase tracking-wider">Call Specialist</span>
          </a>
        </Button>
      </div>
    </div>
  );
}
