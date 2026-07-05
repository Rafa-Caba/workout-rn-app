// /src/hooks/health/cardio/useCardioSessionMedia.ts

import * as React from "react";

import type {
    MediaViewerItem,
} from "@/src/features/components/media/MediaViewerModal";
import {
    deleteCardioSessionMedia,
    uploadCardioSessionMedia,
} from "@/src/services/health/cardio/cardioSessionMedia.service";
import type {
    WorkoutMediaItem,
    WorkoutSession,
} from "@/src/types/workoutDay.types";
import {
    buildCardioMediaViewerItem,
} from "@/src/utils/health/cardio/cardioSessionMedia.helpers";
import { pickMediaFiles } from "@/src/utils/media/pickMediaFiles";

type UseCardioSessionMediaArgs = {
    date: string;
    sessionId: string;
    session: WorkoutSession | null;
    onRefresh: () => Promise<WorkoutSession | null>;
};

type UseCardioSessionMediaResult = {
    uploading: boolean;
    deletingPublicId: string | null;
    error: string | null;

    viewerVisible: boolean;
    viewerItem: MediaViewerItem | null;

    openViewer: (item: WorkoutMediaItem) => void;
    closeViewer: () => void;

    pickAndUploadMedia: () => Promise<void>;
    deleteMediaItem: (item: WorkoutMediaItem) => Promise<void>;
};

function toErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

export function useCardioSessionMedia(
    args: UseCardioSessionMediaArgs
): UseCardioSessionMediaResult {
    const { date, sessionId, session, onRefresh } = args;

    const [uploading, setUploading] = React.useState<boolean>(false);
    const [deletingPublicId, setDeletingPublicId] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const [viewerVisible, setViewerVisible] = React.useState<boolean>(false);
    const [viewerItem, setViewerItem] = React.useState<MediaViewerItem | null>(null);

    const openViewer = React.useCallback(
        (item: WorkoutMediaItem) => {
            setViewerItem(buildCardioMediaViewerItem(item, session));
            setViewerVisible(true);
        },
        [session]
    );

    const closeViewer = React.useCallback(() => {
        setViewerVisible(false);
        setViewerItem(null);
    }, []);

    const pickAndUploadMedia = React.useCallback(async (): Promise<void> => {
        setError(null);
        setUploading(true);

        try {
            const files = await pickMediaFiles();

            if (files.length === 0) {
                return;
            }

            await uploadCardioSessionMedia({
                date,
                sessionId,
                files,
                returnMode: "session",
            });

            await onRefresh();
        } catch (errorValue: unknown) {
            setError(toErrorMessage(errorValue, "No se pudo subir la media de la sesión."));
            throw errorValue;
        } finally {
            setUploading(false);
        }
    }, [date, onRefresh, sessionId]);

    const deleteMediaItem = React.useCallback(
        async (item: WorkoutMediaItem): Promise<void> => {
            setError(null);
            setDeletingPublicId(item.publicId);

            try {
                await deleteCardioSessionMedia({
                    date,
                    sessionId,
                    publicId: item.publicId,
                    returnMode: "session",
                });

                await onRefresh();
            } catch (errorValue: unknown) {
                setError(toErrorMessage(errorValue, "No se pudo eliminar la media de la sesión."));
                throw errorValue;
            } finally {
                setDeletingPublicId(null);
            }
        },
        [date, onRefresh, sessionId]
    );

    return {
        uploading,
        deletingPublicId,
        error,
        viewerVisible,
        viewerItem,
        openViewer,
        closeViewer,
        pickAndUploadMedia,
        deleteMediaItem,
    };
}
