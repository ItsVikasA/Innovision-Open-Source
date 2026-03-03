"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  GitFork,
  AlertCircle,
  GitPullRequest,
  Users,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Github,
  Heart,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CONTRIBUTORS_PER_PAGE = 12;

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border transition-shadow hover:shadow-md">
      <Icon className={`w-6 h-6 ${color}`} />
      <span className="text-2xl font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function ContributorCard({ contributor }) {
  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 bg-card border-border">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <div className="relative">
          <Image
            src={contributor.avatarUrl}
            alt={`${contributor.login}'s avatar`}
            width={80}
            height={80}
            className="rounded-full ring-2 ring-border group-hover:ring-primary/50 transition-all"
          />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {contributor.login}
          </h3>
          <p className="text-sm text-muted-foreground">
            {contributor.contributions}{" "}
            {contributor.contributions === 1 ? "contribution" : "contributions"}
          </p>
        </div>
        <a
          href={contributor.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${contributor.login}'s GitHub profile`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Github className="w-4 h-4" />
          View Profile
          <ExternalLink className="w-3 h-3" />
        </a>
      </CardContent>
    </Card>
  );
}

function ContributorCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-card border-border">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <div className="w-20 h-20 rounded-full bg-muted animate-pulse" />
        <div className="text-center space-y-2 w-full">
          <div className="h-5 w-24 mx-auto bg-muted animate-pulse rounded" />
          <div className="h-4 w-32 mx-auto bg-muted animate-pulse rounded" />
        </div>
        <div className="h-4 w-28 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}

export default function ContributorsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/github/contributors");
        if (!res.ok) throw new Error("Failed to fetch contributors");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const totalPages = data
    ? Math.ceil(data.contributors.length / CONTRIBUTORS_PER_PAGE)
    : 0;

  const paginatedContributors = data
    ? data.contributors.slice(
        (currentPage - 1) * CONTRIBUTORS_PER_PAGE,
        currentPage * CONTRIBUTORS_PER_PAGE
      )
    : [];

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Generate visible page numbers
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-6">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-foreground">
            Our Contributors
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            InnoVision is built by an amazing open-source community. Every
            contribution counts — thank you for making learning better for
            everyone.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-lg text-destructive">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Repository Stats */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-16">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border"
              >
                <div className="w-6 h-6 bg-muted animate-pulse rounded" />
                <div className="w-10 h-7 bg-muted animate-pulse rounded" />
                <div className="w-16 h-4 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-16">
            <StatCard
              icon={Star}
              label="Stars"
              value={data.repo.stars}
              color="text-yellow-500"
            />
            <StatCard
              icon={GitFork}
              label="Forks"
              value={data.repo.forks}
              color="text-blue-500"
            />
            <StatCard
              icon={AlertCircle}
              label="Open Issues"
              value={data.repo.openIssues}
              color="text-orange-500"
            />
            <StatCard
              icon={GitPullRequest}
              label="Open PRs"
              value={data.repo.openPRs}
              color="text-green-500"
            />
            <StatCard
              icon={Users}
              label="Contributors"
              value={data.totalContributors}
              color="text-purple-500"
            />
          </div>
        ) : null}

        {/* Contributors Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(CONTRIBUTORS_PER_PAGE)].map((_, i) => (
              <ContributorCardSkeleton key={i} />
            ))}
          </div>
        ) : data && data.contributors.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedContributors.map((contributor) => (
                <ContributorCard
                  key={contributor.id}
                  contributor={contributor}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-12">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => goToPage(currentPage - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                {getPageNumbers().map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(page)}
                    aria-label={`Go to page ${page}`}
                    aria-current={currentPage === page ? "page" : undefined}
                  >
                    {page}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        ) : null}

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t border-border">
          <p className="text-muted-foreground flex items-center justify-center gap-1">
            Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> by
            the InnoVision community
          </p>
          <a
            href="https://github.com/ItsVikasA/Innovision-Open-Source"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="w-4 h-4" />
            Contribute on GitHub
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
