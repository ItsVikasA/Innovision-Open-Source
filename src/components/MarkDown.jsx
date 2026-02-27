"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark, coldarkCold } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useNightMode } from "@/contexts/nightMode";

// Copy button component for code blocks
const CopyButton = ({ code, theme }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied!", {
        icon: <Check className="h-4 w-4 text-green-500" />,
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy code");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`
        absolute top-2 right-2 p-2 rounded-md
        transition-all duration-200 ease-in-out z-10
        ${copied
          ? "bg-green-500/20 text-green-400"
          : theme === "dark"
            ? "bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-gray-200"
            : "bg-gray-300/50 text-gray-600 hover:bg-gray-400/50 hover:text-gray-800"
        }
      `}
      title={copied ? "Copied!" : "Copy code"}
    >
      {copied ? (
        <Check className="h-4 w-4 animate-scale-check" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
};

const MarkDown = ({ content }) => {
  const [theme, setTheme] = useState("light");
  const { nightMode } = useNightMode();

  // Listen for theme changes
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);

    // Listen for theme changes
    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem("theme") || "light";
      setTheme(currentTheme);
    };

    // Listen for storage events (theme changes in other tabs)
    window.addEventListener("storage", handleThemeChange);

    // Also check periodically for theme changes (fallback)
    const interval = setInterval(() => {
      const currentTheme = localStorage.getItem("theme") || "light";
      if (currentTheme !== theme) {
        setTheme(currentTheme);
      }
    }, 100);

    return () => {
      window.removeEventListener("storage", handleThemeChange);
      clearInterval(interval);
    };
  }, [theme]);

  // Select appropriate theme based on current mode
  const codeTheme = theme === "dark" ? coldarkDark : coldarkCold;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        blockquote({ node, children }) {
          // Check for GitHub-style callouts like [!NOTE], [!TIP], etc.
          const content = React.Children.toArray(children);
          const firstChild = content[0];

          if (typeof firstChild?.props?.children?.[0] === 'string') {
            const text = firstChild.props.children[0];
            const match = text.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);

            if (match) {
              const type = match[1].toUpperCase();
              const remainingContent = [...content];

              // Remove the [!TYPE] prefix from the first child
              remainingContent[0] = React.cloneElement(firstChild, {
                children: [text.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i, '').trim(), ...firstChild.props.children.slice(1)]
              });

              const styles = {
                NOTE: "border-blue-500 bg-blue-500/10 text-blue-800 dark:text-blue-200",
                TIP: "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
                IMPORTANT: "border-purple-500 bg-purple-500/10 text-purple-800 dark:text-purple-200",
                WARNING: "border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-200",
                CAUTION: "border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-200"
              };

              const icons = {
                NOTE: <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />,
                TIP: <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />,
                IMPORTANT: <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />,
                WARNING: <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />,
                CAUTION: <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              };

              return (
                <div className={`my-8 p-5 border-l-4 rounded-r-xl shadow-sm ${styles[type] || styles.NOTE}`}>
                  <div className="font-bold text-xs tracking-widest uppercase mb-3 flex items-center gap-2 opacity-80">
                    {icons[type]}
                    {type}
                  </div>
                  <div className="text-[0.95rem] leading-relaxed font-medium">{remainingContent}</div>
                </div>
              );
            }
          }

          return (
            <blockquote className="border-l-4 border-primary/30 pl-6 my-8 italic text-muted-foreground/90 text-lg decoration-primary/20 decoration-2 underline-offset-4">
              {children}
            </blockquote>
          );
        },
        h2({ children }) {
          return (
            <h2 className="text-2xl md:text-3xl font-bold mt-16 mb-8 pb-3 border-b border-border/60 flex items-center gap-3 group tracking-tight">
              <span className="w-2 h-8 bg-linear-to-b from-primary to-primary/40 rounded-full shadow-sm shadow-primary/20" />
              {children}
            </h2>
          );
        },
        h3({ children }) {
          return (
            <h3 className="text-xl md:text-2xl font-semibold mt-10 mb-5 text-foreground/90 tracking-tight flex items-center gap-2">
              <span className="w-1 h-5 bg-muted-foreground/20 rounded-full" />
              {children}
            </h3>
          );
        },
        p({ children }) {
          return (
            <p className="text-muted-foreground/90 leading-8 mb-6 text-[1.05rem]">
              {children}
            </p>
          );
        },
        ul({ children }) {
          return (
            <ul className="space-y-3 mb-8 ml-4 list-none">
              {children}
            </ul>
          );
        },
        li({ children }) {
          return (
            <li className="flex gap-3 text-muted-foreground/90 leading-7">
              <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
              <div>{children}</div>
            </li>
          );
        },
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const codeString = String(children).trim();

          return !inline && match ? (
            <div className="relative group my-8 rounded-xl overflow-hidden border border-border/50 shadow-md">
              {/* Language badge */}
              <div className={`absolute top-0 left-0 px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase z-20 ${theme === "dark"
                ? "text-gray-400 bg-gray-900/80 backdrop-blur-sm border-r border-b border-white/5"
                : "text-gray-500 bg-gray-100/80 backdrop-blur-sm border-r border-b border-black/5"
                }`}>
                {match[1]}
              </div>

              {/* Copy button */}
              <CopyButton code={codeString} theme={theme} />

              <SyntaxHighlighter
                customStyle={{
                  fontSize: "13.5px",
                  lineHeight: "1.6",
                  padding: "3rem 1.5rem 1.5rem 1.5rem",
                  margin: "0",
                  backgroundColor: theme === "dark" ? "#0a0a0c" : "#fafafa",
                }}
                style={codeTheme}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code
              className={`${className || ""} text-[0.9em] font-medium bg-muted px-1.5 py-0.5 rounded-md text-primary`}
              {...props}
            >
              {children}
            </code>
          );
        },
      }}
    >
      {content || ""}
    </ReactMarkdown>
  );
};

export default MarkDown;