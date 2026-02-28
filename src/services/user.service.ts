// /src/services/user.service.ts
import type { ProfilePicAsset } from "../store/user.store";
import type { AuthUser } from "../types/auth.types";
import type { UserProfileUpdateRequest } from "../types/user.types";
import { api } from "./http.client";

function guessFileName(uri: string): string {
    const clean = uri.split("?")[0];
    const last = clean.split("/").pop();
    if (last && last.trim().length > 0) return last;
    return `profile_${Date.now()}.jpg`;
}

function guessMimeType(uri: string): string {
    const clean = uri.split("?")[0].toLowerCase();
    if (clean.endsWith(".png")) return "image/png";
    if (clean.endsWith(".webp")) return "image/webp";
    if (clean.endsWith(".heic")) return "image/heic";
    if (clean.endsWith(".heif")) return "image/heif";
    return "image/jpeg";
}

export async function getMe(): Promise<AuthUser> {
    const res = await api.get("/users/me");
    return res.data as AuthUser;
}

export async function patchMe(payload: UserProfileUpdateRequest): Promise<AuthUser> {
    const res = await api.patch("/users/me", payload);
    return res.data as AuthUser;
}

export async function uploadMyProfilePic(file: ProfilePicAsset): Promise<AuthUser> {
    if (!file?.uri || typeof file.uri !== "string") {
        throw new Error("Invalid file uri");
    }

    const uri = file.uri;
    const name = file.name?.trim() && file.name.trim().length > 0 ? file.name.trim() : guessFileName(uri);
    const type = file.type?.trim() && file.type.trim().length > 0 ? file.type.trim() : guessMimeType(uri);

    const fd = new FormData();

    // React Native FormData file shape:
    // { uri, name, type }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fd.append("image", { uri, name, type } as any);

    // Do NOT set Content-Type manually in RN (boundary issues).
    const res = await api.post("/users/me/profile-pic", fd);

    return res.data as AuthUser;
}

export async function deleteMyProfilePic(): Promise<AuthUser> {
    const res = await api.delete("/users/me/profile-pic");
    return res.data as AuthUser;
}