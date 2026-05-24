"use client";
import { useState, useEffect, useContext } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  CalendarDays,
  History,
  Trophy,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart3,
} from "lucide-react";
import EventCard from "./EventCard";
import EventCompletionModal from "./EventCompletionModal";
import xpContext from "@/contexts/xp";

function HistoryRow({ record }) {
  const goalReached = record.goalReached;
  const pct = Math.min(
    Math.round((record.communityProgress / record.goal) * 100),
    100
  );
  const date = new Date(record.joinedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/30 transition-colors">
      <div className="text-3xl leading-none select-none">{record.eventIcon}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{record.eventTitle}</span>
          {goalReached ? (
            <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 text-[10px] gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Goal Achieved
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              {pct}% reached
            </Badge>
          )}
          {record.status === "active" && (
            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[10px] gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Active
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Joined {date}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {record.userContribution.toLocaleString()} {record.unit} contributed
          </span>
          {record.xpReward && goalReached && (
            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-medium">
              <Trophy className="h-3 w-3" />+{record.xpReward} XP earned
            </span>
          )}
        </div>

        {/* Milestones unlocked */}
        {record.unlockedMilestones?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {record.unlockedMilestones.map((m) => (
              <span
                key={m.at}
                className="text-[10px] bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 rounded px-1.5 py-0.5 flex items-center gap-0.5"
              >
                <Sparkles className="h-2.5 w-2.5" />
                {m.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommunityEvents({ userId }) {
  const { getXp } = useContext(xpContext);
  const [events, setEvents] = useState([]);
  const [history, setHistory] = useState([]);
  const [participationMap, setParticipationMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [completionModal, setCompletionModal] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/community-events");
      const data = await res.json();
      setEvents(data.events || []);

      // If user is logged in, fetch their participation records
      if (userId) {
        const partRes = await fetch(
          `/api/community-events/participate?userId=${encodeURIComponent(userId)}`
        );
        const partData = await partRes.json();
        const map = {};
        if (Array.isArray(partData.participation)) {
          partData.participation.forEach((p) => {
            map[p.eventId] = p.contribution || 0;
          });
        }
        setParticipationMap(map);
      }
    } catch (e) {
      console.error("Error fetching events:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (historyLoaded || !userId) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `/api/community-events/history?userId=${encodeURIComponent(userId)}`
      );
      const data = await res.json();
      setHistory(data.history || []);
      setHistoryLoaded(true);
    } catch (e) {
      console.error("Error fetching history:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleContribute = (data, event) => {
    // Refresh XP in context
    if (getXp) getXp();

    // Update local participation map
    setParticipationMap((prev) => ({
      ...prev,
      [event.id]: (prev[event.id] || 0) + (data.contribution || 0),
    }));

    // Show completion modal if milestone or goal was hit
    if (data.milestonesUnlocked?.length > 0 || data.goalReached) {
      setCompletionModal({
        event,
        xpAwarded: data.xpAwarded || 0,
        milestonesUnlocked: data.milestonesUnlocked || [],
        goalReached: data.goalReached || false,
      });
    }
  };

  const activeEvents = events.filter((e) => e.status === "active");
  const upcomingEvents = events.filter((e) => e.status === "upcoming");

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-72 rounded-xl bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="active">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Globe className="h-5 w-5 text-emerald-500" />
              Community Eco Events
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Join global sustainability missions and earn rewards together
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeEvents.length > 0 && (
              <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                {activeEvents.length} Live
              </Badge>
            )}
            {upcomingEvents.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <CalendarDays className="h-3 w-3" />
                {upcomingEvents.length} Upcoming
              </Badge>
            )}
          </div>
        </div>

        <TabsList className="grid w-full grid-cols-3 h-9 mb-6">
          <TabsTrigger value="active" className="text-xs gap-1">
            <Globe className="h-3 w-3" />
            Active
            {activeEvents.length > 0 && (
              <Badge className="ml-1 text-[9px] h-4 px-1 bg-green-500 text-white">
                {activeEvents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs gap-1">
            <CalendarDays className="h-3 w-3" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="text-xs gap-1"
            onClick={fetchHistory}
          >
            <History className="h-3 w-3" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Active Events */}
        <TabsContent value="active">
          {activeEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">No active events right now</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check upcoming events to see what&apos;s coming next!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  userId={userId}
                  userContribution={participationMap[event.id] || 0}
                  onContribute={(data) => handleContribute(data, event)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Upcoming Events */}
        <TabsContent value="upcoming">
          {upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">No upcoming events</p>
                <p className="text-xs text-muted-foreground mt-1">
                  New events are added regularly. Check back soon!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  userId={userId}
                  userContribution={0}
                  onContribute={() => {}}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          {!userId ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">Login to see your history</p>
              </CardContent>
            </Card>
          ) : historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">No event history yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Join an active event to start your eco journey!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Card className="text-center p-3">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {history.length}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Events Joined</div>
                </Card>
                <Card className="text-center p-3">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {history.filter((h) => h.goalReached).length}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Goals Achieved</div>
                </Card>
                <Card className="text-center p-3">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {history
                      .reduce(
                        (sum, h) =>
                          sum +
                          h.unlockedMilestones.reduce(
                            (s, m) => s + (m.xpBonus || 0),
                            0
                          ),
                        0
                      )
                      .toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Milestone XP</div>
                </Card>
              </div>

              {history.map((record) => (
                <HistoryRow key={record.id} record={record} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Completion / Milestone Modal */}
      {completionModal && (
        <EventCompletionModal
          isOpen={!!completionModal}
          onClose={() => setCompletionModal(null)}
          event={completionModal.event}
          xpAwarded={completionModal.xpAwarded}
          milestonesUnlocked={completionModal.milestonesUnlocked}
          goalReached={completionModal.goalReached}
        />
      )}
    </>
  );
}
