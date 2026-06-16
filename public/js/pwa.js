let deferredPrompt;
const installBtn = document.getElementById('installBtn');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js'));
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.classList.remove('d-none');
});

installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.classList.add('d-none');
});

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

async function enablePush() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;
  const keyResponse = await fetch('/api/vapid-public-key');
  const { publicKey } = await keyResponse.json();
  if (!publicKey) return Swal.fire('VAPID key সেট করা নেই');
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
  const csrf = document.querySelector('meta[name="csrf-token"]').content;
  await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrf }, body: JSON.stringify(subscription) });
  Swal.fire('নোটিফিকেশন চালু হয়েছে');
}
