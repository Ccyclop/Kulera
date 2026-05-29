"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavbarSearch } from "@/components/navbar-search";

export function MobileSearchToggle() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, handleClose]);

  return (
    <>
      <motion.button
        type="button"
        onClick={handleOpen}
        aria-label="ძიება"
        aria-expanded={open}
        className="grid h-[42px] w-[42px] place-items-center rounded-[15px] border border-oat bg-surface text-ink"
        whileHover={{ y: -2, borderColor: "var(--clay)" }}
        whileTap={{ scale: 0.9 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      >
        <Search className="h-4 w-4" />
      </motion.button>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  className="fixed inset-0 z-[100] md:hidden"
                  role="dialog"
                  aria-modal="true"
                  aria-label="ძიება"
                >
                  <motion.button
                    type="button"
                    aria-label="დახურვა"
                    onClick={handleClose}
                    className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  />
                  <motion.div
                    className="absolute inset-x-0 top-0 flex flex-col gap-3 border-b border-oat bg-surface px-4 pb-5 pt-[max(env(safe-area-inset-top),12px)] shadow-panel"
                    initial={{ y: "-100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "-100%" }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-black uppercase tracking-wider text-muted">ძიება</span>
                      <button
                        type="button"
                        onClick={handleClose}
                        aria-label="დახურვა"
                        className="grid h-9 w-9 place-items-center rounded-[12px] border border-oat bg-surface text-ink"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <NavbarSearch />
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
