import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiData } from "@/lib/apiHelpers";
import { formatSlotRange } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import ConfirmDisableDialog from "@/components/ConfirmDisableDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TABS = [
  { id: "laboratory", label: "Laboratory" },
  { id: "slots", label: "Slots" },
  { id: "tests", label: "Tests" },
  { id: "packages", label: "Health Packages" },
  { id: "whatsapp", label: "WhatsApp Templates" },
  { id: "profile", label: "Profile" },
];

const DISABLE_MSG =
  "Disabling only hides this from new bookings. Existing bookings are unchanged. Continue?";

export default function AdminSettingsPage() {
  const [tab, setTab] = useState("laboratory");
  const saveLock = useRef(false);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin settings</h1>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "default" : "outline"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      {tab === "laboratory" && <LaboratoryTab saveLock={saveLock} />}
      {tab === "slots" && <SlotsTab saveLock={saveLock} />}
      {tab === "tests" && <TestsTab saveLock={saveLock} />}
      {tab === "packages" && <PackagesTab saveLock={saveLock} />}
      {tab === "whatsapp" && <WhatsAppTab saveLock={saveLock} />}
      {tab === "profile" && <ProfileTab saveLock={saveLock} />}
    </div>
  );
}

function LaboratoryTab({ saveLock }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/laboratory")
      .then((r) => setForm(getApiData(r)))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (saveLock.current) return;
    saveLock.current = true;
    try {
      const res = await api.put("/admin/laboratory", form);
      setForm(getApiData(res));
      toast.success("Laboratory info saved");
    } catch (e) {
      toast.error(e.message);
    } finally {
      saveLock.current = false;
    }
  };

  if (loading || !form) return <Skeleton className="h-64 w-full" />;

  const fields = [
    ["lab_name", "Lab name"],
    ["logo_url", "Logo URL"],
    ["phone", "Phone"],
    ["whatsapp_number", "WhatsApp number"],
    ["email", "Email"],
    ["address", "Address"],
    ["google_maps_link", "Google Maps link"],
  ];

  return (
    <Card>
      <CardContent className="grid gap-3 py-4 sm:grid-cols-2">
        {fields.map(([key, label]) => (
          <div key={key}>
            <Label>{label}</Label>
            <Input
              value={form[key] || ""}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}
        <Button type="button" className="sm:col-span-2" onClick={save}>
          Save laboratory info
        </Button>
      </CardContent>
    </Card>
  );
}

function SlotsTab({ saveLock }) {
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({ start_time: "", end_time: "", capacity: 5 });
  const [disableTarget, setDisableTarget] = useState(null);

  const load = () => api.get("/admin/slots").then((r) => setSlots(getApiData(r)));

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (saveLock.current) return;
    saveLock.current = true;
    try {
      await api.post("/admin/slots", { ...form, capacity: Number(form.capacity) });
      toast.success("Slot created");
      setForm({ start_time: "", end_time: "", capacity: 5 });
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      saveLock.current = false;
    }
  };

  const updateSlot = async (slot, patch) => {
    if (saveLock.current) return;
    saveLock.current = true;
    try {
      await api.put(`/admin/slots/${slot.id}`, patch);
      toast.success("Slot updated");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      saveLock.current = false;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add slot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>Start</Label>
            <Input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
            />
          </div>
          <div>
            <Label>End</Label>
            <Input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
            />
          </div>
          <div>
            <Label>Capacity</Label>
            <Input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            />
          </div>
          <Button type="button" className="self-end" onClick={create}>
            Add
          </Button>
        </CardContent>
      </Card>
      {slots.map((s) => (
        <Card key={s.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
            <div>
              <p className="font-medium">{formatSlotRange(s.start_time, s.end_time)}</p>
              <p className="text-muted text-sm">
                Capacity: {s.capacity} · {s.is_enabled ? "Enabled" : "Disabled"}
              </p>
            </div>
            <Button
              type="button"
              variant={s.is_enabled ? "outline" : "default"}
              onClick={() => {
                if (s.is_enabled) setDisableTarget(s);
                else updateSlot(s, { is_enabled: true });
              }}
            >
              {s.is_enabled ? "Disable" : "Enable"}
            </Button>
          </CardContent>
        </Card>
      ))}
      <ConfirmDisableDialog
        open={!!disableTarget}
        onOpenChange={() => setDisableTarget(null)}
        title="Disable time slot?"
        description={DISABLE_MSG}
        onConfirm={() => {
          updateSlot(disableTarget, { is_enabled: false });
          setDisableTarget(null);
        }}
      />
    </div>
  );
}

function TestsTab({ saveLock }) {
  const [categories, setCategories] = useState([]);
  const [tests, setTests] = useState([]);
  const [catName, setCatName] = useState("");
  const [testForm, setTestForm] = useState({
    name: "",
    category_id: "",
    price: "",
    patient_instruction: "",
  });
  const [editingTest, setEditingTest] = useState(null);
  const [disableTarget, setDisableTarget] = useState(null);
  const [deleteTestTarget, setDeleteTestTarget] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCatName, setEditCatName] = useState("");
  const [deleteCatTarget, setDeleteCatTarget] = useState(null);
  const [showCategories, setShowCategories] = useState(true);
  const [showTests, setShowTests] = useState(true);
  const [catSearch, setCatSearch] = useState("");
  const [testSearch, setTestSearch] = useState("");
  const testFormRef = useRef(null);

  const load = () =>
    Promise.all([api.get("/admin/categories"), api.get("/admin/tests")]).then(([c, t]) => {
      setCategories(getApiData(c));
      setTests(getApiData(t));
    });

  useEffect(() => {
    load();
  }, []);

  const addCategory = async () => {
    if (!catName.trim() || saveLock.current) return;
    saveLock.current = true;
    try {
      await api.post("/admin/categories", { name: catName.trim() });
      toast.success("Category created");
      setCatName("");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      saveLock.current = false;
    }
  };

  const deleteCategory = async (id) => {
    if (saveLock.current) return;
    saveLock.current = true;
    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success("Category deleted");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      saveLock.current = false;
    }
  };

  const saveEditCategory = async (c) => {
    if (!editCatName.trim() || saveLock.current) return;
    saveLock.current = true;
    try {
      await api.put(`/admin/categories/${c.id}`, { name: editCatName.trim() });
      toast.success("Category updated");
      setEditingCategory(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      saveLock.current = false;
    }
  };

  const toggleCategory = async (cat) => {
    if (cat.is_enabled) {
      await api.put(`/admin/categories/${cat.id}`, { is_enabled: false });
    } else {
      await api.put(`/admin/categories/${cat.id}`, { is_enabled: true });
    }
    load();
  };

  const addTest = async () => {
    if (saveLock.current) return;
    saveLock.current = true;
    try {
      await api.post("/admin/tests", {
        name: testForm.name,
        category_id: Number(testForm.category_id),
        price: Number(testForm.price),
        patient_instruction: testForm.patient_instruction || null,
      });
      toast.success("Test created");
      setTestForm({ name: "", category_id: "", price: "", patient_instruction: "" });
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      saveLock.current = false;
    }
  };

  const startEditingTest = (t) => {
    setEditingTest(t);
    setTestForm({
      name: t.name,
      category_id: t.category_id,
      price: t.price,
      patient_instruction: t.patient_instruction || "",
    });
    // Scroll to the top where the form is
    if (testFormRef.current) {
      testFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      const mainArea = document.getElementById("admin-main");
      if (mainArea) {
        mainArea.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const saveEditTest = async () => {
    if (saveLock.current) return;
    saveLock.current = true;
    try {
      await api.put(`/admin/tests/${editingTest.id}`, {
        name: testForm.name,
        category_id: Number(testForm.category_id),
        price: Number(testForm.price),
        patient_instruction: testForm.patient_instruction || null,
      });
      toast.success("Test updated");
      setEditingTest(null);
      setTestForm({ name: "", category_id: "", price: "", patient_instruction: "" });
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      saveLock.current = false;
    }
  };

  const cancelEditTest = () => {
    setEditingTest(null);
    setTestForm({ name: "", category_id: "", price: "", patient_instruction: "" });
  };

  const updateTest = async (test, patch) => {
    if (saveLock.current) return;
    saveLock.current = true;
    try {
      await api.put(`/admin/tests/${test.id}`, patch);
      toast.success("Test updated");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      saveLock.current = false;
    }
  };

  const deleteTest = async (id) => {
    if (saveLock.current) return;
    saveLock.current = true;
    try {
      await api.delete(`/admin/tests/${id}`);
      toast.success("Test deleted");
      if (editingTest?.id === id) cancelEditTest();
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      saveLock.current = false;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setShowCategories(!showCategories)}>
          <div className="flex items-center justify-between">
            <CardTitle>Categories</CardTitle>
            {showCategories ? <FiChevronDown className="text-xl" /> : <FiChevronRight className="text-xl" />}
          </div>
        </CardHeader>
        {showCategories && (
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Search categories..." value={catSearch} onChange={(e) => setCatSearch(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Input placeholder="New category name" value={catName} onChange={(e) => setCatName(e.target.value)} />
              <Button type="button" onClick={addCategory}>
                Add category
              </Button>
            </div>
            {categories
              .filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
              .map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2">
              {editingCategory === c.id ? (
                <div className="flex flex-1 gap-2">
                  <Input value={editCatName} onChange={(e) => setEditCatName(e.target.value)} />
                  <Button size="sm" onClick={() => saveEditCategory(c)}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>Cancel</Button>
                </div>
              ) : (
                <>
                  <span>
                    {c.name} {!c.is_enabled && "(disabled)"}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingCategory(c.id); setEditCatName(c.name); }}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleCategory(c)}>
                      {c.is_enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteCatTarget(c)}>
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </CardContent>
        )}
      </Card>

      <Card ref={testFormRef}>
        <CardHeader>
          <CardTitle>{editingTest ? "Edit test" : "Add test"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Test name" value={testForm.name} onChange={(e) => setTestForm((f) => ({ ...f, name: e.target.value }))} />
          <select
            className="border-input h-10 rounded-md border px-2"
            value={testForm.category_id}
            onChange={(e) => setTestForm((f) => ({ ...f, category_id: e.target.value }))}
          >
            <option value="">Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Input placeholder="Price" type="number" value={testForm.price} onChange={(e) => setTestForm((f) => ({ ...f, price: e.target.value }))} />
          <Input
            placeholder="Patient instructions"
            value={testForm.patient_instruction}
            onChange={(e) => setTestForm((f) => ({ ...f, patient_instruction: e.target.value }))}
          />
          <div className="sm:col-span-2 flex gap-2">
            <Button type="button" onClick={editingTest ? saveEditTest : addTest}>
              {editingTest ? "Update test" : "Add test"}
            </Button>
            {editingTest && (
              <Button type="button" variant="outline" onClick={cancelEditTest}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setShowTests(!showTests)}>
          <div className="flex items-center justify-between">
            <CardTitle>Tests</CardTitle>
            {showTests ? <FiChevronDown className="text-xl" /> : <FiChevronRight className="text-xl" />}
          </div>
        </CardHeader>
        {showTests && (
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Search tests..." value={testSearch} onChange={(e) => setTestSearch(e.target.value)} />
            </div>
            <div className="space-y-3">
              {tests
                .filter(t => t.name.toLowerCase().includes(testSearch.toLowerCase()) || (t.category_name || "").toLowerCase().includes(testSearch.toLowerCase()))
                .map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 border border-border p-4 rounded-lg bg-surface">
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-muted text-sm">
                        {t.category_name} · ₹{t.price} · {t.is_enabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEditingTest(t)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant={t.is_enabled ? "outline" : "default"}
                        onClick={() => {
                          if (t.is_enabled) setDisableTarget(t);
                          else updateTest(t, { is_enabled: true });
                        }}
                      >
                        {t.is_enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteTestTarget(t)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        )}
      </Card>

      <ConfirmDisableDialog
        open={!!disableTarget}
        onOpenChange={() => setDisableTarget(null)}
        title="Disable test?"
        description={DISABLE_MSG}
        onConfirm={() => {
          updateTest(disableTarget, { is_enabled: false });
          setDisableTarget(null);
        }}
      />

      <ConfirmDisableDialog
        open={!!deleteTestTarget}
        onOpenChange={() => setDeleteTestTarget(null)}
        title="Delete test?"
        description="Are you sure you want to permanently delete this test? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          deleteTest(deleteTestTarget.id);
          setDeleteTestTarget(null);
        }}
      />

      <ConfirmDisableDialog
        open={!!deleteCatTarget}
        onOpenChange={() => setDeleteCatTarget(null)}
        title="Delete category?"
        description="Are you sure you want to permanently delete this category? It can only be deleted if it contains no tests."
        confirmLabel="Delete"
        onConfirm={() => {
          deleteCategory(deleteCatTarget.id);
          setDeleteCatTarget(null);
        }}
      />
    </div>
  );
}

function PackagesTab({ saveLock }) {
  const [packages, setPackages] = useState([]);
  const [tests, setTests] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", price: "", test_ids: [] });
  const [disableTarget, setDisableTarget] = useState(null);
  const [testSearch, setTestSearch] = useState("");

  const load = () =>
    Promise.all([api.get("/admin/packages"), api.get("/admin/tests")]).then(([p, t]) => {
      setPackages(getApiData(p));
      setTests(getApiData(t));
    });

  useEffect(() => {
    load();
  }, []);

  const toggleTestId = (id) => {
    setForm((f) => {
      const ids = new Set(f.test_ids);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return { ...f, test_ids: [...ids] };
    });
  };

  const create = async () => {
    if (saveLock.current) return;
    saveLock.current = true;
    try {
      await api.post("/admin/packages", {
        name: form.name,
        description: form.description || null,
        price: Number(form.price),
        test_ids: form.test_ids,
      });
      toast.success("Package created");
      setForm({ name: "", description: "", price: "", test_ids: [] });
      setTestSearch("");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      saveLock.current = false;
    }
  };

  const updatePkg = async (pkg, patch) => {
    if (saveLock.current) return;
    saveLock.current = true;
    try {
      await api.put(`/admin/packages/${pkg.id}`, patch);
      toast.success("Package updated");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      saveLock.current = false;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create package</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Input placeholder="Price" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          <p className="text-sm font-medium">Included tests</p>
          <Input placeholder="Search tests..." value={testSearch} onChange={(e) => setTestSearch(e.target.value)} />
          <div className="max-h-40 overflow-y-auto rounded border border-border p-2">
            {tests
              .filter(t => t.name.toLowerCase().includes(testSearch.toLowerCase()))
              .map((t) => (
              <label key={t.id} className="flex items-center gap-2 py-1 text-sm">
                <input type="checkbox" checked={form.test_ids.includes(t.id)} onChange={() => toggleTestId(t.id)} />
                {t.name}
              </label>
            ))}
          </div>
          <Button type="button" onClick={create}>
            Create package
          </Button>
        </CardContent>
      </Card>

      {packages.map((p) => (
        <Card key={p.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-muted text-sm">
                ₹{p.price} · {p.tests?.length || 0} tests · {p.is_enabled ? "Enabled" : "Disabled"}
              </p>
            </div>
            <Button
              type="button"
              variant={p.is_enabled ? "outline" : "default"}
              onClick={() => {
                if (p.is_enabled) setDisableTarget(p);
                else updatePkg(p, { is_enabled: true });
              }}
            >
              {p.is_enabled ? "Disable" : "Enable"}
            </Button>
          </CardContent>
        </Card>
      ))}

      <ConfirmDisableDialog
        open={!!disableTarget}
        onOpenChange={() => setDisableTarget(null)}
        title="Disable package?"
        description={DISABLE_MSG}
        onConfirm={() => {
          updatePkg(disableTarget, { is_enabled: false });
          setDisableTarget(null);
        }}
      />
    </div>
  );
}

function WhatsAppTab({ saveLock }) {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    api.get("/admin/whatsapp-templates").then((r) => setTemplates(getApiData(r)));
  }, []);

  const save = async (tpl) => {
    if (saveLock.current) return;
    saveLock.current = true;
    try {
      await api.put(`/admin/whatsapp-templates/${tpl.template_type}`, { content: tpl.content });
      toast.success("Template saved");
    } catch (e) {
      toast.error(e.message);
    } finally {
      saveLock.current = false;
    }
  };

  return (
    <div className="space-y-4">
      {templates.map((tpl, idx) => (
        <Card key={tpl.id}>
          <CardHeader>
            <CardTitle className="capitalize">{tpl.template_type.replace("_", " ")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <textarea
              className="border-input min-h-32 w-full rounded-md border p-2 text-sm"
              value={tpl.content}
              onChange={(e) => {
                const next = [...templates];
                next[idx] = { ...tpl, content: e.target.value };
                setTemplates(next);
              }}
            />
            <Button type="button" onClick={() => save(tpl)}>
              Save template
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProfileTab({ saveLock }) {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    current_password: "",
    new_password: "",
  });

  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, name: user.name, phone: user.phone }));
    }
  }, [user]);

  const save = async () => {
    if (saveLock.current) return;
    saveLock.current = true;
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        current_password: form.current_password || null,
        new_password: form.new_password || null,
      };
      await api.put("/auth/profile", payload);
      toast.success("Profile updated");
      setForm((f) => ({ ...f, current_password: "", new_password: "" }));
      refreshUser();
    } catch (e) {
      toast.error(e.message);
    } finally {
      saveLock.current = false;
    }
  };

  return (
    <Card>
      <CardContent className="grid max-w-md gap-3 py-4">
        <div>
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
        <div>
          <Label>Current password</Label>
          <Input
            type="password"
            value={form.current_password}
            onChange={(e) => setForm((f) => ({ ...f, current_password: e.target.value }))}
          />
        </div>
        <div>
          <Label>New password</Label>
          <Input
            type="password"
            value={form.new_password}
            onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))}
          />
        </div>
        <Button type="button" onClick={save}>
          Update profile
        </Button>
      </CardContent>
    </Card>
  );
}
