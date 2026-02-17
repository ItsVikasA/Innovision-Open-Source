"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, BookOpen, Sparkles } from "lucide-react";
import DeleteRoadmap from "@/components/Home/DeleteRoadmap";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { loader } from "@/components/ui/Custom/ToastLoader";
import { PageBackground, GridPattern, PageHeader, ScrollReveal, HoverCard } from "@/components/ui/PageWrapper";

export default function page() {
    const [roadmaps, setRoadmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const { hideLoader } = loader();

    async function fetchRoadmaps() {
        setLoading(true);
        const response = await fetch("/api/roadmap/all");
        const data = await response.json();
        setRoadmaps(data.docs);
        setLoading(false);
    }
    useEffect(() => {
        fetchRoadmaps();
    }, []);

    return (
        <div className="min-h-screen bg-background relative">
            <PageBackground variant="courses" />
            <GridPattern opacity={0.02} />

            <div className="max-w-6xl flex flex-col gap-4 items-center p-4 mb-16 mx-auto relative z-10">
                <PageHeader
                    title="Your Courses"
                    description="Manage and continue your learning journey"
                    icon={BookOpen}
                    iconColor="text-blue-500"
                    badge={<><Sparkles className="h-3.5 w-3.5" /> My Learning</>}
                />

                <div className="flex gap-6 justify-center flex-wrap w-full">
                    {loading ? (
                        Array(6)
                            .fill(0)
                            .map((_, i) => {
                                return (
                                    <Skeleton
                                        key={i}
                                        className={"w-[320px] h-64 rounded-xl"}
                                    ></Skeleton>
                                );
                            })
                    ) : (
                        <>
                            {roadmaps?.map((roadmap, index) => {

                                if (roadmap.process === "completed") return (
                                    <ScrollReveal key={roadmap.id} delay={index * 80}>
                                        <HoverCard>
                                            <Card
                                                className={"w-[320px] h-50 relative bg-card/50 backdrop-blur-sm border-border/50 flex flex-col"}
                                            >
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="line-clamp-2">
                                                        {roadmap?.courseTitle?.split(
                                                            ":"
                                                        )[0] || ""}
                                                    </CardTitle>
                                                    <div className="absolute z-10 top-0 right-0">
                                                        <DeleteRoadmap
                                                            id={roadmap.id}
                                                            onDelete={() => {
                                                                fetchRoadmaps();
                                                                hideLoader();
                                                            }}
                                                        ></DeleteRoadmap>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="text-muted-foreground text-sm line-clamp-3 flex-1">
                                                    {roadmap.courseDescription}
                                                </CardContent>

                                                <Link href={`/roadmap/${roadmap.id}`}>
                                                    <span className="absolute inset-0"></span>
                                                </Link>
                                            </Card>
                                        </HoverCard>
                                    </ScrollReveal>
                                );
                            })}
                            <ScrollReveal delay={roadmaps?.filter(r => r.process === "completed").length * 80}>
                                <HoverCard>
                                    <Card
                                        className={
                                            "w-[320px] h-50 relative flex items-center justify-center border-2 border-dashed border-border/50 bg-card/30 backdrop-blur-sm hover:border-blue-500/50 transition-colors"
                                        }
                                    >
                                        <div className="flex flex-col items-center text-muted-foreground">
                                            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                                                <Plus
                                                    strokeWidth={1.5}
                                                    className="w-8 h-8 text-blue-500"
                                                ></Plus>
                                            </div>
                                            <p className="text-lg text-center font-medium">
                                                Create your course
                                            </p>
                                        </div>
                                        <Link href={`/generate`} scroll={false}>
                                            <span className="absolute inset-0"></span>
                                        </Link>
                                    </Card>
                                </HoverCard>
                            </ScrollReveal>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
