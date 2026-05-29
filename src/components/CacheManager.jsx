"use client";

import { useEffect, useState } from "react";
import { useOffline } from "@/hooks/useOffline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDrive, Trash2, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";

export function CacheManager() {
  const { cacheStatus, clearCache, loadCacheStatus } = useOffline();
  const [totalCacheSize, setTotalCacheSize] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    calculateCacheSize();
    loadCacheStatus();

    const interval = setInterval(() => {
      calculateCacheSize();
    }, 10000); // Recalculate every 10 seconds

    return () => clearInterval(interval);
  }, [cacheStatus]);

  const calculateCacheSize = async () => {
    if (!cacheStatus) return;

    let totalSize = 0;
    for (const [cacheName, data] of Object.entries(cacheStatus.caches || {})) {
      const estimatedSize = (data.urls?.length || 0) * 50000; // Rough estimate: 50KB per URL
      totalSize += estimatedSize;
    }

    setTotalCacheSize(totalSize);
  };

  const handleClear = async (type) => {
    if (confirm(`Are you sure you want to clear ${type} cache?`)) {
      setLoading(true);
      try {
        await clearCache(type);
        await loadCacheStatus();
      } finally {
        setLoading(false);
      }
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes, k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  if (!cacheStatus) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              Cache Manager
            </CardTitle>
            <CardDescription>
              Manage cached data and service worker storage
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadCacheStatus()}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Cache Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Total Caches</div>
            <div className="text-2xl font-bold mt-1">
              {Object.keys(cacheStatus.caches || {}).length}
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Cached Items</div>
            <div className="text-2xl font-bold mt-1">
              {Object.values(cacheStatus.caches || {}).reduce(
                (sum, cache) => sum + (cache.count || 0),
                0
              )}
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Estimated Size</div>
            <div className="text-2xl font-bold mt-1">
              {formatBytes(totalCacheSize)}
            </div>
          </div>
        </div>

        {/* Version Info */}
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold">Service Worker Version</div>
            <div className="text-xs text-muted-foreground mt-1">
              {cacheStatus.version || "Unknown"}
            </div>
          </div>
        </div>

        {/* Cache Details */}
        <div className="space-y-3">
          <div className="text-sm font-semibold">Cache Breakdown</div>
          {Object.entries(cacheStatus.caches || {}).map(([cacheName, data]) => (
            <div key={cacheName} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium text-sm">{cacheName}</div>
                  <div className="text-xs text-muted-foreground">
                    {data.count || 0} items
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleClear(cacheName)}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Preview cached URLs */}
              {data.urls && data.urls.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {data.urls.slice(0, 3).map((url, idx) => (
                    <div key={idx} className="truncate">
                      • {new URL(url, location.origin).pathname}
                    </div>
                  ))}
                  {data.urls.length > 3 && (
                    <div className="text-muted-foreground italic">
                      + {data.urls.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Clear All Button */}
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => handleClear("all")}
          disabled={loading}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All Caches
        </Button>

        <p className="text-xs text-muted-foreground">
          Note: Clearing cache will remove all offline data. Downloaded courses will no longer be accessible until you download them again.
        </p>
      </CardContent>
    </Card>
  );
}
