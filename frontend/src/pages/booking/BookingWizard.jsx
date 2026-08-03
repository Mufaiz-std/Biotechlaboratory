import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { FiArrowLeft, FiCheck, FiCheckCircle, FiMapPin, FiCalendar } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import api from "@/lib/api";
import { getApiData } from "@/lib/apiHelpers";
import {
  clearBookingDraft,
  defaultDraft,
  ensureIdempotencyKey,
  loadBookingDraft,
  saveBookingDraft,
} from "@/lib/bookingDraft";
import { formatCurrency, formatDate, formatSlotRange, toDateInputValue, addDays } from "@/lib/format";
import { fuzzyMatch } from "@/lib/fuzzy";
import { openWhatsApp } from "@/lib/whatsapp";
import AddressMap from "@/components/booking/AddressMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookingWizard() {
  const location = useLocation();
  const preselectedTest = location.state?.preselectedTest;

  const [draft, setDraft] = useState(() => {
    const d = loadBookingDraft();
    if (preselectedTest && !d.selectedTestIds.includes(preselectedTest)) {
      d.selectedTestIds = [...d.selectedTestIds, preselectedTest];
      saveBookingDraft(d);
    }
    return d;
  });
  
  const [activeStep, setActiveStep] = useState(draft.step > 3 ? 0 : draft.step);
  const [catalog, setCatalog] = useState({ categories: [], tests: [], packages: [], lab: null });
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [testSearch, setTestSearch] = useState("");
  const [testSort, setTestSort] = useState("az");
  const [activeCategory, setActiveCategory] = useState("all");
  const [catalogTab, setCatalogTab] = useState("tests");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(null);
  const submitLock = useRef(false);

  const persist = useCallback((next) => {
    setDraft((prev) => {
      const merged = typeof next === "function" ? next(prev) : { ...prev, ...next };
      saveBookingDraft(merged);
      return merged;
    });
  }, []);

  useEffect(() => {
    persist({ step: activeStep });
  }, [activeStep, persist]);

  useEffect(() => {
    Promise.all([
      api.get("/public/laboratory"),
      api.get("/public/categories"),
      api.get("/public/tests"),
      api.get("/public/packages"),
    ])
      .then(([lab, cats, tests, packages]) => {
        setCatalog({
          lab: getApiData(lab),
          categories: getApiData(cats),
          tests: getApiData(tests),
          packages: getApiData(packages),
        });
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingCatalog(false));
  }, []);

  useEffect(() => {
    if (!draft.preferred_date) return;
    setSlotsLoading(true);
    api
      .get("/public/slots/available", { params: { preferred_date: draft.preferred_date } })
      .then((res) => setAvailableSlots(getApiData(res)))
      .catch((e) => toast.error(e.message))
      .finally(() => setSlotsLoading(false));
  }, [draft.preferred_date]);

  const selectedTests = useMemo(
    () => catalog.tests.filter((t) => draft.selectedTestIds.includes(t.id)),
    [catalog.tests, draft.selectedTestIds],
  );

  const selectedPackage = useMemo(
    () => catalog.packages.find((p) => p.id === draft.package_id) || null,
    [catalog.packages, draft.package_id],
  );

  const totalPrice = useMemo(() => {
    if (selectedPackage) return Number(selectedPackage.price);
    return selectedTests.reduce((sum, t) => sum + Number(t.price), 0);
  }, [selectedPackage, selectedTests]);

  const filteredTests = useMemo(() => {
    let list = catalog.tests;
    if (activeCategory !== "all") {
      list = list.filter((t) => t.category_id === Number(activeCategory));
    }
    if (testSearch) {
      list = list.filter((t) => fuzzyMatch(testSearch, t.name));
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (testSort === "az") return a.name.localeCompare(b.name);
      if (testSort === "za") return b.name.localeCompare(a.name);
      if (testSort === "price-asc") return Number(a.price) - Number(b.price);
      if (testSort === "price-desc") return Number(b.price) - Number(a.price);
      return 0;
    });
    return sorted;
  }, [catalog.tests, activeCategory, testSearch, testSort]);

  const setDateMode = (mode) => {
    const today = new Date();
    let date;
    if (mode === "today") date = today;
    else if (mode === "tomorrow") date = addDays(today, 1);
    else date = draft.preferred_date ? new Date(draft.preferred_date) : today;
    persist({
      date_mode: mode,
      preferred_date: toDateInputValue(date),
      slot_id: null,
    });
  };

  const toggleTest = (id) => {
    persist((prev) => {
      const ids = new Set(prev.selectedTestIds);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return { ...prev, selectedTestIds: [...ids], package_id: null };
    });
  };

  const selectPackage = (id) => {
    persist({ package_id: id, selectedTestIds: [] });
  };

  const uploadPrescription = async (file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post("/public/upload/prescription", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const data = getApiData(res);
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    const url = data.url.startsWith("http") ? data.url : `${base}${data.url}`;
    persist({
      prescription_image_url: url,
      prescription_preview: url,
    });
    toast.success("Prescription uploaded");
  };

  const validateStep = (step) => {
    if (step === 0) {
      if (!draft.patient_name.trim()) return "Full name is required";
      if (!draft.age || Number(draft.age) < 1) return "Valid age is required";
      if (!draft.sex) return "Sex is required";
      if (!draft.phone || draft.phone.length < 10) return "WhatsApp number is required";
    }
    if (step === 1) {
      if (!draft.selectedTestIds.length && !draft.package_id && !draft.prescription_image_url) {
        return "Select at least one test, package, or upload a prescription";
      }
    }
    if (step === 2) {
      if (!draft.address?.trim()) return "Address is required";
      if (!draft.preferred_date) return "Please select a date";
      if (draft.preferred_date < toDateInputValue(new Date())) return "Past dates are not allowed";
      if (!draft.slot_id) return "Please select a time slot";
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(activeStep);
    if (err) {
      toast.error(err);
      return;
    }
    setActiveStep((prev) => Math.min(prev + 1, 3));
  };

  const submitBooking = async () => {
    for (let s = 0; s <= 3; s++) {
      const err = validateStep(s);
      if (err) {
        toast.error(err);
        setActiveStep(s);
        return;
      }
    }
    if (submitLock.current || submitting) return;
    submitLock.current = true;
    setSubmitting(true);
    const idem = ensureIdempotencyKey(draft);
    persist({ idempotency_key: idem });
    try {
      const payload = {
        patient_name: draft.patient_name.trim(),
        age: Number(draft.age),
        sex: draft.sex,
        phone: draft.phone.trim(),
        address: draft.address.trim(),
        house_no: draft.house_no || null,
        landmark: draft.landmark || null,
        floor: draft.floor || null,
        latitude: draft.latitude,
        longitude: draft.longitude,
        preferred_date: draft.preferred_date,
        slot_id: draft.slot_id,
        package_id: draft.package_id,
        test_ids: draft.selectedTestIds,
        prescription_image_url: draft.prescription_image_url,
        patient_note: draft.patient_note || null,
        idempotency_key: idem,
      };
      const res = await api.post("/public/bookings", payload);
      const data = getApiData(res);
      setCompleted(data);
      setActiveStep(4);
      clearBookingDraft();
      setDraft(defaultDraft());

      toast.success(`Booking ${data.booking_number} created successfully!`);

      // 1. Try to open WhatsApp in a new tab (works if called close to user gesture)
      if (data.whatsapp_url) {
        const opened = window.open(data.whatsapp_url, "_blank", "noopener,noreferrer");
        // 2. If the browser blocked the popup, copy the pre-filled message to clipboard
        //    so the patient can paste it themselves. The "Open WhatsApp" button on the
        //    success screen is always there as a manual fallback.
        if (!opened && data.whatsapp_message && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(data.whatsapp_message).then(() => {
            toast.success("WhatsApp blocked — message copied to clipboard!");
          });
        }
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  };

  if (loadingCatalog) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-border bg-surface px-4 py-3 shadow-sm">
        <Link to="/" className="text-xl text-foreground">
          <FiArrowLeft aria-hidden />
        </Link>
        <div className="flex items-center gap-2 text-primary">
          <span className="text-xl font-bold">MedPrecise</span>
        </div>
        <div className="ml-auto text-[10px] font-bold uppercase tracking-widest text-primary flex items-center">
          <FiMapPin className="mr-1 text-sm" />
          Secure
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Book Home Collection</h2>
          <p className="text-sm text-muted mt-1">Complete the steps below to schedule your diagnostic tests.</p>
        </div>

        {/* Step 1: Patient Details */}
        <StepCard
          stepIndex={0}
          activeStep={activeStep}
          title="Patient Details"
          isCompleted={activeStep > 0}
          onEdit={() => setActiveStep(0)}
          summary={
            <div className="space-y-1 text-sm">
              <p className="text-muted text-xs uppercase tracking-wider font-semibold">Full Name</p>
              <p className="font-medium text-foreground">{draft.patient_name || "—"}</p>
              <p className="text-muted text-xs uppercase tracking-wider font-semibold mt-2">Contact</p>
              <p className="font-medium text-foreground">{draft.phone || "—"}</p>
            </div>
          }
        >
          <div className="space-y-4 p-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={draft.patient_name}
                onChange={(e) => persist({ patient_name: e.target.value })}
                className="text-base mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min={1}
                  value={draft.age}
                  onChange={(e) => persist({ age: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sex">Sex</Label>
                <select
                  id="sex"
                  className="border-input bg-surface mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={draft.sex}
                  onChange={(e) => persist({ sex: e.target.value })}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="phone">WhatsApp number</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                value={draft.phone}
                onChange={(e) => persist({ phone: e.target.value })}
                className="mt-1"
              />
            </div>
            <Button onClick={goNext} className="w-full mt-2">Next Step</Button>
          </div>
        </StepCard>

        {/* Step 2: Selected Tests */}
        <StepCard
          stepIndex={1}
          activeStep={activeStep}
          title="Selected Tests"
          isCompleted={activeStep > 1}
          onEdit={() => setActiveStep(1)}
          headerAction={activeStep === 1 ? null : <button onClick={(e) => {e.stopPropagation(); setActiveStep(1);}} className="text-primary text-xs font-bold uppercase tracking-wider">Add More</button>}
          summary={
            <div className="space-y-3">
              {selectedPackage && (
                <div className="rounded-lg bg-surface border border-border p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">{selectedPackage.name}</p>
                    </div>
                    <p className="font-bold">{formatCurrency(selectedPackage.price)}</p>
                  </div>
                </div>
              )}
              {selectedTests.map(t => (
                <div key={t.id} className="rounded-lg bg-surface border border-border p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 text-primary">
                        <FiCheckCircle />
                      </div>
                      <div>
                        <p className="font-semibold text-sm leading-tight">{t.name}</p>
                        {t.patient_instruction?.toLowerCase().includes("fasting") ? (
                          <p className="text-xs text-muted mt-1">Fasting required</p>
                        ) : (
                          <p className="text-xs text-muted mt-1">No fasting required</p>
                        )}
                      </div>
                    </div>
                    <p className="font-bold shrink-0">{formatCurrency(t.price)}</p>
                  </div>
                </div>
              ))}
              {!selectedPackage && selectedTests.length === 0 && draft.prescription_image_url && (
                <div className="rounded-lg bg-surface border border-border p-3">
                  <p className="font-semibold text-sm">Prescription Uploaded</p>
                  <p className="text-xs text-muted">Cost calculated later</p>
                </div>
              )}
              {!selectedPackage && selectedTests.length === 0 && !draft.prescription_image_url && (
                <p className="text-sm text-muted">No tests selected.</p>
              )}
            </div>
          }
        >
          <div className="space-y-4 p-4">
            <div className="flex gap-2 mb-4">
              <Button size="sm" variant={catalogTab === "tests" ? "default" : "outline"} onClick={() => setCatalogTab("tests")}>Tests</Button>
              <Button size="sm" variant={catalogTab === "packages" ? "default" : "outline"} onClick={() => setCatalogTab("packages")}>Packages</Button>
              <Button size="sm" variant={catalogTab === "prescription" ? "default" : "outline"} onClick={() => setCatalogTab("prescription")}>Prescription</Button>
            </div>
            
            {catalogTab === "tests" && (
              <div className="space-y-3">
                <Input placeholder="Search tests" value={testSearch} onChange={(e) => setTestSearch(e.target.value)} />
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                  <Button size="sm" variant={activeCategory === "all" ? "default" : "outline"} onClick={() => setActiveCategory("all")} className="shrink-0 rounded-full">All</Button>
                  {catalog.categories.map((c) => (
                    <Button key={c.id} size="sm" variant={activeCategory === String(c.id) ? "default" : "outline"} onClick={() => setActiveCategory(String(c.id))} className="shrink-0 rounded-full">{c.name}</Button>
                  ))}
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 border border-border rounded-md p-2 bg-surface">
                  {filteredTests.map((t) => {
                    const added = draft.selectedTestIds.includes(t.id);
                    return (
                      <div key={t.id} className="flex justify-between items-center p-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium">{t.name}</p>
                          <p className="text-xs text-muted">{formatCurrency(t.price)}</p>
                        </div>
                        <Button size="sm" variant={added ? "secondary" : "default"} onClick={() => toggleTest(t.id)}>
                          {added ? "Added" : "Add"}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {catalogTab === "packages" && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {catalog.packages.map((p) => (
                  <div key={p.id} onClick={() => selectPackage(p.id)} className={`p-3 border rounded-md cursor-pointer transition-colors ${draft.package_id === p.id ? "border-primary bg-primary-light/30" : "border-border bg-surface"}`}>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted mt-1">{p.description}</p>
                    <p className="font-bold text-primary text-sm mt-1">{formatCurrency(p.price)}</p>
                  </div>
                ))}
              </div>
            )}

            {catalogTab === "prescription" && (
               <div className="space-y-4">
                  <p className="text-sm text-muted">Upload prescription if you don't know which tests to select.</p>
                  <input type="file" className="text-sm" accept="image/*,application/pdf" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadPrescription(file).catch(err => toast.error(err.message));
                  }} />
                  {draft.prescription_image_url && <p className="text-sm font-semibold text-success">Prescription attached.</p>}
               </div>
            )}

            <Button onClick={goNext} className="w-full mt-2">Continue</Button>
          </div>
        </StepCard>

        {/* Step 3: Collection Details */}
        <StepCard
          stepIndex={2}
          activeStep={activeStep}
          title="Collection Details"
          isCompleted={activeStep > 2}
          onEdit={() => setActiveStep(2)}
          summary={
            <div className="space-y-1 text-sm">
              <p className="text-muted text-xs uppercase tracking-wider font-semibold">Address</p>
              <p className="font-medium text-foreground">{draft.house_no ? `${draft.house_no}, ` : ""}{draft.address}</p>
              <p className="text-muted text-xs uppercase tracking-wider font-semibold mt-2">Schedule</p>
              <p className="font-medium text-foreground">
                {draft.preferred_date ? formatDate(draft.preferred_date) : "—"} 
                {draft.slot_id && availableSlots.find(s => s.id === draft.slot_id) 
                  ? ` at ${formatSlotRange(availableSlots.find(s => s.id === draft.slot_id).start_time, availableSlots.find(s => s.id === draft.slot_id).end_time)}`
                  : ""}
              </p>
            </div>
          }
        >
          <div className="space-y-6 p-4">
            <div>
              <Label className="flex items-center gap-1 mb-2 text-foreground font-semibold"><FiMapPin /> Service Address</Label>
              <div className="space-y-3">
                <AddressMap
                  latitude={draft.latitude}
                  longitude={draft.longitude}
                  address={draft.address}
                  onAddressChange={(address) => persist({ address })}
                  onCoordsChange={(latitude, longitude) => persist({ latitude, longitude })}
                />
                <div>
                  <Label className="text-xs">Street Address</Label>
                  <Input className="mt-1" value={draft.address} onChange={(e) => persist({ address: e.target.value })} placeholder="123 Wellness Blvd" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">House / Flat / Apt</Label>
                    <Input className="mt-1" value={draft.house_no} onChange={(e) => persist({ house_no: e.target.value })} placeholder="Apt 4B" />
                  </div>
                  <div>
                    <Label className="text-xs">City / Landmark</Label>
                    <Input className="mt-1" value={draft.landmark} onChange={(e) => persist({ landmark: e.target.value })} placeholder="Metropolis" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <Label className="flex items-center gap-1 mb-3 text-foreground font-semibold"><FiCalendar /> Schedule Date & Time</Label>
              
              {/* Date Selector */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {["today", "tomorrow"].map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={draft.date_mode === mode ? "outline" : "outline"}
                    className={`h-16 flex-col gap-1 rounded-xl ${draft.date_mode === mode ? 'border-primary ring-1 ring-primary text-primary' : 'text-muted-foreground'}`}
                    onClick={() => setDateMode(mode)}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{addDays(new Date(), mode === "today" ? 0 : 1).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="text-lg font-bold">{addDays(new Date(), mode === "today" ? 0 : 1).getDate()}</span>
                  </Button>
                ))}
                 <Button
                    type="button"
                    variant={draft.date_mode === "custom" ? "outline" : "outline"}
                    className={`h-16 flex-col gap-1 rounded-xl ${draft.date_mode === "custom" ? 'border-primary ring-1 ring-primary text-primary' : 'text-muted-foreground'}`}
                    onClick={() => setDateMode("custom")}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Custom</span>
                    <FiCalendar className="text-lg" />
                  </Button>
              </div>
              
              {draft.date_mode === "custom" && (
                <div className="mb-4">
                  <Input type="date" min={toDateInputValue(new Date())} value={draft.preferred_date} onChange={(e) => persist({ preferred_date: e.target.value, slot_id: null })} />
                </div>
              )}

              {/* Time Selector */}
              {slotsLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableSlots.length === 0 && draft.preferred_date && (
                    <p className="col-span-2 text-center text-sm text-muted">No slots available on this date.</p>
                  )}
                  {availableSlots.map((s) => (
                     <Button
                       key={s.id}
                       type="button"
                       variant="outline"
                       className={`rounded-md font-medium h-10 ${draft.slot_id === s.id ? 'bg-primary text-primary-foreground border-primary' : 'text-foreground hover:bg-background'}`}
                       onClick={() => persist({ slot_id: s.id })}
                     >
                       {formatSlotRange(s.start_time, s.end_time)}
                     </Button>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={goNext} className="w-full mt-2">Next Step</Button>
          </div>
        </StepCard>

        {/* Step 4: Review & Confirm */}
        <StepCard
          stepIndex={3}
          activeStep={activeStep}
          title="Review & Confirm"
          isCompleted={activeStep > 3}
          onEdit={() => {}}
          summary={null}
        >
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted text-center">Please review your booking details above. If everything is correct, click the button below to confirm via WhatsApp.</p>
          </div>
        </StepCard>

        {/* Success State */}
        {activeStep === 4 && completed && (
          <div className="space-y-4 p-6 text-center rounded-xl bg-surface border border-border shadow-sm mt-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <FiCheck className="text-3xl text-success" aria-hidden />
            </div>
            <h2 className="text-xl font-bold">Booking {completed.booking_number}</h2>
            <p className="text-sm text-muted">
              Complete the WhatsApp message to confirm with the lab.
            </p>
            <Button className="w-full gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white" onClick={() => openWhatsApp(completed.whatsapp_url)}>
              <FaWhatsapp className="text-xl" />
              Open WhatsApp
            </Button>
          </div>
        )}

      </main>

      {/* Sticky Bottom Bar for Review & Confirm */}
      {activeStep === 3 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface p-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.1)]">
          <div className="mx-auto max-w-lg">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold tracking-wider text-muted">Total Amount to Pay at Home</span>
              <span className="text-xl font-bold text-foreground">{formatCurrency(totalPrice)}</span>
            </div>
            <Button
              className="w-full gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white py-6 rounded-xl font-bold text-base"
              disabled={submitting}
              onClick={submitBooking}
            >
              <FaWhatsapp className="text-xl" />
              {submitting ? "Processing..." : "Confirm via WhatsApp"}
            </Button>
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar for activeStep < 3 (just showing total) */}
      {activeStep < 3 && (selectedTests.length > 0 || selectedPackage) && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface p-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.1)]">
           <div className="mx-auto max-w-lg flex justify-between items-center">
             <span className="text-sm font-semibold">{selectedPackage ? "1 Package" : `${selectedTests.length} Tests`} Selected</span>
             <span className="text-lg font-bold">{formatCurrency(totalPrice)}</span>
           </div>
        </div>
      )}
    </div>
  );
}

function StepCard({ stepIndex, activeStep, title, isCompleted, onEdit, summary, headerAction, children }) {
  const isActive = stepIndex === activeStep;
  const isPast = stepIndex < activeStep;

  let icon = <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/20 text-xs font-bold text-muted-foreground">{stepIndex + 1}</div>;
  if (isActive) {
    icon = <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{stepIndex + 1}</div>;
  } else if (isPast || isCompleted) {
    icon = <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"><FiCheck /></div>;
  }

  return (
    <div className={`mb-4 overflow-hidden rounded-xl bg-surface transition-colors ${isActive ? 'border-l-4 border-l-primary shadow-sm border-t border-r border-b border-border/50' : 'border border-border'}`}>
      {/* Header */}
      <div 
        className={`flex items-center justify-between p-4 ${isPast ? 'cursor-pointer hover:bg-background' : ''}`}
        onClick={() => { if (isPast && !isActive) onEdit(); }}
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className={`font-bold ${isActive ? 'text-primary text-lg' : 'text-foreground'}`}>{title}</h3>
        </div>
        {headerAction ? headerAction : isPast && !isActive && onEdit && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-xs font-bold tracking-wider text-primary">Edit</button>
        )}
      </div>

      {/* Body */}
      {isActive && (
        <div className="bg-surface">
          {children}
        </div>
      )}

      {/* Summary */}
      {!isActive && isPast && summary && (
        <div className="bg-background/30 p-4 border-t border-border/50">
          {summary}
        </div>
      )}
    </div>
  );
}
