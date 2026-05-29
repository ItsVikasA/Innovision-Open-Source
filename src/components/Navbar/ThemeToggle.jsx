"use client";

import { Moon, Sun, MoonStar, BookOpen } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppTheme } from "@/contexts/theme";
import { useNightMode } from "@/contexts/nightMode";
import { cn } from "@/lib/utils";

export function ThemeMenuOptions() {
  const { theme, setColorTheme } = useAppTheme();
  const { nightMode, setReadingMode } = useNightMode();

  return (
    <>
      <DropdownMenuLabel className="text-xs font-light text-muted-foreground py-1">
        Appearance
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup value={theme} onValueChange={setColorTheme}>
        <DropdownMenuRadioItem value="light" className="gap-2 cursor-pointer">
          <Sun className="h-4 w-4 text-amber-500" />
          <span>Light</span>
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark" className="gap-2 cursor-pointer">
          <Moon className="h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem
        checked={nightMode}
        onCheckedChange={(checked) => setReadingMode(checked === true)}
        className="gap-2 cursor-pointer"
      >
        <BookOpen className="h-4 w-4 text-amber-500" />
        <span>Reading / Warm</span>
      </DropdownMenuCheckboxItem>
    </>
  );
}

export default function ThemeToggle({ className }) {
  const { isDark } = useAppTheme();
  const { nightMode } = useNightMode();
  const TriggerIcon = isDark ? Sun : Moon;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-muted text-foreground",
                  nightMode && "text-amber-400",
                  className
                )}
                aria-label="Theme settings"
              >
                <span className="relative flex items-center justify-center">
                  <TriggerIcon className={cn("h-4 w-4", nightMode && "scale-90")} />
                  {nightMode && (
                    <MoonStar
                      className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-amber-400 text-amber-400"
                      aria-hidden
                    />
                  )}
                </span>
              </Button>
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-background border-border">
          <p className="font-light text-foreground text-xs">Theme Settings</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" sideOffset={8} className="w-48 bg-background border-border">
        <ThemeMenuOptions />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
