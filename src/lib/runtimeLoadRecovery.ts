const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk [\d]+ failed/i,
  /Unexpected token '<'/i,
];

const CLEANUP_FLAG = "miyashi_legacy_pwa_cleanup_v1";
const RECOVERY_FLAG = "miyashi_chunk_recovery_once";
const RECOVERY_QUERY_FLAG = "app_recovery_done";

const getStorage = (type: "local" | "session"): Storage | null => {
  try {
    return type === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

const canUseStorage = (storage: Storage | null) => {
  if (!storage) return false;

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

  const localStorageRef = getStorage("local");

  if (!canUseStorage(localStorageRef)) {
    await cleanup();
    return;
  }

  if (localStorageRef.getItem(CLEANUP_FLAG) === "done") return;

  await cleanup();
  localStorageRef.setItem(CLEANUP_FLAG, "done");
};

const recoverAppLoad = async (reason: string) => {
  const currentUrl = new URL(window.location.href);

  if (currentUrl.searchParams.get(RECOVERY_QUERY_FLAG) === "1") return;

  const sessionStorageRef = getStorage("session");
  if (canUseStorage(sessionStorageRef) && sessionStorageRef?.getItem(RECOVERY_FLAG) === "done") return;

  if (canUseStorage(sessionStorageRef)) {
    sessionStorageRef?.setItem(RECOVERY_FLAG, "done");
  }

  try {
    await clearLegacyPwaState();
  } catch {
    // Ignore cleanup failures and still force a cache-busted reload.
  }

  currentUrl.searchParams.set("recovery", Date.now().toString());
  currentUrl.searchParams.set("reason", reason);
  currentUrl.searchParams.set(RECOVERY_QUERY_FLAG, "1");
  window.location.replace(currentUrl.toString());
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
