"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StickyNote, Plus, Trash2, Sparkles, FileText, Loader2,
  BookOpen, Lightbulb, HelpCircle, Calculator, AlertTriangle,
  Code, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import MarkDown from "@/components/MarkDown";

const CATEGORY_CONFIG = {
  definition: { label: "Definition", icon: BookOpen, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  concept: { label: "Concept", icon: Lightbulb, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  example: { label: "Example", icon: Code, color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
  formula: { label: "Formula", icon: Calculator, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  important: { label: "Important", icon: AlertTriangle, color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  question: { label: "Question", icon: HelpCircle, color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" },
  general: { label: "General", icon: Tag, color: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20" },
};

export default function SmartNotes({ roadmapId, chapter, chapterTitle }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const [cheatsheet, setCheatsheet] = useState("");
  const [generatingCheatsheet, setGeneratingCheatsheet] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const classifyTimer = useRef(null);
  const [pendingCategory, setPendingCategory] = useState(null);
  const textareaRef = useRef(null);

  // Fetch notes on mount
  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user, roadmapId, chapter]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/notes?roadmapId=${roadmapId}&chapter=${chapter}`
      );
      const data = await res.json();
      if (data.notes) {
        setNotes(data.notes);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-classify with debounce
  const classifyNote = useCallback(async (text) => {
    if (!text || text.trim().length < 5) {
      setPendingCategory(null);
      return;
    }

    setClassifying(true);
    try {
      const res = await fetch("/api/notes/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      setPendingCategory(data.category);
    } catch {
      setPendingCategory("general");
    } finally {
      setClassifying(false);
    }
  }, []);

  const handleNoteChange = (value) => {
    setNewNote(value);

    // Debounce AI classification (2 seconds)
    if (classifyTimer.current) {
      clearTimeout(classifyTimer.current);
    }
    classifyTimer.current = setTimeout(() => {
      classifyNote(value);
    }, 2000);
  };

  const saveNote = async () => {
    if (!newNote.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadmapId,
          chapter: String(chapter),
          content: newNote.trim(),
          category: pendingCategory || "general",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNotes((prev) => [data.note, ...prev]);
        setNewNote("");
        setPendingCategory(null);
        toast.success("Note saved!", {
          icon: <StickyNote className="h-4 w-4" />,
        });
      }
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (noteId) => {
    try {
      const res = await fetch(`/api/notes?noteId=${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        toast.success("Note deleted");
      }
    } catch {
      toast.error("Failed to delete note");
    }
  };

  const generateCheatsheet = async () => {
    if (notes.length === 0) {
      toast.error("Add some notes first to generate a cheat sheet");
      return;
    }

    setGeneratingCheatsheet(true);
    setCheatsheetOpen(true);
    setCheatsheet("");

    try {
      const res = await fetch("/api/notes/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cheatsheet",
          content: JSON.stringify({ notes, chapterTitle }),
        }),
      });

      const data = await res.json();
      if (data.cheatsheet) {
        setCheatsheet(data.cheatsheet);
      } else {
        toast.error("Failed to generate cheat sheet");
        setCheatsheetOpen(false);
      }
    } catch {
      toast.error("Failed to generate cheat sheet");
      setCheatsheetOpen(false);
    } finally {
      setGeneratingCheatsheet(false);
    }
  };

  const filteredNotes =
    filterCategory === "all"
      ? notes
      : notes.filter((n) => n.category === filterCategory);

  // Get unique categories from notes
  const usedCategories = [...new Set(notes.map((n) => n.category))];

  const CategoryBadge = ({ category, size = "sm" }) => {
    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
    const IconComp = config.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}
      >
        <IconComp className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
        {config.label}
      </span>
    );
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <StickyNote className="h-4 w-4" />
            Notes
            {notes.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
                {notes.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="w-full sm:w-[420px] flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-yellow-500" />
              Smart Notes
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* New Note Input */}
            <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                placeholder="Type a note... AI will classify it automatically"
                value={newNote}
                onChange={(e) => handleNoteChange(e.target.value)}
                className="min-h-[80px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    saveNote();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {classifying && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Classifying...
                    </span>
                  )}
                  {pendingCategory && !classifying && (
                    <CategoryBadge category={pendingCategory} />
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={saveNote}
                  disabled={!newNote.trim() || saving}
                  className="gap-1"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Ctrl+Enter to save quickly
              </p>
            </div>

            {/* Cheat Sheet Button */}
            {notes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={generateCheatsheet}
                disabled={generatingCheatsheet}
              >
                {generatingCheatsheet ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                )}
                Generate Master Cheat Sheet
              </Button>
            )}

            {/* Category Filters */}
            {usedCategories.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilterCategory("all")}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterCategory === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  All ({notes.length})
                </button>
                {usedCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterCategory === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    {(CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.general).label} (
                    {notes.filter((n) => n.category === cat).length})
                  </button>
                ))}
              </div>
            )}

            {/* Notes List */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-8">
                <StickyNote className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  {notes.length === 0
                    ? "No notes yet. Start typing above!"
                    : "No notes in this category."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="group p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CategoryBadge category={note.category} />
                        <p className="mt-2 text-sm whitespace-pre-wrap break-words">
                          {note.content}
                        </p>
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          {new Date(note.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500"
                        title="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Cheat Sheet Dialog */}
      <Dialog open={cheatsheetOpen} onOpenChange={setCheatsheetOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-yellow-500" />
              Master Cheat Sheet
            </DialogTitle>
          </DialogHeader>
          {generatingCheatsheet ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">
                Generating your cheat sheet...
              </p>
            </div>
          ) : (
            <div className="prose dark:prose-invert max-w-none">
              <MarkDown content={cheatsheet} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
