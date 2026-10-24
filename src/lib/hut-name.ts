/** Case-insensitive, trimmed name of a seat in one lake. No database import. */

export const DUPLICATE_HUT_MESSAGE = "Ô câu này đã có trong hồ. Hãy đặt tên khác.";

export function normalizeHutName(name: string): string {
    return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

export function duplicateHutName(
    name: string,
    existing: Array<{ name: string }>,
): boolean {
    const key = normalizeHutName(name);
    if (key.length < 2) return false;
    return existing.some((hut) => normalizeHutName(hut.name) === key);
}
