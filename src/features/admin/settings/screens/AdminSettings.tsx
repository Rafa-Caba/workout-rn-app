// src/features/admin/settings/screens/AdminSettings.tsx
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";

import { MediaViewerModal, type MediaViewerItem } from "@/src/features/components/media/MediaViewerModal";
import { useAdminSettings } from "@/src/hooks/admin/useAdminSettings";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { AdminSettingsPalette, AdminSettingsThemeMode } from "@/src/types/adminSettings.types";
import type { RNFile } from "@/src/types/upload.types";

import { formatWeirdUsDateTime } from "@/src/utils/dates/formatWeirdDate";
import { AppSettingsSelectModal } from "../components/AppSettingsSelectModal";
import { AppSettingsSelectRow } from "../components/AppSettingsSelectRow";

function formatLastLoaded(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
}

function paletteLabel(p: AdminSettingsPalette): string {
    return p.charAt(0).toUpperCase() + p.slice(1);
}

function modeLabel(m: AdminSettingsThemeMode): string {
    if (m === "light") return "Claro";
    if (m === "dark") return "Oscuro";
    return "Sistema";
}

function guessNameFromUri(uri: string): string {
    const clean = uri.split("?")[0];
    const last = clean.split("/").pop();
    return last && last.trim() ? last : `logo_${Date.now()}.jpg`;
}

function guessMimeFromUri(uri: string): string {
    const clean = uri.split("?")[0].toLowerCase();
    if (clean.endsWith(".png")) return "image/png";
    if (clean.endsWith(".webp")) return "image/webp";
    if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg";
    if (clean.endsWith(".heic")) return "image/heic";
    if (clean.endsWith(".heif")) return "image/heif";
    return "image/jpeg";
}

export default function AdminSettings() {
    const { colors } = useTheme();

    const {
        draft,
        loading,
        saving,
        uploadingLogo,
        error,
        lastLoadedAt,
        load,
        setDraft,
        resetDraftFromSettings,
        saveJson,
        uploadLogo,
    } = useAdminSettings(true);

    const [modeOpen, setModeOpen] = React.useState(false);
    const [paletteOpen, setPaletteOpen] = React.useState(false);

    const [viewer, setViewer] = React.useState<MediaViewerItem | null>(null);

    const busy = loading || saving || uploadingLogo;

    const logoUrl = (draft.appLogoUrl ?? "").trim() || null;

    const onRefresh = async () => {
        await load();
    };

    const onOpenLogoViewer = () => {
        if (!logoUrl) return;

        setViewer({
            url: logoUrl,
            resourceType: "image",
            title: "Logo de la app",
            subtitle: draft.appName?.trim() ? draft.appName.trim() : null,
            metaRows: [
                { label: "Tema por defecto", value: modeLabel(draft.themeMode) },
                { label: "Paleta por defecto", value: paletteLabel(draft.themePalette) },
            ],
        });
    };

    const onPickLogo = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería para seleccionar un logo.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
        });

        if (result.canceled) return;

        const asset = result.assets[0];
        const uri = asset.uri;

        const file: RNFile = {
            uri,
            name: guessNameFromUri(uri),
            type: asset.mimeType ?? guessMimeFromUri(uri),
            size: typeof asset.fileSize === "number" ? asset.fileSize : null,
        };

        const ok = await uploadLogo(file);
        if (!ok) {
            Alert.alert("Error", "No se pudo subir el logo.");
            return;
        }

        Alert.alert("Listo", "Logo actualizado ✅");
    };

    const onSave = async () => {
        if (draft.appName.trim().length < 2) {
            Alert.alert("Validación", "El nombre de la app debe tener al menos 2 caracteres.");
            return;
        }

        const ok = await saveJson();
        if (!ok) {
            Alert.alert("Error", "No se pudieron guardar los ajustes.");
            return;
        }

        Alert.alert("Listo", "Ajustes guardados ✅");
    };

    return (
        <>
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
                keyboardShouldPersistTaps="handled"
            >
                <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Ajustes de la app</Text>
                    <Text style={{ color: colors.mutedText }}>Configura nombre, logo, tema y depuración.</Text>
                </View>

                {error ? (
                    <View
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                            borderRadius: 16,
                            padding: 12,
                            gap: 6,
                        }}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text }}>Nota</Text>
                        <Text style={{ color: colors.mutedText }}>{error}</Text>
                    </View>
                ) : null}

                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        padding: 14,
                        gap: 12,
                    }}
                >
                    <View style={{ gap: 6 }}>
                        <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>Nombre de la app</Text>
                        <TextInput
                            value={draft.appName}
                            onChangeText={(v) => setDraft({ appName: v })}
                            placeholder="Workout Tracker"
                            placeholderTextColor={colors.mutedText}
                            editable={!busy}
                            style={{
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 12,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                color: colors.text,
                                backgroundColor: colors.background,
                                fontWeight: "700",
                            }}
                        />
                    </View>

                    <View style={{ gap: 6 }}>
                        <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>Subtítulo</Text>
                        <TextInput
                            value={draft.appSubtitle ?? ""}
                            onChangeText={(v) => setDraft({ appSubtitle: v.trim().length ? v : null })}
                            placeholder="Ej. Tu semana en datos reales"
                            placeholderTextColor={colors.mutedText}
                            editable={!busy}
                            style={{
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 12,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                color: colors.text,
                                backgroundColor: colors.background,
                                fontWeight: "700",
                            }}
                        />
                    </View>

                    <View
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 14,
                            padding: 12,
                            backgroundColor: colors.background,
                            gap: 8,
                        }}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text }}>Depuración JSON</Text>

                        <Pressable
                            onPress={() => setDraft({ debugShowJson: !draft.debugShowJson })}
                            disabled={busy}
                            style={({ pressed }) => ({
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                paddingVertical: 10,
                                paddingHorizontal: 12,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: pressed ? colors.surface : colors.background,
                                opacity: busy ? 0.6 : pressed ? 0.92 : 1,
                            })}
                        >
                            <Text style={{ fontWeight: "800", color: colors.text }}>Mostrar secciones JSON</Text>
                            <Text style={{ fontWeight: "800", color: draft.debugShowJson ? colors.primary : colors.mutedText }}>
                                {draft.debugShowJson ? "Sí" : "No"}
                            </Text>
                        </Pressable>

                        <Text style={{ color: colors.mutedText, fontSize: 12 }}>Afecta sólo a vistas administrativas.</Text>
                    </View>

                    <AppSettingsSelectRow
                        label="Tema por defecto"
                        valueLabel={modeLabel(draft.themeMode)}
                        onPress={() => setModeOpen(true)}
                    />

                    <AppSettingsSelectRow
                        label="Paleta por defecto"
                        valueLabel={paletteLabel(draft.themePalette)}
                        onPress={() => setPaletteOpen(true)}
                    />

                    {/* Logo */}
                    <View
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 14,
                            padding: 12,
                            backgroundColor: colors.background,
                            gap: 10,
                        }}
                    >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                            <View style={{ flex: 1, gap: 2 }}>
                                <Text style={{ fontWeight: "800", color: colors.text }}>Logo de la app</Text>
                                <Text style={{ color: colors.mutedText, fontSize: 12 }}>PNG/JPG/WEBP/HEIC hasta 1,024px aprox.</Text>
                            </View>

                            <Pressable
                                onPress={onPickLogo}
                                disabled={busy}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 12,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: pressed ? colors.surface : colors.background,
                                    opacity: busy ? 0.6 : pressed ? 0.92 : 1,
                                })}
                            >
                                <Text style={{ fontWeight: "800", color: colors.text }}>
                                    {uploadingLogo ? "Subiendo..." : "Seleccionar logo"}
                                </Text>
                            </Pressable>
                        </View>

                        {/* Thumbnail */}
                        {logoUrl ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                <Pressable
                                    onPress={onOpenLogoViewer}
                                    style={({ pressed }) => ({
                                        height: 64,
                                        width: 64,
                                        borderRadius: 14,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        backgroundColor: colors.surface,
                                        overflow: "hidden",
                                        opacity: pressed ? 0.92 : 1,
                                    })}
                                >
                                    <Image
                                        source={{ uri: logoUrl }}
                                        style={{ width: "100%", height: "100%" }}
                                        resizeMode="cover"
                                    />
                                </Pressable>

                                <View style={{ flex: 1, gap: 2 }}>
                                    <Text style={{ color: colors.text, fontWeight: "800" }}>Logo configurado ✅</Text>
                                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                                        Toca el thumbnail para verlo en grande.
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <Text style={{ color: colors.mutedText }}>No hay logo configurado todavía.</Text>
                        )}
                    </View>

                    <View style={{ flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                            <Pressable
                                onPress={resetDraftFromSettings}
                                disabled={busy}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 12,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: pressed ? colors.background : colors.surface,
                                    opacity: busy ? 0.6 : pressed ? 0.92 : 1,
                                })}
                            >
                                <Text style={{ fontWeight: "800", color: colors.text }}>Revertir</Text>
                            </Pressable>

                            <Pressable
                                onPress={onSave}
                                disabled={busy}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    backgroundColor: colors.primary,
                                    opacity: busy ? 0.6 : pressed ? 0.92 : 1,
                                })}
                            >
                                <Text style={{ color: colors.primaryText, fontWeight: "800" }}>
                                    {saving ? "Guardando..." : "Guardar ajustes"}
                                </Text>
                            </Pressable>
                        </View>

                        <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                            Última actualización: {formatWeirdUsDateTime(formatLastLoaded(lastLoadedAt))}
                        </Text>
                    </View>

                    {busy && loading ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <ActivityIndicator size="small" />
                            <Text style={{ color: colors.mutedText, fontSize: 12 }}>Sincronizando...</Text>
                        </View>
                    ) : null}
                </View>

                <AppSettingsSelectModal<AdminSettingsThemeMode>
                    visible={modeOpen}
                    title="Tema por defecto"
                    value={draft.themeMode}
                    onClose={() => setModeOpen(false)}
                    onSelect={(v) => {
                        setDraft({ themeMode: v });
                        setModeOpen(false);
                    }}
                    options={[
                        { label: "Sistema", value: "system" },
                        { label: "Claro", value: "light" },
                        { label: "Oscuro", value: "dark" },
                    ]}
                />

                <AppSettingsSelectModal<AdminSettingsPalette>
                    visible={paletteOpen}
                    title="Paleta por defecto"
                    value={draft.themePalette}
                    onClose={() => setPaletteOpen(false)}
                    onSelect={(v) => {
                        setDraft({ themePalette: v });
                        setPaletteOpen(false);
                    }}
                    options={[
                        { label: "Neutral", value: "neutral" },
                        { label: "Blue", value: "blue" },
                        { label: "Emerald", value: "emerald" },
                        { label: "Violet", value: "violet" },
                        { label: "Red", value: "red" },
                        { label: "Mint", value: "mint" },
                    ]}
                />
            </ScrollView>

            <MediaViewerModal visible={!!viewer} item={viewer} onClose={() => setViewer(null)} />
        </>
    );
}