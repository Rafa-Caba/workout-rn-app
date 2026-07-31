// /src/types/react-native-form-data.d.ts
// React Native accepts URI-backed file objects in FormData even though the
// standard DOM declaration only includes string and Blob values.

type ReactNativeFormDataFile = {
    uri: string;
    name: string;
    type: string;
};

interface FormData {
    append(name: string, value: string | Blob | ReactNativeFormDataFile, fileName?: string): void;
}
