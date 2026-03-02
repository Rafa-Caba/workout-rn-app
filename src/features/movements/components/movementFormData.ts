// src/features/movements/components/movementFormData.ts
import type { RNFile } from "@/src/types/upload.types";

export type MovementFormState = {
    name: string;
    muscleGroup: string | null;
    equipment: string | null;
    isActive: boolean;
    image: RNFile | null;
};

function appendRNFile(fd: FormData, field: string, file: RNFile): void {
    // RN multipart object (uri/name/type). TS DOM types don't model it well.
    fd.append(field, { uri: file.uri, name: file.name, type: file.type } as never);
}

export function buildMovementFormData(
    form: MovementFormState,
    opts?: {
        imageFieldName?: string;
    }
): FormData {
    const fd = new FormData();

    fd.append("name", form.name.trim());
    fd.append("muscleGroup", form.muscleGroup ?? "");
    fd.append("equipment", form.equipment ?? "");
    fd.append("isActive", String(form.isActive));

    const imageFieldName = opts?.imageFieldName ?? "media";
    if (form.image) appendRNFile(fd, imageFieldName, form.image);

    return fd;
}