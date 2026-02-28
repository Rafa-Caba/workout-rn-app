// src/features/components/topbar/TopBarMenus.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";

import { useAuthStore } from "@/src/store/auth.store";
import { useTheme } from "@/src/theme/ThemeProvider";
import { PALETTES, type Palette } from "@/src/theme/presets";

type MciName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

function IconButton(props: {
    icon: MciName;
    onPress: () => void;
    ariaLabel: string;
    disabled?: boolean;
}) {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={props.disabled ? undefined : props.onPress}
            accessibilityLabel={props.ariaLabel}
            style={({ pressed }) => ({
                height: 44,
                width: 44,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: pressed ? colors.background : colors.surface,
                alignItems: "center",
                justifyContent: "center",
                opacity: props.disabled ? 0.6 : pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
        >
            <MaterialCommunityIcons name={props.icon} size={20} color={colors.text} />
        </Pressable>
    );
}

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/g).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    const out = `${a}${b}`.toUpperCase();
    return out || "U";
}

function MenuCard(props: { title?: string; children: React.ReactNode }) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                width: 300,
                maxWidth: "92%",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                backgroundColor: colors.surface,
                overflow: "hidden",
            }}
        >
            {props.title ? (
                <View
                    style={{
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                    }}
                >
                    <Text style={{ fontWeight: "900", color: colors.text, fontSize: 16 }}>{props.title}</Text>
                </View>
            ) : null}

            <View style={{ padding: 10, gap: 8 }}>{props.children}</View>
        </View>
    );
}

function MenuItem(props: {
    leftIcon?: MciName;
    title: string;
    rightText?: string | null;
    onPress: () => void;
    danger?: boolean;
}) {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={props.onPress}
            style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: pressed ? colors.surface : colors.background,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                opacity: pressed ? 0.95 : 1,
            })}
        >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                {props.leftIcon ? (
                    <MaterialCommunityIcons
                        name={props.leftIcon}
                        size={18}
                        color={props.danger ? "#EF4444" : colors.text}
                    />
                ) : null}
                <Text style={{ fontWeight: "900", color: props.danger ? "#EF4444" : colors.text, flex: 1 }}>
                    {props.title}
                </Text>
            </View>

            {props.rightText ? (
                <Text style={{ color: colors.mutedText, fontWeight: "800" }}>{props.rightText}</Text>
            ) : null}
        </Pressable>
    );
}

function Divider() {
    const { colors } = useTheme();
    return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6 }} />;
}

function PreferencesMenu(props: { visible: boolean; onClose: () => void }) {
    const { mode, palette, setMode, setPalette, colors } = useTheme();

    const toggleMode = () => {
        setMode(mode === "dark" ? "light" : "dark");
        props.onClose();
    };

    const selectPalette = (p: Palette) => {
        setPalette(p);
        props.onClose();
    };

    return (
        <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
            <Pressable
                onPress={props.onClose}
                style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.18)", justifyContent: "flex-start" }}
            >
                <Pressable onPress={() => undefined} style={{ alignSelf: "flex-end", marginTop: 64, marginRight: 12 }}>
                    <MenuCard title="Preferencias">
                        <MenuItem
                            leftIcon={mode === "dark" ? "moon-waning-crescent" : "white-balance-sunny"}
                            title="Cambiar claro/oscuro"
                            rightText={String(mode ?? "system")}
                            onPress={toggleMode}
                        />

                        <Divider />

                        <Text style={{ fontWeight: "900", color: colors.text, paddingHorizontal: 6, paddingTop: 4 }}>
                            Paleta
                        </Text>

                        <View style={{ gap: 8 }}>
                            {PALETTES.map((p) => {
                                const selected = palette === p.value;
                                return (
                                    <Pressable
                                        key={p.value}
                                        onPress={() => selectPalette(p.value)}
                                        style={({ pressed }) => ({
                                            paddingHorizontal: 12,
                                            paddingVertical: 12,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            backgroundColor: pressed ? colors.surface : colors.background,
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            opacity: pressed ? 0.95 : 1,
                                        })}
                                    >
                                        <Text style={{ fontWeight: "900", color: colors.text }}>{p.label}</Text>
                                        {selected ? (
                                            <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                                        ) : null}
                                    </Pressable>
                                );
                            })}
                        </View>
                    </MenuCard>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

function ProfileMenu(props: { visible: boolean; onClose: () => void }) {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);

    const go = (href: string) => {
        props.onClose();
        router.push(href as any);
    };

    const onLogout = async () => {
        try {
            await logout();
        } finally {
            props.onClose();
            router.replace("/(auth)/login");
        }
    };

    return (
        <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
            <Pressable
                onPress={props.onClose}
                style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.18)", justifyContent: "flex-start" }}
            >
                <Pressable onPress={() => undefined} style={{ alignSelf: "flex-end", marginTop: 64, marginRight: 12 }}>
                    <MenuCard title={user?.name ?? "Cuenta"}>
                        <MenuItem leftIcon="account-circle-outline" title="Mi Perfil" onPress={() => go("/(app)/me")} />
                        <MenuItem leftIcon="cog-outline" title="Ajustes" onPress={() => go("/(app)/settings")} />

                        <Divider />

                        <MenuItem leftIcon="logout" title="Cerrar sesión" onPress={onLogout} danger />
                    </MenuCard>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

export function TopBarMenus() {
    const { colors } = useTheme();
    const user = useAuthStore((s) => s.user);

    const [showPrefs, setShowPrefs] = React.useState(false);
    const [showProfile, setShowProfile] = React.useState(false);

    const avatarUrl = String((user as any)?.profilePicUrl ?? "").trim() || null;
    const initials = initialsFromName(String(user?.name ?? "").trim() || "User");

    return (
        <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 5 }}>
                <IconButton icon="cog-outline" ariaLabel="Preferencias" onPress={() => setShowPrefs(true)} />

                <Pressable
                    onPress={() => setShowProfile(true)}
                    style={({ pressed }) => ({
                        height: 48,
                        width: 48,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: pressed ? colors.background : colors.surface,
                        overflow: "hidden",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: pressed ? 0.8 : 1,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                    })}
                >
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={{ height: "100%", width: "100%" }} resizeMode="cover" />
                    ) : (
                        <Text style={{ fontWeight: "900", color: colors.mutedText }}>{initials}</Text>
                    )}
                </Pressable>
            </View>

            <PreferencesMenu visible={showPrefs} onClose={() => setShowPrefs(false)} />
            <ProfileMenu visible={showProfile} onClose={() => setShowProfile(false)} />
        </>
    );
}