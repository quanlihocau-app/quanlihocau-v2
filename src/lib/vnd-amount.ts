/**
 * Ticket, product, package and fish prices are stored as whole đồng (Int).
 * 32.500 is a real price. The input step is 1 đồng, not 1.000 and not 500.
 */

export const VND_INPUT_STEP = 1;

export const VND_INTEGER_MESSAGE = "Giá phải là số nguyên đồng (ví dụ 32.500).";

export function explainVndInputValidity(validity: { stepMismatch: boolean; badInput: boolean }): string {
    if (validity.stepMismatch || validity.badInput) return VND_INTEGER_MESSAGE;
    return "Giá không hợp lệ.";
}
