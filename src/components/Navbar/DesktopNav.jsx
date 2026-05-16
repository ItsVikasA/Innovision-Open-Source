"use client";
import Link from "next/link";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter, usePathname } from "next/navigation";

const DesktopNav = ({
  user,
  createMenuItems,
  learnMenuItems,
  moreMenuItems,
  landingNavItems,
  isActiveLink,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleLandingNav = (id) => {
    // If already on home page → smooth scroll
    if (pathname === "/") {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
      });
      return;
    }

    // Navigate to home with hash
    router.push(`/#${id}`);
  };

  return (
    <nav className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2">
      {user ? (
        <div className="flex items-center gap-0.5 px-2 py-1.5 rounded-full border border-border/50 bg-card/80 backdrop-blur-md shadow-sm">
          {[...createMenuItems, ...learnMenuItems, ...moreMenuItems].map(
            (item) => (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 rounded-full font-light ${
                        isActiveLink(item.href)
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="bg-popover border-border">
                  <p className="font-light text-foreground">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground font-light">
                    {item.description}
                  </p>
                </TooltipContent>
              </Tooltip>
            )
          )}
        </div>
      ) : (
        <div className="flex items-center gap-0.5 px-2 py-1.5 rounded-full border border-border/50 bg-card/80 backdrop-blur-md shadow-sm">
          {landingNavItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => handleLandingNav(item.id)}
              className="text-sm font-light text-foreground hover:bg-muted hover:text-foreground rounded-full h-8 px-4 transition-colors"
            >
              {item.label}
            </Button>
          ))}
        </div>
      )}
    </nav>
  );
};

export default DesktopNav;