import type { Metadata } from "next";

/**
 * Shared metadata configuration for private/authenticated application routes.
 * Strictly prevents search engines from indexing private lake business data,
 * and eliminates improper canonical linking to the homepage.
 */
export const privateRouteMetadata: Metadata = {
    robots: {
        index: false,
        follow: false,
        nocache: true,
        noarchive: true,
    },
    alternates: {
        canonical: undefined,
    },
};
