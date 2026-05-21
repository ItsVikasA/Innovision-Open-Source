"use client";

import { useEffect, useState } from "react";
import Hero from "./Hero";
import Features from "./Features";
import HowItWorks from "./HowItWorks";
import Image from "next/image";
import Testimonials from "./Testimonials";
import CTA from "./CTA";
import FAQ from "./FAQ";
import Link from "next/link";
import BackToTop from "./BackToTop";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Github,
  Linkedin,
  Mail,
  MessageSquare,
  Send,
  Sparkles,
  Twitter,
  User,
} from "lucide-react";
import { toast } from "sonner";

export default function Landing() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const MAX_MESSAGE = 500;

  const [submitState, setSubmitState] = useState({
    type: "idle",
    message: "",
  });

  useEffect(() => {
    const revealElements = document.querySelectorAll("[data-reveal]");
    if (!revealElements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -70px 0px",
      },
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const reveal = (delay = 0) => ({
    "--reveal-delay": `${delay}ms`,
  });

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/features", label: "Features" },
    { href: "/premium", label: "Premium" },
    { href: "/contact", label: "Contact" },
  ];

  const quickLinks = [
    { href: "/demo", label: "Demo" },
    { href: "/feedback", label: "Feedback" },
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
  ];

  const socialLinks = [
    {
      href: "https://github.com/ItsVikasA/InnoVision",
      label: "GitHub",
      icon: Github,
    },
    {
      href: "https://www.linkedin.com/in/vikas028/",
      label: "LinkedIn",
      icon: Linkedin,
    },
    {
      href: "https://twitter.com",
      label: "Twitter",
      icon: Twitter,
    },
  ];

  const inputBaseClass =
  "w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm text-black placeholder:text-neutral-400 shadow-sm transition-all duration-300 focus:border-black/20 focus:outline-none focus:ring-4 focus:ring-black/5 dark:border-white/10 dark:bg-background/80 dark:text-white dark:placeholder:text-neutral-500 dark:focus:ring-white/10 sm:text-base";

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleContactSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitState({
      type: "idle",
      message: "",
    });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.error || "Unable to send message right now.",
        );
      }

      setFormData({
        name: "",
        email: "",
        message: "",
      });

      setSubmitState({
        type: "success",
        message:
          payload?.message ||
          "Thanks, your message has been sent successfully.",
      });

      toast.success("Message sent successfully.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to send your message right now.";

      setSubmitState({
        type: "error",
        message,
      });

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      {/* BACKGROUND DOTS */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="dot absolute h-1 w-1 animate-pulse rounded-full bg-foreground/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex w-full flex-col items-center">
        <Hero />
        <Features />
        <HowItWorks />
        <FAQ />
        <Testimonials />
        <CTA />

        {/* CONTACT SECTION */}
        <section
          id="contact"
          className="relative w-screen overflow-hidden bg-background py-16 sm:py-20"
        >
          <div className="container relative z-10 mx-auto px-4 md:px-6">
            {/* HEADER */}
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <div
                className="reveal-fade-up space-y-5"
                data-reveal
                style={reveal(0)}
              >
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-foreground text-base font-light mb-4"
                  style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', sans-serif" }}
                >
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  Contact Us
                </div>

                <h2 className="text-balance text-4xl font-light tracking-tight sm:text-5xl md:text-6xl">
                  Let's Build Something Amazing
                </h2>

                <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
                  Questions, partnerships, feedback, or ideas — connect with us
                  and let's create the future together.
                </p>
              </div>
            </div>

            {/* LANDSCAPE LAYOUT */}
            <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              {/* LEFT PANEL */}
              <div
                className="reveal-fade-up rounded-3xl border border-white/10 bg-background p-6 backdrop-blur-xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.4)] transition-all duration-300 sm:p-8"
                data-reveal
                style={reveal(80)}
              >
                <div className="relative z-10">
                  <span className="mb-5 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-foreground text-base font-light">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Connect With Us
                  </span>

                  <h3 className="text-3xl font-light leading-tight text-foreground sm:text-4xl">
                    Let's create futuristic learning experiences together.
                  </h3>

                  <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                    Whether you have a project idea, collaboration proposal,
                    product feedback, or just want to say hello — we'd love to
                    hear from you.
                  </p>

                  {/* SOCIAL CARDS */}
                  <div className="mt-10 space-y-4">
                    {socialLinks.map(({ href, label, icon: Icon }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between rounded-2xl border border-border/70 bg-background/40 px-5 py-4 transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/40 hover:bg-background/60"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                            <Icon className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {label}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              Follow us on {label}
                            </p>
                          </div>
                        </div>

                        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
                      </a>
                    ))}

                    {/* EMAIL CARD */}
                    <a
                      href="mailto:contact@innovision.com"
                      className="group flex items-center justify-between rounded-2xl border border-border/70 bg-background/40 px-5 py-4 transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/40 hover:bg-background/60"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                          <Mail className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Email
                          </p>

                          <p className="text-xs text-muted-foreground">
                            contact@innovision.com
                          </p>
                        </div>
                      </div>

                      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
                    </a>
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL */}
              <div
                className="reveal-fade-up rounded-3xl border border-white/10 bg-background p-6 backdrop-blur-xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.4)] transition-all duration-300 hover:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.5)] sm:p-8"
                data-reveal
                style={reveal(140)}
              >
                {/* SUCCESS STATE */}
                {submitState.type === "success" ? (
                  <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-medium text-foreground">Message Sent!</h4>
                      <p className="text-sm text-muted-foreground">{submitState.message}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSubmitState({ type: "idle", message: "" });
                        setFormData({ name: "", email: "", message: "" });
                      }}
                      className="mt-2 rounded-xl border border-border/60 px-5 py-2.5 text-sm text-muted-foreground transition-colors duration-200 hover:border-white/20 hover:text-foreground"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form className="space-y-6" onSubmit={handleContactSubmit}>

                    {/* FORM TITLE */}
                    <div className="mb-2">
                      <h4 className="text-lg font-light text-foreground">Send us a message</h4>
                      <p className="mt-1 text-xs text-muted-foreground">We typically reply within 24 hours.</p>
                    </div>

                    {/* NAME FIELD */}
                    <div className="group relative">
                      {/* icon */}
                      <div
                        className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                          focusedField === "name" || formData.name
                            ? "text-blue-400"
                            : "text-neutral-500"
                        }`}
                      >
                        <User className="h-4 w-4" />
                      </div>

                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField("name")}
                        onBlur={() => setFocusedField(null)}
                        required
                        className={`w-full rounded-2xl border bg-transparent pl-11 pr-4 pb-2.5 pt-6 text-sm text-foreground outline-none transition-all duration-300
                          autofill:bg-transparent dark:autofill:bg-transparent
                          ${focusedField === "name"
                            ? "border-blue-500/60 ring-4 ring-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
                            : formData.name
                            ? "border-white/20 bg-transparent" // Added explicit bg-transparent here when filled
                            : "border-white/10 hover:border-white/20 bg-transparent"
                          }`}
                      />

                      {/* floating label */}
                      <label
                        htmlFor="contact-name"
                        className={`pointer-events-none absolute left-11 font-medium transition-all duration-300 ease-out
                          ${focusedField === "name" || formData.name
                            ? "top-2 text-[10px] tracking-wide text-blue-400"
                            : "top-[50%] -translate-y-1/2 text-sm text-neutral-500"
                          }`}
                      >
                        Full Name
                      </label>

                      {/* filled indicator */}
                      {formData.name && focusedField !== "name" && (
                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </div>
                      )}
                    </div>

                    {/* EMAIL FIELD */}
                    <div className="group relative">
                      {/* icon */}
                      <div
                        className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                          focusedField === "email" || formData.email
                            ? "text-blue-400"
                            : "text-neutral-500"
                        }`}
                      >
                        <Mail className="h-4 w-4" />
                      </div>

                      {/* input */}
                      <input
                      id="contact-email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={`w-full rounded-2xl border bg-transparent pl-11 pr-4 pb-2.5 pt-6 text-sm text-foreground outline-none transition-all duration-300
                        autofill:bg-transparent dark:autofill:bg-transparent
                        ${focusedField === "email"
                          ? "border-blue-500/60 ring-4 ring-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
                          : formData.email
                          ? "border-white/20 bg-transparent" // Added explicit bg-transparent here when filled
                          : "border-white/10 hover:border-white/20 bg-transparent"
                        }`}
                    />

                      {/* floating label */}
                      <label
                        htmlFor="contact-email"
                        className={`pointer-events-none absolute left-11 font-medium transition-all duration-300 ease-out
                          ${focusedField === "email" || formData.email
                            ? "top-2 text-[10px] tracking-wide text-blue-400"
                            : "top-[50%] -translate-y-1/2 text-sm text-neutral-500"
                          }`}
                      >
                        Email Address
                      </label>

                      {/* filled indicator */}
                      {formData.email && focusedField !== "email" && (
                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </div>
                      )}
                    </div>

                    {/* MESSAGE FIELD */}
                    <div className="group relative">
                      {/* icon */}
                      <div
                        className={`pointer-events-none absolute left-4 top-6 transition-all duration-300 ${
                          focusedField === "message" || formData.message
                            ? "text-blue-400"
                            : "text-neutral-500"
                        }`}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </div>

                      {/* textarea */}
                      <textarea
                        id="contact-message"
                        name="message"
                        rows="6"
                        value={formData.message}
                        onChange={(e) => {
                          if (e.target.value.length <= MAX_MESSAGE) handleInputChange(e);
                        }}
                        onFocus={() => setFocusedField("message")}
                        onBlur={() => setFocusedField(null)}
                        required
                        className={`min-h-[160px] w-full resize-none rounded-2xl border bg-transparent pl-11 pr-4 pb-4 pt-7 text-sm text-foreground outline-none transition-all duration-300
                          ${focusedField === "message"
                            ? "border-blue-500/60 ring-4 ring-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
                            : formData.message
                            ? "border-white/20"
                            : "border-white/10 hover:border-white/20"
                          }`}
                      />

                      {/* floating label */}
                      <label
                        htmlFor="contact-message"
                        className={`pointer-events-none absolute left-11 font-medium transition-all duration-300 ease-out
                          ${focusedField === "message" || formData.message
                            ? "top-2 text-[10px] tracking-wide text-blue-400"
                            : "top-[26px] text-sm text-neutral-500"
                          }`}
                      >
                        Your Message
                      </label>

                      {/* character counter */}
                      <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
                        <span
                          className={`text-[10px] tabular-nums transition-colors duration-200 ${
                            formData.message.length >= MAX_MESSAGE
                              ? "text-rose-400"
                              : formData.message.length >= MAX_MESSAGE * 0.8
                              ? "text-amber-400"
                              : "text-neutral-600"
                          }`}
                        >
                          {formData.message.length}/{MAX_MESSAGE}
                        </span>
                      </div>
                    </div>

                    {/* ERROR MESSAGE */}
                    {submitState.type === "error" && submitState.message && (
                      <p className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-400" />
                        {submitState.message}
                      </p>
                    )}

                    {/* SUBMIT BUTTON */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_32px_-22px_rgba(59,130,246,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_40px_-20px_rgba(59,130,246,0.85)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {/* shimmer sweep on hover */}
                      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                      <span>{isSubmitting ? "Sending…" : "Send Message"}</span>
                      <Send className={`h-4 w-4 transition-transform duration-300 ${isSubmitting ? "animate-pulse" : "group-hover:translate-x-1"}`} />
                    </button>

                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="relative w-screen border-t border-white/10 bg-background">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />

          <div className="container mx-auto px-4 py-10 sm:px-6 sm:py-12">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
              {/* BRAND */}
              <div
                className="reveal-fade-up space-y-5"
                data-reveal
                style={reveal(0)}
              >
                <div className="flex items-center gap-2 text-lg font-light">
                  <Image
                    src="/InnoVision_LOGO-removebg-preview.png"
                    alt="logo"
                    width={34}
                    height={34}
                  />

                  <span className="text-foreground">
                    InnoVision
                  </span>
                </div>

                <p className="max-w-sm text-sm text-muted-foreground">
                  AI-powered learning that creates personalized
                  courses for any topic, at your pace and depth.
                </p>
              </div>

              {/* NAVIGATION */}
              <div
                className="reveal-fade-up space-y-3"
                data-reveal
                style={reveal(80)}
              >
                <h4 className="text-sm font-medium text-foreground">
                  Navigation
                </h4>

                <ul className="space-y-2.5 text-sm">
                  {navLinks.map(({ href, label }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="group inline-flex items-center gap-1 rounded-md text-muted-foreground transition-colors duration-200 hover:text-foreground"
                      >
                        {label}

                        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* QUICK LINKS */}
              <div
                className="reveal-fade-up space-y-3"
                data-reveal
                style={reveal(140)}
              >
                <h4 className="text-sm font-medium text-foreground">
                  Quick Links
                </h4>

                <ul className="space-y-2.5 text-sm">
                  {quickLinks.map(({ href, label }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="group inline-flex items-center gap-1 rounded-md text-muted-foreground transition-colors duration-200 hover:text-foreground"
                      >
                        {label}

                        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* SOCIAL */}
              <div
                className="reveal-fade-up space-y-4"
                data-reveal
                style={reveal(200)}
              >
                <h4 className="text-sm font-medium text-foreground">
                  Follow
                </h4>

                <div className="flex flex-wrap gap-2">
                  {socialLinks.map(
                    ({ href, label, icon: Icon }) => (
                      <a
                        key={`footer-${label}`}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-white/5 dark:bg-card/45 text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400/35 hover:text-foreground"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    ),
                  )}
                </div>

                <Link
                  href="/generate"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-white/5dark:bg-card/45 px-4 py-2.5 text-sm text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400/35 hover:text-foreground"
                >
                  Start Learning

                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* BOTTOM */}
            <div className="mt-10 flex flex-col items-center justify-center gap-2 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground sm:text-sm">
              <p>
                Made with{" "}
                <span className="text-red-500">
                  {"\u2764\uFE0F"}
                </span>{" "}
                for learners everywhere
              </p>

              <p>
                &copy; {new Date().getFullYear()} InnoVision.
                All rights reserved.
              </p>
            </div>
          </div>
        </footer>

        <BackToTop />
      </div>
    </div>
  );
}