import axios from '@/lib/api';

export async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  return permission;
}

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    await navigator.serviceWorker.register('/sw.js');
    const readyRegistration = await navigator.serviceWorker.ready;
    return readyRegistration;
  }
  throw new Error('Service workers are not supported');
}

export async function subscribePush(registration) {
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("VITE_VAPID_PUBLIC_KEY is not set in frontend/.env");
  }
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  await axios.post("/admin/push/subscribe", subscription);
  return subscription;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
