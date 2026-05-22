import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background text-foreground">
      {/* Animated dots background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-foreground/20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
        <div className="mb-6">
          <span className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
            Error 404
          </span>
        </div>

        <h1 className="mb-6 text-6xl font-light tracking-tight md:text-8xl">
          Page Not Found
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-lg font-light text-muted-foreground">
          The page you're looking for doesn't exist, has been moved,
          or the URL might be incorrect.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="rounded-full bg-blue-500 px-8 py-3 text-white transition-all duration-300 hover:scale-105 hover:bg-blue-600"
          >
            Back to Home
          </Link>

          <Link
            href="/features"
            className="rounded-full border border-border px-8 py-3 text-foreground transition-all duration-300 hover:bg-muted"
          >
            Explore Features
          </Link>
        </div>
      </div>
    </div>
  );
}