import toast from "react-hot-toast";

export function openWhatsApp(url, fallback) {
  if (!url) return;
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened && fallback?.message) {
    showWhatsAppFallback(fallback);
  }
}

export function showWhatsAppFallback({ labNumber, message }) {
  if (message && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(message).then(() => {
      toast.success("Message copied to clipboard");
    });
  }
  const parts = [];
  if (labNumber) parts.push(`Lab WhatsApp: ${labNumber}`);
  parts.push("Could not open WhatsApp. Copy the message from your clipboard or contact the lab.");
  toast.error(parts.join(" "), { duration: 8000 });
}

export async function runAdminWhatsAppAction(apiCall) {
  const data = await apiCall();
  const {
    whatsapp_url: url,
    whatsapp_message: message,
    lab_whatsapp_number: labNumber,
  } = data;
  if (url) {
    openWhatsApp(url, { labNumber, message });
  }
  return data;
}
