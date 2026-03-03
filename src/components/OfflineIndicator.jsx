"use client";
import { useEffect, useState } from "react";
import { WifiOff, Wifi, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useOffline } from "@/hooks/useOffline";

export default function OfflineIndicator() {
  const { isOnline, isSyncing, syncResult } = useOffline();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!isOnline || isSyncing || syncResult) {
      setShowBanner(true);
    }

    // Auto-hide success banner after a few seconds
    if (isOnline && !isSyncing && syncResult?.success && syncResult?.synced === 0 && !syncResult?.failed) {
      const timer = setTimeout(() => setShowBanner(false), 2000);
      return () => clearTimeout(timer);
    }

    if (syncResult && !isSyncing) {
      const timer = setTimeout(() => setShowBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSyncing, syncResult]);

  // Hide when everything is normal
  if (isOnline && !isSyncing && !syncResult && !showBanner) return null;
  if (!showBanner) return null;

  // Determine banner content
  let bgColor = "bg-red-500";
  let icon = <WifiOff className="w-4 h-4" />;
  let message = "Offline mode — changes saved locally";

  if (isOnline && isSyncing) {
    bgColor = "bg-blue-500";
    icon = <RefreshCw className="w-4 h-4 animate-spin" />;
    message = "Syncing offline changes...";
  } else if (isOnline && syncResult) {
    if (syncResult.failed > 0) {
      bgColor = "bg-yellow-500";
      icon = <AlertCircle className="w-4 h-4" />;
      message = `Synced ${syncResult.synced}, ${syncResult.failed} failed`;
      if (syncResult.conflicts?.length > 0) {
        message += ` (${syncResult.conflicts.length} conflicts resolved)`;
      }
    } else if (syncResult.synced > 0) {
      bgColor = "bg-green-500";
      icon = <CheckCircle className="w-4 h-4" />;
      message = `${syncResult.synced} changes synced successfully`;
      if (syncResult.conflicts?.length > 0) {
        message += ` (${syncResult.conflicts.length} conflicts resolved)`;
      }
    } else {
      bgColor = "bg-blue-500";
      icon = <Wifi className="w-4 h-4" />;
      message = "Back online";
    }
  }

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 ${bgColor} text-white transition-all duration-300`}
    >
      {icon}
      <span className="text-sm">{message}</span>
    </div>
  );
}
