// src/features/routines/components/RoutineMediaViewerModal.tsx
import { ResizeMode, Video } from "expo-av";
import React from "react";
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from "react-native";

export type RoutineMediaItem = {
    url: string;
    label?: string | null;
    resourceType: "image" | "video";
};

type Props = {
    visible: boolean;
    item: RoutineMediaItem | null;
    onClose: () => void;
};

function Button(props: { title: string; onPress: () => void }) {
    return (
        <Pressable
            onPress={props.onPress}
            style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
            }}
        >
            <Text style={{ fontWeight: "900" }}>{props.title}</Text>
        </Pressable>
    );
}

export function RoutineMediaViewerModal({ visible, item, onClose }: Props) {
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        setLoading(false);
    }, [item?.url]);

    if (!item) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={{ flex: 1, padding: 16, gap: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: "900" }}>Adjunto</Text>
                        {item.label ? <Text style={{ color: "#6B7280" }} numberOfLines={1}>{item.label}</Text> : null}
                    </View>
                    <Button title="Cerrar" onPress={onClose} />
                </View>

                <View style={{ flex: 1, borderWidth: 1, borderRadius: 14, overflow: "hidden" }}>
                    {loading ? (
                        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                            <ActivityIndicator />
                        </View>
                    ) : null}

                    {item.resourceType === "image" ? (
                        <Image
                            source={{ uri: item.url }}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="contain"
                            onLoadStart={() => setLoading(true)}
                            onLoadEnd={() => setLoading(false)}
                        />
                    ) : (
                        <Video
                            source={{ uri: item.url }}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode={ResizeMode.CONTAIN}
                            useNativeControls
                            shouldPlay={false}
                            onLoadStart={() => setLoading(true)}
                            onLoad={() => setLoading(false)}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}