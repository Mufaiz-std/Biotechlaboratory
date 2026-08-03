const STORAGE_KEY = "lab_booking_draft_v1";

export const defaultDraft = () => ({
  step: 0,
  patient_name: "",
  age: "",
  sex: "",
  phone: "",
  patient_note: "",
  address: "",
  house_no: "",
  landmark: "",
  floor: "",
  latitude: null,
  longitude: null,
  selectedTestIds: [],
  package_id: null,
  prescription_image_url: null,
  prescription_preview: null,
  preferred_date: "",
  date_mode: "today",
  slot_id: null,
  idempotency_key: null,
});

export function loadBookingDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDraft();
    return { ...defaultDraft(), ...JSON.parse(raw) };
  } catch {
    return defaultDraft();
  }
}

export function saveBookingDraft(draft) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearBookingDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

export function ensureIdempotencyKey(draft) {
  if (draft.idempotency_key) return draft.idempotency_key;
  const key =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return key;
}
