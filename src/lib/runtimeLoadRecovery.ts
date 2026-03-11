const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk [\d]+ failed/i,
  /Unexpected token '<'/i,
];

const CLEANUP_FLAG = "miyashi_legacy_pwa_cleanup_v1";
const RECOVERY_FLAG = "miyashi_chunk_recovery_once";

const canUseStorage = (storage: Storage) => {
  try {
    const key = "__storage_check__";
    storage.setItem(key, "1");
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

const shouldRecoverFromError = (message: string) =>
  CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));

const clearLegacyPwaState = async () => {
  const cleanup = async () => {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  };

  if (!canUseStorage(localStorage)) {
    await cleanup();
    return;
  }

  if (localStorage.getItem(CLEANUP_FLAG) === "done") return;

  await cleanup();
  localStorage.setItem(CLEANUP_FLAG, "done");
};

const recoverAppLoad = async (reason: string) => {
  if (!canUseStorage(sessionStorage)) return;
  if (sessionStorage.getItem(RECOVERY_FLAG) === "done") return;

  sessionStorage.setItem(RECOVERY_FLAG, "done");

  try {
    await clearLegacyPwaState();
  } catch {
    // Ignore cleanup failures and still force a cache-busted reload.
  }

  const url = new URL(window.location.href);
  url.searchParams.set("recovery", Date.now().toString());
  url.searchParams.set("reason", reason);
  window.location.replace(url.toString());
};

export const installRuntimeLoadRecovery = () => {
  void clearLegacyPwaState();

  window.addEventListener("error", (event) => {
    const message = event.error?.message || event.message || "";
    if (shouldRecoverFromError(message)) {
      void recoverAppLoad("runtime_error");
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reasonMessage =
      (typeof event.reason === "string" ? event.reason : event.reason?.message) || "";

    if (shouldRecoverFromError(reasonMessage)) {
      void recoverAppLoad("chunk_error");
    }
  });
};
