"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy
} from "firebase/firestore";
import {
  FileText,
  Sparkles,
  Plus,
  Trash2,
  History,
  TrendingUp,
  ArrowLeftRight,
  Check,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  Save,
  BookOpen,
  Briefcase,
  Award,
  Info,
  ChevronRight,
  RefreshCw,
  PlusCircle,
  CheckSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip
} from "recharts";
import { toast } from "react-toastify";

export default function ResumePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Resume editing states
  const [roleLabel, setRoleLabel] = useState("Frontend Developer");
  const [summary, setSummary] = useState(
    "Passionate software developer with experience in building performant web applications."
  );
  const [skills, setSkills] = useState(["React", "JavaScript", "HTML", "CSS"]);
  const [newSkill, setNewSkill] = useState("");
  const [experience, setExperience] = useState([
    {
      company: "Innovision Lab",
      role: "Associate Frontend Developer",
      duration: "2024 - Present",
      description: "Developing dynamic user interfaces and optimizing web components."
    }
  ]);
  const [education, setEducation] = useState([
    {
      institution: "State Tech University",
      degree: "B.S. in Computer Science",
      duration: "2020 - 2024"
    }
  ]);

  // Snapshot tracking
  const [snapshots, setSnapshots] = useState([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const [changeSummary, setChangeSummary] = useState("Added initial details");
  const [snapshotTitle, setSnapshotTitle] = useState("My First Draft");

  // ATS Analysis states
  const [atsScore, setAtsScore] = useState(65);
  const [detectedKeywords, setDetectedKeywords] = useState(["React", "JavaScript", "HTML", "CSS"]);
  const [missingKeywords, setMissingKeywords] = useState(["Next.js", "TypeScript", "Tailwind CSS", "Redux"]);
  const [recommendations, setRecommendations] = useState([
    "Add Next.js & TypeScript skills to match modern Frontend positions.",
    "Mention performance improvements in your Associate role description.",
    "Draft a professional summary focusing on your technical achievements."
  ]);
  const [analyzing, setAnalyzing] = useState(false);

  // Compare states
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);

  // Form helpers
  const [expCompany, setExpCompany] = useState("");
  const [expRole, setExpRole] = useState("");
  const [expDuration, setExpDuration] = useState("");
  const [expDesc, setExpDesc] = useState("");

  const [eduInst, setEduInst] = useState("");
  const [eduDegree, setEduDegree] = useState("");
  const [eduDuration, setEduDuration] = useState("");

  // Authenticate user
  useEffect(() => {
    if (!user && !authLoading) {
      router.push("/login");
    } else if (user) {
      fetchSnapshots();
    }
  }, [user, authLoading, router]);

  // Fetch saved snapshots from Firestore
  const fetchSnapshots = async () => {
    if (!user?.email) return;
    setLoadingSnapshots(true);
    try {
      const q = query(
        collection(db, "users", user.email, "resumes"),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const fetched = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSnapshots(fetched);

      // Load newest snapshot as default if exists
      if (fetched.length > 0) {
        loadSnapshot(fetched[0]);
      }
    } catch (error) {
      console.error("Error fetching snapshots:", error);
      toast.error("Failed to load resume history");
    } finally {
      setLoadingSnapshots(false);
    }
  };

  // Load a snapshot details into active editor
  const loadSnapshot = (snap) => {
    setRoleLabel(snap.roleLabel || "Frontend Developer");
    setSummary(snap.content?.summary || "");
    setSkills(snap.content?.skills || []);
    setExperience(snap.content?.experience || []);
    setEducation(snap.content?.education || []);
    setAtsScore(snap.atsScore || 50);
    setDetectedKeywords(snap.keywords || []);
    setMissingKeywords(snap.missingKeywords || []);
    setRecommendations(snap.recommendations || []);
    toast.success(`Loaded snapshot: ${snap.title}`);
  };

  // Add Skill
  const handleAddSkill = (skillText) => {
    const clean = skillText.trim();
    if (clean && !skills.includes(clean)) {
      setSkills([...skills, clean]);
      setNewSkill("");
    }
  };

  // Remove Skill
  const handleRemoveSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  // Add missing keyword directly to skills
  const addMissingKeyword = (kw) => {
    if (!skills.includes(kw)) {
      setSkills([...skills, kw]);
      // Remove from missing keywords client-side temporarily
      setMissingKeywords(missingKeywords.filter(k => k !== kw));
      setDetectedKeywords([...detectedKeywords, kw]);
      toast.success(`Added skill: ${kw}`);
    }
  };

  // Add Experience
  const handleAddExperience = () => {
    if (expCompany && expRole && expDuration) {
      setExperience([
        ...experience,
        {
          company: expCompany,
          role: expRole,
          duration: expDuration,
          description: expDesc
        }
      ]);
      setExpCompany("");
      setExpRole("");
      setExpDuration("");
      setExpDesc("");
    } else {
      toast.warning("Please fill out Company, Role, and Duration");
    }
  };

  // Remove Experience
  const handleRemoveExperience = (index) => {
    setExperience(experience.filter((_, i) => i !== index));
  };

  // Add Education
  const handleAddEducation = () => {
    if (eduInst && eduDegree && eduDuration) {
      setEducation([
        ...education,
        {
          institution: eduInst,
          degree: eduDegree,
          duration: eduDuration
        }
      ]);
      setEduInst("");
      setEduDegree("");
      setEduDuration("");
    } else {
      toast.warning("Please fill out Institution, Degree, and Duration");
    }
  };

  // Remove Education
  const handleRemoveEducation = (index) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  // Trigger Gemini ATS Optimization
  const handleAnalyzeResume = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch("/api/resume/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: { summary, skills, experience, education },
          role: roleLabel
        })
      });

      const data = await response.json();

      if (response.ok) {
        setAtsScore(data.atsScore);
        setDetectedKeywords(data.keywords || []);
        setMissingKeywords(data.missingKeywords || []);
        setRecommendations(data.recommendations || []);
        toast.success("Resume analyzed successfully!");
      } else {
        toast.error(data.error || "Failed to analyze resume");
      }
    } catch (err) {
      console.error("Error analyzing resume:", err);
      toast.error("Analysis service temporarily offline");
    } finally {
      setAnalyzing(false);
    }
  };

  // Save current details as a snapshot
  const handleSaveSnapshot = async () => {
    if (!user?.email) return;
    if (!snapshotTitle.trim()) {
      toast.error("Please provide a snapshot title");
      return;
    }

    try {
      const newSnapshot = {
        title: snapshotTitle,
        roleLabel,
        atsScore,
        changeSummary,
        keywords: detectedKeywords,
        missingKeywords,
        recommendations,
        content: {
          summary,
          skills,
          experience,
          education
        },
        createdAt: Date.now()
      };

      const docRef = await addDoc(
        collection(db, "users", user.email, "resumes"),
        newSnapshot
      );

      toast.success("Snapshot saved successfully!");
      setChangeSummary("");
      setSnapshotTitle(`Snapshot ${snapshots.length + 2}`);
      fetchSnapshots();
    } catch (error) {
      console.error("Error saving snapshot:", error);
      toast.error("Failed to save snapshot");
    }
  };

  // Delete Snapshot
  const handleDeleteSnapshot = async (id, e) => {
    e.stopPropagation();
    if (!user?.email) return;
    if (!confirm("Are you sure you want to delete this snapshot?")) return;

    try {
      await deleteDoc(doc(db, "users", user.email, "resumes", id));
      toast.success("Snapshot deleted");
      fetchSnapshots();
    } catch (error) {
      console.error("Error deleting snapshot:", error);
      toast.error("Failed to delete snapshot");
    }
  };

  // Recharts score progression data
  const chartData = [...snapshots]
    .reverse()
    .map((s, index) => ({
      name: `v${index + 1}`,
      title: s.title,
      score: s.atsScore
    }));

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <p className="text-muted-foreground text-sm font-light">Authenticating user...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4 md:px-8">
      {/* Header section with gradient */}
      <div className="max-w-7xl mx-auto mb-10 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 text-xs font-light mb-3">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            AI Resume Analyzer & Version Control
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-linear-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
            Smart Resume & ATS Manager
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl font-light text-sm md:text-base">
            Optimize your resume keyword density, track ATS progress history, and create custom role snapshots side-by-side.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant={compareMode ? "default" : "outline"}
            onClick={() => {
              setCompareMode(!compareMode);
              setCompareA(snapshots[0] || null);
              setCompareB(snapshots[1] || null);
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeftRight className="h-4 w-4" />
            {compareMode ? "Exit Compare" : "Compare Versions"}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Timeline & Snapshots list (Span 3) */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-card/50 backdrop-blur-xl border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">Version Timeline</CardTitle>
              </div>
              <CardDescription>Browse saved variations</CardDescription>
            </CardHeader>
            <CardContent className="px-3">
              {loadingSnapshots ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : snapshots.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
                  <p className="text-xs text-muted-foreground font-light">No snapshots created yet. Add details and save!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {snapshots.map((snap) => {
                    const isSelected =
                      !compareMode &&
                      snap.roleLabel === roleLabel &&
                      snap.atsScore === atsScore &&
                      snap.content?.summary === summary;

                    return (
                      <div
                        key={snap.id}
                        onClick={() => loadSnapshot(snap)}
                        className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-blue-500/10 border-blue-500/50 shadow-md shadow-blue-500/5"
                            : "bg-background/40 hover:bg-muted/30 border-border/60"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate group-hover:text-blue-400 transition-colors">
                              {snap.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate uppercase">
                              {snap.roleLabel}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                              snap.atsScore >= 80
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : snap.atsScore >= 50
                                ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {snap.atsScore}%
                          </span>
                        </div>

                        {snap.changeSummary && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-1 border-t border-border/40 pt-1">
                            {snap.changeSummary}
                          </p>
                        )}

                        <div className="flex justify-between items-center mt-2 text-[10px] text-muted-foreground">
                          <span>{new Date(snap.createdAt).toLocaleDateString()}</span>
                          <button
                            onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                            title="Delete snapshot"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Snapshot Action Box */}
          <Card className="bg-card/50 backdrop-blur-xl border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Save Current Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Snapshot Name</label>
                <input
                  type="text"
                  value={snapshotTitle}
                  onChange={(e) => setSnapshotTitle(e.target.value)}
                  placeholder="e.g. Frontend Dev Mid-Level"
                  className="w-full bg-background/50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Log Changes (Optional)</label>
                <textarea
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder="e.g. Added TypeScript skill & formatted summary"
                  className="w-full bg-background/50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground h-16 resize-none focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <Button
                onClick={handleSaveSnapshot}
                className="w-full text-xs font-semibold py-1.5 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-3.5 w-3.5" />
                Snapshot Draft
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Center Panel (Span 6): Interactive Form / Side-by-Side Comparison */}
        <div className="lg:col-span-6 space-y-6">
          {!compareMode ? (
            <Card className="bg-card/40 backdrop-blur-xl border-border/50">
              <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Edit Resume Details</CardTitle>
                  <CardDescription>Update your professional fields below</CardDescription>
                </div>
                <Button
                  onClick={handleAnalyzeResume}
                  disabled={analyzing}
                  className="bg-linear-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 font-medium text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      AI ATS Analyze
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Target Role Label */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Target Job Role</label>
                    <span className="text-[10px] text-muted-foreground">Changes the AI scoring lens</span>
                  </div>
                  <input
                    type="text"
                    value={roleLabel}
                    onChange={(e) => setRoleLabel(e.target.value)}
                    placeholder="e.g. Frontend Developer, Machine Learning Engineer"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-hidden focus:border-blue-500 transition-all font-light"
                  />
                </div>

                {/* Professional Summary */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Professional Summary</label>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Add an impactful summary statement..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:border-blue-500 h-28 resize-none transition-all font-light leading-relaxed"
                  />
                </div>

                {/* Technical Skills & Keywords */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Skills & Core Keywords</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="e.g. Next.js"
                      onKeyDown={(e) => e.key === "Enter" && handleAddSkill(newSkill)}
                      className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-xs focus:outline-hidden focus:border-blue-500 font-light"
                    />
                    <Button
                      onClick={() => handleAddSkill(newSkill)}
                      size="sm"
                      className="bg-muted hover:bg-muted/80 text-foreground border border-border text-xs px-3"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-16 p-3 border border-border/60 rounded-xl bg-background/20">
                    {skills.length === 0 ? (
                      <span className="text-xs text-muted-foreground font-light">No skills added yet. Add above or click keywords.</span>
                    ) : (
                      skills.map((skill, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-lg text-xs transition-colors font-medium"
                        >
                          <span>{skill}</span>
                          <button
                            onClick={() => handleRemoveSkill(index)}
                            className="text-blue-400 hover:text-red-400 transition-colors font-bold text-[10px]"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Professional Experience */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Professional Experience</label>
                    <Briefcase className="h-4 w-4 text-muted-foreground opacity-60" />
                  </div>
                  
                  {/* Experience entry boxes */}
                  <div className="grid grid-cols-2 gap-3 p-3 border border-border/60 rounded-xl bg-background/30">
                    <input
                      type="text"
                      placeholder="Company"
                      value={expCompany}
                      onChange={(e) => setExpCompany(e.target.value)}
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Role (e.g. Lead Dev)"
                      value={expRole}
                      onChange={(e) => setExpRole(e.target.value)}
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Duration (e.g. 2023 - 2025)"
                      value={expDuration}
                      onChange={(e) => setExpDuration(e.target.value)}
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground col-span-2 focus:outline-hidden focus:border-blue-500"
                    />
                    <textarea
                      placeholder="Bullet descriptions..."
                      value={expDesc}
                      onChange={(e) => setExpDesc(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground col-span-2 h-16 resize-none focus:outline-hidden focus:border-blue-500"
                    />
                    <Button
                      onClick={handleAddExperience}
                      className="col-span-2 text-xs py-1 flex items-center justify-center gap-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Add Job Entry
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {experience.map((exp, index) => (
                      <div key={index} className="p-3 border border-border/50 rounded-xl bg-background/10 flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">{exp.role} @ <span className="text-blue-400">{exp.company}</span></p>
                          <p className="text-[10px] text-muted-foreground uppercase">{exp.duration}</p>
                          <p className="text-xs text-muted-foreground font-light leading-relaxed mt-1">{exp.description}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveExperience(index)}
                          className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Education */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Education</label>
                    <BookOpen className="h-4 w-4 text-muted-foreground opacity-60" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 border border-border/60 rounded-xl bg-background/30">
                    <input
                      type="text"
                      placeholder="School / Institution"
                      value={eduInst}
                      onChange={(e) => setEduInst(e.target.value)}
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Degree / Major"
                      value={eduDegree}
                      onChange={(e) => setEduDegree(e.target.value)}
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Duration"
                      value={eduDuration}
                      onChange={(e) => setEduDuration(e.target.value)}
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground col-span-2 focus:outline-hidden focus:border-blue-500"
                    />
                    <Button
                      onClick={handleAddEducation}
                      className="col-span-2 text-xs py-1 flex items-center justify-center gap-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Add Education
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {education.map((edu, index) => (
                      <div key={index} className="p-3 border border-border/50 rounded-xl bg-background/10 flex justify-between items-center gap-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{edu.degree}</p>
                          <p className="text-xs text-muted-foreground">{edu.institution} • {edu.duration}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveEducation(index)}
                          className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Compare view */
            <Card className="bg-card/50 backdrop-blur-xl border-border/50">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-lg">Side-by-Side Version Comparison</CardTitle>
                <CardDescription>Select two snapshots below to compare their parameters</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase">Version A</label>
                    <select
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden mt-1"
                      value={compareA?.id || ""}
                      onChange={(e) => setCompareA(snapshots.find(s => s.id === e.target.value) || null)}
                    >
                      {snapshots.map(s => <option key={s.id} value={s.id}>{s.title} ({s.roleLabel})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase">Version B</label>
                    <select
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden mt-1"
                      value={compareB?.id || ""}
                      onChange={(e) => setCompareB(snapshots.find(s => s.id === e.target.value) || null)}
                    >
                      {snapshots.map(s => <option key={s.id} value={s.id}>{s.title} ({s.roleLabel})</option>)}
                    </select>
                  </div>
                </div>

                {compareA && compareB ? (
                  <div className="space-y-6">
                    {/* Score comparison card */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-4 border border-border/60 rounded-2xl bg-background/30">
                        <p className="text-xs text-muted-foreground truncate uppercase font-semibold">{compareA.title}</p>
                        <p className="text-3xl font-extrabold text-blue-400 mt-2">{compareA.atsScore}%</p>
                        <p className="text-[10px] text-muted-foreground uppercase mt-1">{compareA.roleLabel}</p>
                      </div>
                      <div className="p-4 border border-border/60 rounded-2xl bg-background/30 relative">
                        <p className="text-xs text-muted-foreground truncate uppercase font-semibold">{compareB.title}</p>
                        <p className="text-3xl font-extrabold text-violet-400 mt-2">{compareB.atsScore}%</p>
                        <p className="text-[10px] text-muted-foreground uppercase mt-1">{compareB.roleLabel}</p>
                        {compareB.atsScore !== compareA.atsScore && (
                          <div className={`absolute -top-2.5 right-4 text-xs px-2.5 py-0.5 rounded-full font-bold ${
                            compareB.atsScore > compareA.atsScore ? "bg-green-500/10 text-green-400 border border-green-500/25" : "bg-red-500/10 text-red-400 border border-red-500/25"
                          }`}>
                            {compareB.atsScore > compareA.atsScore ? "+" : ""}{compareB.atsScore - compareA.atsScore}%
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Summary comparison */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Professional Summary</label>
                      <div className="grid grid-cols-2 gap-4 text-xs font-light leading-relaxed border-t border-border/40 pt-3">
                        <div className="p-3 bg-background/25 border border-border/40 rounded-xl">
                          <p className="text-muted-foreground">{compareA.content?.summary || "No summary provided."}</p>
                        </div>
                        <div className="p-3 bg-background/25 border border-border/40 rounded-xl">
                          <p className="text-muted-foreground">{compareB.content?.summary || "No summary provided."}</p>
                        </div>
                      </div>
                    </div>

                    {/* Skills Comparison */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Skills Diff</label>
                      <div className="grid grid-cols-2 gap-4 text-xs border-t border-border/40 pt-3">
                        <div className="p-3 bg-background/20 border border-border/40 rounded-xl">
                          <div className="flex flex-wrap gap-1.5">
                            {compareA.content?.skills?.map((sk, index) => (
                              <span key={index} className="bg-muted px-2 py-0.5 rounded-md text-[11px] text-foreground font-medium border border-border/50">
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="p-3 bg-background/20 border border-border/40 rounded-xl">
                          <div className="flex flex-wrap gap-1.5">
                            {compareB.content?.skills?.map((sk, index) => {
                              const isAdded = !compareA.content?.skills?.includes(sk);
                              return (
                                <span
                                  key={index}
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                    isAdded
                                      ? "bg-green-500/15 text-green-400 border-green-500/25 animate-pulse"
                                      : "bg-muted text-foreground border-border/50"
                                  }`}
                                >
                                  {sk}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Experience list comparison */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Experience comparison</label>
                      <div className="grid grid-cols-2 gap-4 text-xs border-t border-border/40 pt-3">
                        <div className="space-y-3">
                          {compareA.content?.experience?.map((exp, i) => (
                            <div key={i} className="p-3 bg-background/20 border border-border/40 rounded-xl">
                              <p className="font-semibold text-[13px]">{exp.role} @ <span className="text-blue-400">{exp.company}</span></p>
                              <p className="text-[10px] text-muted-foreground">{exp.duration}</p>
                              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed font-light">{exp.description}</p>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-3">
                          {compareB.content?.experience?.map((exp, i) => (
                            <div key={i} className="p-3 bg-background/20 border border-border/40 rounded-xl">
                              <p className="font-semibold text-[13px]">{exp.role} @ <span className="text-violet-400">{exp.company}</span></p>
                              <p className="text-[10px] text-muted-foreground">{exp.duration}</p>
                              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed font-light">{exp.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-xs text-muted-foreground font-light">Please ensure you have at least two snapshots in history to compare.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: ATS Analytics Dashboard (Span 3) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Gauge Widget */}
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 flex flex-col items-center p-6 text-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">ATS Compatibility Score</h3>
            
            <div className="relative flex items-center justify-center h-32 w-32">
              <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background track circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-muted"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Foreground progression circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className={`transition-all duration-1000 ${
                    atsScore >= 80
                      ? "stroke-green-500"
                      : atsScore >= 50
                      ? "stroke-yellow-500"
                      : "stroke-red-500"
                  }`}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * atsScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center space-y-0.5">
                <span className="text-3xl font-extrabold tracking-tight text-foreground">{atsScore}%</span>
                <p className="text-[9px] text-muted-foreground uppercase font-semibold">Matched</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              {atsScore >= 80 ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 font-medium">Ready to Apply!</span>
                </>
              ) : atsScore >= 50 ? (
                <>
                  <Info className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 font-medium">Good start, optimize keywords</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-red-400 font-medium">Critical gaps found</span>
                </>
              )}
            </div>
          </Card>

          {/* Historical Progression Chart */}
          {snapshots.length > 1 && (
            <Card className="bg-card/50 backdrop-blur-xl border-border/50 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Score Progression
              </h3>
              <div className="h-28 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-black/90 border border-white/10 p-2 rounded-lg shadow-xl text-[10px]">
                              <p className="font-semibold text-white">{payload[0].payload.title}</p>
                              <p className="text-blue-400 font-bold mt-0.5">ATS: {payload[0].value}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Interactive Keywords Box */}
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 p-4 space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Detected Keywords</h3>
              <div className="flex flex-wrap gap-1">
                {detectedKeywords.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground font-light">None detected yet</span>
                ) : (
                  detectedKeywords.map((kw, i) => (
                    <span key={i} className="bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] px-1.5 py-0.5 rounded-sm font-semibold">
                      {kw}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-border/40 pt-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Missing High-Value Keywords</h3>
              <div className="flex flex-wrap gap-1">
                {missingKeywords.length === 0 ? (
                  <span className="text-[11px] text-green-400 font-medium">All keywords matched! 🎉</span>
                ) : (
                  missingKeywords.map((kw, i) => (
                    <button
                      key={i}
                      onClick={() => addMissingKeyword(kw)}
                      className="group/btn bg-red-500/10 hover:bg-green-500/15 border border-red-500/20 hover:border-green-500/30 text-red-400 hover:text-green-400 text-[10px] px-1.5 py-0.5 rounded-sm font-semibold flex items-center gap-1 transition-all"
                      title="Click to insert this skill automatically!"
                    >
                      <span>{kw}</span>
                      <Plus className="h-2.5 w-2.5 opacity-60 group-hover/btn:opacity-100 group-hover/btn:scale-125 transition-all text-red-400 group-hover/btn:text-green-400" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </Card>

          {/* Smart recommendations */}
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Smart Recommendations
            </h3>
            <div className="space-y-2">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex gap-2 text-xs font-light text-muted-foreground leading-relaxed">
                  <div className="h-1.5 w-1.5 bg-violet-500 rounded-full mt-1.5 shrink-0" />
                  <p>{rec}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
