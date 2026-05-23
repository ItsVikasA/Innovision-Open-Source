"use client";
import { useMemo, useState } from "react";
import { HelpCircle, Plus, Minus, Search } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const faqData = [
  {
    category: "General",
    question: "How does InnoVision generate personalized courses?",
    answer:
      "InnoVision uses advanced AI to analyze your topic of interest and creates a structured, chapter-by-chapter course tailored to your learning needs."
  },
  {
    category: "General",
    question: "What topics can I learn with InnoVision?",
    answer:
      "You can learn virtually any topic—from programming and data science to arts, business, and personal skills."
  },
  {
    category: "General",
    question: "Is InnoVision free to use?",
    answer:
      "Yes, core learning features are free. Advanced features may be introduced later."
  },

  {
    category: "Learning",
    question: "How long does it take to generate a course?",
    answer:
      "Most courses are generated within a few seconds using AI-based structuring and content generation."
  },
  {
    category: "Learning",
    question: "Can I customize my learning roadmap?",
    answer:
      "Yes, you can choose fast-track, balanced, or deep-learning modes depending on your goals."
  },
  {
    category: "Learning",
    question: "Does InnoVision support different skill levels?",
    answer:
      "Yes, it supports beginner, intermediate, and advanced learners with structured progression."
  },
  {
    category: "Learning",
    question: "Can I track my progress?",
    answer:
      "Yes, you can track completed chapters, progress stats, and performance insights."
  },

  {
    category: "Account",
    question: "Do I need an account to use InnoVision?",
    answer:
      "Yes, an account is required to save progress and access personalized learning features."
  },
  {
    category: "Account",
    question: "Can I access my courses on multiple devices?",
    answer:
      "Yes, your learning data is synced across all devices once you log in."
  },
  {
    category: "Account",
    question: "Is my data secure?",
    answer:
      "Yes, we use secure authentication and encrypted storage to protect your data."
  },

  {
    category: "Advanced",
    question: "How does InnoVision ensure content quality?",
    answer:
      "AI models are trained on high-quality educational datasets and continuously improved using feedback loops."
  },
  {
    category: "Advanced",
    question: "Will certifications be available?",
    answer:
      "Certification features are planned for future updates."
  }
];

const categories = ["All", "General", "Learning", "Account", "Advanced"];

const FAQItem = ({ item, isOpen, onClick }) => (
  <div
    className={`rounded-2xl border bg-background overflow-hidden transition-all duration-300 ${
      isOpen ? "border-blue-500/40" : "hover:border-border/60"
    }`}
  >
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between p-5 text-left group"
    >
      <span className="pr-4 text-foreground group-hover:text-blue-500 transition-colors font-light">
        {item.question}
      </span>

      <div
        className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? "bg-blue-500 text-white"
            : "border border-border group-hover:border-blue-500/40"
        }`}
      >
        {isOpen ? <Minus size={16} /> : <Plus size={16} />}
      </div>
    </button>

    <div
      className={`px-5 transition-all duration-300 overflow-hidden ${
        isOpen ? "max-h-96 opacity-100 pb-5" : "max-h-0 opacity-0"
      }`}
    >
      <p className="text-muted-foreground leading-relaxed font-light">
        {item.answer}
      </p>
    </div>
  </div>
);

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredFaqs = useMemo(() => {
    return faqData.filter((faq) => {
      const matchesCategory =
        activeCategory === "All" || faq.category === activeCategory;

      const matchesSearch =
        faq.question.toLowerCase().includes(search.toLowerCase()) ||
        faq.answer.toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  const visibleFaqs = filteredFaqs.slice(0, visibleCount);

  const toggleAll = (type) => {
    if (type === "open") setOpenIndex("ALL");
    else setOpenIndex(null);
  };

  return (
    <section id="faq" className="w-screen py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4 md:px-6">

        {/* Header */}
        <ScrollReveal direction="up">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm mb-4">
              <HelpCircle size={14} /> FAQ
            </div>

            <h2 className="text-4xl md:text-5xl font-light mb-3">
              Frequently Asked <span className="text-blue-500">Questions</span>
            </h2>

            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about InnoVision AI learning platform.
            </p>
          </div>
        </ScrollReveal>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-muted-foreground" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border bg-background outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setVisibleCount(6);
              }}
              className={`px-4 py-2 rounded-full text-sm border transition ${
                activeCategory === cat
                  ? "bg-blue-500 text-white border-blue-500"
                  : "hover:border-blue-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3 mb-6">
          <button
            onClick={() => toggleAll("open")}
            className="text-sm px-4 py-2 rounded-full border hover:border-blue-500"
          >
            Expand All
          </button>
          <button
            onClick={() => toggleAll("close")}
            className="text-sm px-4 py-2 rounded-full border hover:border-blue-500"
          >
            Collapse All
          </button>
        </div>

        {/* FAQ List */}
        <div className="max-w-3xl mx-auto space-y-4">
          {visibleFaqs.map((item, index) => (
            <ScrollReveal key={index} direction="up">
              <FAQItem
                item={item}
                isOpen={openIndex === index || openIndex === "ALL"}
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
              />
            </ScrollReveal>
          ))}
        </div>

        {/* Load More */}
        {visibleCount < filteredFaqs.length && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => setVisibleCount((p) => p + 5)}
              className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </section>
  );
}