"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Globe, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function CommunityProgress({ userId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/community-events");
      const data = await res.json();
      const active = (data.events || []).filter((e) => e.status === "active");
      setEvents(active);
    } catch (e) {
      console.error("Error fetching events:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-4 w-32 bg-muted rounded mb-3" />
          <div className="h-2 w-full bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) return null;

  const topEvent = events[0];
  const pct = Math.min(
    (topEvent.communityProgress / topEvent.goal) * 100,
    100
  );

  return (
    <Card className="border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold">Community Events</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px]">
              {events.length} active
            </Badge>
            <Link
              href="/gamification"
              className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center hover:underline"
            >
              View all
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{topEvent.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{topEvent.title}</div>
              <div className="flex items-center gap-1 mt-1">
                <Progress value={pct} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {Math.round(pct)}%
                </span>
              </div>
            </div>
          </div>

          {events.length > 1 && (
            <div className="text-[10px] text-muted-foreground text-center">
              +{events.length - 1} more event{events.length - 1 > 1 ? "s" : ""} running
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
