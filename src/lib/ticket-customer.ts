/**
 * The customer picked from search wins over whatever is still typed in the box.
 * "Khách Thử Một" must not be saved as the prefix "Khách Thử".
 */

export type TicketCustomerMode = "EXISTING" | "NEW" | "GUEST";

export type TicketCustomerChoice = {
    customerId: string | null;
    mode: TicketCustomerMode;
    name: string | null;
};

export function resolveTicketCustomer(input: {
    selectedCustomerId?: string | null;
    selectedCustomerName?: string | null;
    typedName?: string | null;
}): TicketCustomerChoice {
    const customerId = input.selectedCustomerId?.trim() || null;
    if (customerId) {
        const name = input.selectedCustomerName?.trim() || null;
        return { customerId, mode: "EXISTING", name };
    }
    const typed = input.typedName?.trim() || "";
    if (typed.length >= 2) return { customerId: null, mode: "NEW", name: typed };
    return { customerId: null, mode: "GUEST", name: null };
}

export function openSessionCustomerBody(choice: TicketCustomerChoice, phone?: string | null): {
    customerId: string | null;
    customer: { mode: TicketCustomerMode; id?: string; name?: string | null; phone?: string | null };
} {
    if (choice.mode === "EXISTING" && choice.customerId) {
        return {
            customerId: choice.customerId,
            customer: { mode: "EXISTING", id: choice.customerId, name: choice.name },
        };
    }
    if (choice.mode === "NEW" && choice.name) {
        return {
            customerId: null,
            customer: { mode: "NEW", name: choice.name, phone: phone?.trim() || null },
        };
    }
    return { customerId: null, customer: { mode: "GUEST" } };
}
