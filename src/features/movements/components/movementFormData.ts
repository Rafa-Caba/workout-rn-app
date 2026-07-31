// /src/features/movements/components/movementFormData.ts
// Builds the strongly typed multipart payload used to create/update movements.

import type { RNFile } from "@/src/types/upload.types";

import { assertSupportedMovementImage } from "./movementImageValidation";

export type MovementFormState = {
    name: string;
    muscleGroup: string[];
    equipment: string[];
    isActive: boolean;
    image: RNFile | null;
};

function appendRNFile(formData: FormData, field: string, file: RNFile): void {
    assertSupportedMovementImage(file);

    formData.append(field, {
        uri: file.uri,
        name: file.name,
        type: file.type,
    });
}

function appendStringArray(formData: FormData, field: string, values: string[]): void {
    values.forEach((value) => {
        const normalized = value.trim();
        if (!normalized) {
            return;
        }

        formData.append(field, normalized);
    });
}

export function buildMovementFormData(
    form: MovementFormState,
    opts?: {
        imageFieldName?: string;
    },
): FormData {
    const formData = new FormData();

    formData.append("name", form.name.trim());
    appendStringArray(formData, "muscleGroup", form.muscleGroup);
    appendStringArray(formData, "equipment", form.equipment);
    formData.append("isActive", String(form.isActive));

    const imageFieldName = opts?.imageFieldName ?? "media";
    if (form.image) {
        appendRNFile(formData, imageFieldName, form.image);
    }

    return formData;
}
