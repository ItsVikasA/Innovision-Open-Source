"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";

/**
 * Desktop navigation component for logged-in users and landing page.
 */
const DesktopNav = ({
  user,
  createMenuItems,
  learnMenuItems,
  moreMenuItems,
  landingNavItems,
  isActiveLink,
}) => {
  return (
    <nav className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2">
      {user ? (
        // Logged in users - show ALL 11 nav items with icons only
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-[#060816]/75 backdrop-blur-md shadow-lg">
          {[...createMenuItems, ...learnMenuItems, ...moreMenuItems].map((item) => {
            const active = isActiveLink(item.href);
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href} className="relative flex items-center justify-center p-0.5">
                    {active && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 bg-gradient-to-r from-[#5865F2]/20 to-[#EC4899]/20 rounded-full border border-[#5865F2]/30"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 rounded-full font-light relative z-10 hover:scale-110 active:scale-95 transition-all bg-transparent hover:bg-transparent shadow-none hover:shadow-none ${active ? 'text-[#22D3EE]' : 'text-gray-300 hover:text-white'}`}
                    >
                      <item.icon className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="bg-[#0a0c1e] border border-white/10">
                  <p className="font-medium text-white">{item.label}</p>
                  <p className="text-xs text-gray-400 font-light">{item.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      ) : (
        // Landing page nav - pill style buttons with text
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/10 bg-[#060816]/75 backdrop-blur-md shadow-lg">
          {landingNavItems.map((item) => (
            <Button
              key={item.id || item.href}
              variant="ghost"
              size="sm"
              asChild={!!item.href}
              onClick={() => {
                if (item.id) {
                  document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="text-sm font-light text-gray-300 hover:text-[#22D3EE] hover:bg-white/5 rounded-full h-8 px-4 transition-all bg-transparent shadow-none hover:shadow-none"
            >
              {item.href ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span className="cursor-pointer">{item.label}</span>
              )}
            </Button>
          ))}
        </div>
      )}
    </nav>
  );
};

export default DesktopNav;
