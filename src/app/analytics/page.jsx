"use client";

import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import StudyAnalyticsDashboard from "@/components/dashboard/StudyAnalyticsDashboard";
import { BarChart3 } from "lucide-react";
import { PageBackground, GridPattern, PageHeader, ScrollReveal } from "@/components/ui/PageWrapper";

export default function StudyAnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <PageBackground />
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative">
      <PageBackground variant="profile" />
      <GridPattern opacity={0.02} />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 relative z-10 pt-6">
        <ScrollReveal>
          <PageHeader
            icon={BarChart3}
            iconColor="text-blue-500"
            title="Study Time Analytics"
            description="Understand your daily study commitment, adjust personal learning targets, and track consistency."
          />
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <StudyAnalyticsDashboard />
        </ScrollReveal>
      </div>
    </div>
  );
}
