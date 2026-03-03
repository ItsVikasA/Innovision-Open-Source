"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  X,
  Loader2,
  BookOpen,
  Lightbulb,
  Code2,
  HelpCircle,
  Quote,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import MarkDown from "@/components/MarkDown";
import { useAuth } from "@/contexts/auth";

const SUGGESTIONS = [
  { label: "Summarize this chapter", icon: BookOpen },
  { label: "Explain key concepts simply", icon: Lightbulb },
  { label: "Give me real-world examples", icon: Sparkles },
  { label: "Help me with the code", icon: Code2 },
  { label: "Quiz me on this topic", icon: HelpCircle },
];

function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-violet-500 to-blue-500 text-white"
        }`}
      >
        {isUser ? message.initials || "U" : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted rounded-tl-sm"
        }`}
      >
        {message.selectedText && (
          <div className="mb-2 border-l-2 border-violet-400 pl-2 text-xs opacity-80 italic">
            &ldquo;{message.selectedText.slice(0, 120)}
            {message.selectedText.length > 120 ? "..." : ""}&rdquo;
          </div>
        )}
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.text}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <MarkDown content={message.text} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudyBuddy({ chapterContent, chapterTitle }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const userInitials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, loading]);

  // Listen for text selection on the page
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 3 && text.length < 1000) {
        setSelectedText(text);
      }
    };

    document.addEventListener("mouseup", handleSelection);
    return () => document.removeEventListener("mouseup", handleSelection);
  }, []);

  const sendMessage = useCallback(
    async (text, selText = null) => {
      if (!text.trim() || loading) return;

      const userMsg = {
        role: "user",
        text: text.trim(),
        initials: userInitials,
        selectedText: selText || null,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setSelectedText("");
      setLoading(true);

      try {
        const res = await fetch("/api/study-buddy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            chapterContent: chapterContent || "",
            chapterTitle: chapterTitle || "",
            history: messages.slice(-8),
            selectedText: selText || undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to get response");
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.reply },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: `Sorry, I encountered an error: ${err.message}. Please try again.`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, chapterContent, chapterTitle, messages, userInitials]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input, selectedText || null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSelectedText("");
  };

  const handleSuggestion = (label) => {
    sendMessage(label);
  };

  const handleExplainSelection = () => {
    if (selectedText) {
      sendMessage("Explain this in simple terms", selectedText);
    }
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Study Buddy</span>
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>AI Study Buddy</TooltipContent>
      </Tooltip>

      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <SheetTitle className="text-base">Study Buddy</SheetTitle>
                <p className="text-xs text-muted-foreground">
                  AI tutor for {chapterTitle ? `"${chapterTitle}"` : "this chapter"}
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={clearChat}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear chat</TooltipContent>
              </Tooltip>
            )}
          </div>
        </SheetHeader>

        {/* Messages area */}
        <ScrollArea ref={scrollRef} className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20">
                  <MessageCircle className="h-8 w-8 text-violet-500" />
                </div>
                <div>
                  <h3 className="font-medium">
                    Hi! I&apos;m your Study Buddy
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                    Ask me anything about this chapter. I can explain concepts,
                    give examples, or help with code.
                  </p>
                </div>

                {/* Suggestion chips */}
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {SUGGESTIONS.map((s) => (
                    <Button
                      key={s.label}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => handleSuggestion(s.label)}
                    >
                      <s.icon className="h-3 w-3" />
                      {s.label}
                    </Button>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  💡 Tip: Select text on the page, then open Study Buddy to ask about it
                </p>
              </div>
            ) : (
              messages.map((msg, i) => <MessageBubble key={i} message={msg} />)
            )}

            {loading && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Selected text indicator */}
        {selectedText && (
          <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30 p-2">
            <Quote className="h-4 w-4 shrink-0 text-violet-500 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Selected text:</p>
              <p className="text-xs line-clamp-2">{selectedText}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={handleExplainSelection}
              >
                Explain
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSelectedText("")}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Input area */}
        <form
          onSubmit={handleSubmit}
          className="border-t px-4 py-3 shrink-0"
        >
          {messages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <Badge
                  key={s.label}
                  variant="outline"
                  className="cursor-pointer text-xs hover:bg-primary/10 transition-colors"
                  onClick={() => handleSuggestion(s.label)}
                >
                  <s.icon className="h-3 w-3 mr-1" />
                  {s.label}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this chapter..."
              className="min-h-[40px] max-h-[120px] resize-none text-sm"
              rows={1}
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              className="shrink-0 h-10 w-10"
              disabled={!input.trim() || loading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
