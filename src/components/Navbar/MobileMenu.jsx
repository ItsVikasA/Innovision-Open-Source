"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

/**
 * Improved Mobile navigation menu component.
 */
const MobileMenu = ({
  isOpen,
  setIsOpen,
  user,
  createMenuItems,
  learnMenuItems,
  moreMenuItems,
  landingNavItems,
  isActiveLink,
}) => {
  const router = useRouter();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="md:hidden fixed inset-0 z-40"
        >
          {/* Overlay */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Mobile Menu Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 25,
            }}
            className="absolute right-0 top-16 bottom-0 w-[80%] max-w-sm border-l border-border bg-background/80 backdrop-blur-xl shadow-2xl overflow-y-auto"
          >
            <nav className="p-5 space-y-3">
              {user ? (
                <>
                  {/* Create Section */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em] px-2 mb-2">
                    Create
                  </p>

                  {createMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-light ${
                        isActiveLink(item.href)
                          ? "bg-muted text-foreground shadow-md"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:translate-x-1"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  ))}

                  {/* Learn Section */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em] px-2 mb-2 mt-6">
                    Learn
                  </p>

                  {learnMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-light ${
                        isActiveLink(item.href)
                          ? "bg-muted text-foreground shadow-md"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:translate-x-1"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  ))}

                  {/* More Section */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em] px-2 mb-2 mt-6">
                    More
                  </p>

                  {moreMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-light ${
                        isActiveLink(item.href)
                          ? "bg-muted text-foreground shadow-md"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:translate-x-1"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  ))}
                </>
              ) : (
                <>
                  {landingNavItems.map((item) => (
                    <button
                      key={item.id || item.href}
                      onClick={() => {
                        setIsOpen(false);

                        if (item.id) {
                          document
                            .getElementById(item.id)
                            ?.scrollIntoView({ behavior: "smooth" });
                        } else if (item.href) {
                          router.push(item.href);
                        }
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:translate-x-1 transition-all duration-200 w-full text-left font-light"
                    >
                      {item.label}
                    </button>
                  ))}
                </>
              )}
            </nav>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu;