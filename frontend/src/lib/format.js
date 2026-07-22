export function formatTime(isoOrTime) {
  if (!isoOrTime) return "";
  const str = String(isoOrTime);
  const match = str.match(/(\d{2}):(\d{2})/);
  if (!match) return str;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function formatSlotRange(start, end) {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function formatDate(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate + (String(isoDate).includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function toDateInputValue(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
