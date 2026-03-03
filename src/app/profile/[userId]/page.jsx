"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Trophy, Flame, BookOpen, Star, MapPin, Calendar,
  Award, Zap, Target, Crown, Moon, Sun, Users, GraduationCap,
  Clock, Rocket, Heart, Shield,
} from "lucide-react";
import { useAuth } from "@/contexts/auth";

// Badge definitions (matching BadgeGallery)
const BADGE_MAP = {
  first_course: { name: "First Steps", icon: Target, color: "from-green-400 to-emerald-500", rarity: "common" },
  week_streak: { name: "Dedicated", icon: Flame, color: "from-orange-400 to-red-500", rarity: "uncommon" },
  month_streak: { name: "Unstoppable", icon: Flame, color: "from-red-500 to-pink-600", rarity: "legendary" },
  perfect_score: { name: "Perfectionist", icon: Award, color: "from-blue-400 to-indigo-500", rarity: "uncommon" },
  five_courses: { name: "Scholar", icon: BookOpen, color: "from-blue-400 to-indigo-500", rarity: "uncommon" },
  ten_courses: { name: "Expert", icon: GraduationCap, color: "from-purple-400 to-violet-500", rarity: "rare" },
  night_owl: { name: "Night Owl", icon: Moon, color: "from-indigo-400 to-purple-500", rarity: "uncommon" },
  early_bird: { name: "Early Bird", icon: Sun, color: "from-yellow-400 to-orange-500", rarity: "uncommon" },
  speed_learner: { name: "Speed Learner", icon: Zap, color: "from-yellow-400 to-amber-500", rarity: "rare" },
  social_learner: { name: "Social Learner", icon: Users, color: "from-pink-400 to-rose-500", rarity: "uncommon" },
  xp_master: { name: "XP Master", icon: Crown, color: "from-yellow-500 to-amber-600", rarity: "legendary" },
  marathon: { name: "Marathon Runner", icon: Rocket, color: "from-cyan-400 to-blue-500", rarity: "rare" },
};

const RARITY_COLORS = {
  common: "border-gray-300 dark:border-gray-600",
  uncommon: "border-green-400 dark:border-green-500",
  rare: "border-blue-400 dark:border-blue-500",
  epic: "border-purple-400 dark:border-purple-500",
  legendary: "border-yellow-400 dark:border-yellow-500",
};

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = params.userId;

  // Redirect to own profile if viewing self
  useEffect(() => {
    if (currentUser?.email && userId === currentUser.email) {
      router.replace("/profile");
    }
  }, [currentUser, userId, router]);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/user/${encodeURIComponent(userId)}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("User not found");
          } else {
            setError("Failed to load profile");
          }
          return;
        }
        const data = await res.json();
        setProfile(data.user);
      } catch (err) {
        console.error("Error fetching public profile:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const getLevelTitle = (level) => {
    if (level >= 50) return "Grandmaster";
    if (level >= 40) return "Master";
    if (level >= 30) return "Expert";
    if (level >= 20) return "Advanced";
    if (level >= 10) return "Intermediate";
    if (level >= 5) return "Apprentice";
    return "Beginner";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <Skeleton className="h-8 w-24 mb-8" />
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-8">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">{error}</h2>
            <p className="text-muted-foreground mb-6">
              The profile you are looking for does not exist or is unavailable.
            </p>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const earnedBadges = (profile.badges || [])
    .map((b) => {
      const badgeId = typeof b === "string" ? b : b.id;
      const meta = BADGE_MAP[badgeId];
      if (!meta) return null;
      return { id: badgeId, ...meta, earnedAt: b.earnedAt };
    })
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                <AvatarImage src={profile.avatar} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {profile.name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold">{profile.name}</h1>

                {profile.bio && (
                  <p className="text-muted-foreground mt-1">{profile.bio}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 mt-3 justify-center sm:justify-start">
                  {profile.location && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {profile.location}
                    </span>
                  )}
                  {profile.joinedAt && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" /> Joined {formatDate(profile.joinedAt)}
                    </span>
                  )}
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3" /> {getLevelTitle(profile.level)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">{(profile.xp || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{profile.level || 1}</p>
              <p className="text-xs text-muted-foreground">Level</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Flame className="h-6 w-6 mx-auto mb-1 text-orange-500" />
              <p className="text-2xl font-bold">{profile.streak || 0}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-6 w-6 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{profile.coursesCompleted || 0}</p>
              <p className="text-xs text-muted-foreground">Courses</p>
            </CardContent>
          </Card>
        </div>

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-yellow-500" />
                Badges ({earnedBadges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {earnedBadges.map((badge) => {
                  const IconComponent = badge.icon;
                  return (
                    <div
                      key={badge.id}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 ${RARITY_COLORS[badge.rarity] || RARITY_COLORS.common} bg-card`}
                      title={badge.name}
                    >
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${badge.color} flex items-center justify-center`}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xs font-medium text-center leading-tight">
                        {badge.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
