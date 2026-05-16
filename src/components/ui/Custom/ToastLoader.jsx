"use client";
import { Loader } from "lucide-react";
import { motion } from "framer-motion";
import { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
const LoaderContext = createContext();

const ToastLoader = () => {
    return (
        <div className="h-screen w-screen top-0 absolute z-20 bg-background/5 ">
            <motion.div
                initial={{ y: 0 }}
                animate={{ y: 60 }}
                className="p-2 bg-zinc-50 dark:bg-zinc-900 text-sm items-center shadow-md flex gap-2 border rounded-sm border-border z-20 absolute top-5 translate-x-[50%] right-[50%]"
            >
                <Loader className="animate-spin w-4"></Loader>
                Loading
            </motion.div>
        </div>
    );
};

export default function LoaderProvider({ children }) {
    const [loading, setLoading] = useState(false);
    const pathName = usePathname();
    const showLoader = () => {
        window.scrollTo(0, 0);
        document.documentElement.style.overflow = "hidden";
        setLoading(true);
    };
    const hideLoader = () => {
        document.documentElement.style.overflow = "auto";
        setLoading(false);
    };

    const handleGlobalLinkClick = (event) => {
        let target = event.target;
        const skipHashes = ["#features", "#how-it-works", "#faq"];

        while (target && target.tagName !== "A") {
            target = target.parentElement;
        }

        if (target && target.href) {
            const url = new URL(target.href);
            const hash = url.hash;

            if (
                target.href.includes(window.location.origin) &&
                target.href !== window.location.href &&
                !(hash && skipHashes.includes(hash))
            ) {
                showLoader();
            }
        }
    };

    useEffect(() => {
        hideLoader();
    }, [pathName]);

    useEffect(() => {
        document.addEventListener("click", handleGlobalLinkClick);
        return () =>
            document.removeEventListener("click", handleGlobalLinkClick);
    }, []);

    // When the browser restores the page from bfcache (e.g. pressing Back after
    // a full-page navigation to /terms or /privacy), the loading state is still
    // true and overflow is still hidden. The pageshow event with persisted=true
    // fires exactly in that scenario, so we reset the loader here.
    useEffect(() => {
        const handlePageShow = (event) => {
            if (event.persisted) {
                hideLoader();
            }
        };
        window.addEventListener("pageshow", handlePageShow);
        return () => window.removeEventListener("pageshow", handlePageShow);
    }, []);

    return (
        <LoaderContext.Provider value={{ showLoader, hideLoader }}>
            {loading && <ToastLoader />}
            {children}
        </LoaderContext.Provider>
    );
}

export const loader = () => useContext(LoaderContext);
