"use client";

import { useEffect } from "react";

const FAVICON_IDLE = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐣</text></svg>";
const FAVICON_ACTIVE = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐥</text></svg>";

export function FaviconManager() {
    useEffect(() => {
        const handleVisibilityChange = () => {
            const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.setAttribute("type", "image/svg+xml");
            link.setAttribute("rel", "icon");

            if (document.hidden) {
                link.setAttribute("href", FAVICON_IDLE);
            } else {
                link.setAttribute("href", FAVICON_ACTIVE);
            }

            // If it's a new element, append it
            if (!document.head.contains(link)) {
                document.head.appendChild(link);
            }
        };

        // Set initial state
        handleVisibilityChange();

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    return null;
}
