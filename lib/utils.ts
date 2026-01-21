/**
 * Simple utility to merge class names conditionally
 */
export function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(" ");
}

/**
 * Copy text to clipboard and trigger callback
 */
export async function copyToClipboard(text: string, onSuccess?: () => void) {
    try {
        await navigator.clipboard.writeText(text);
        if (onSuccess) onSuccess();
    } catch (err) {
        console.error("Failed to copy:", err);
        alert("Không thể copy. Vui lòng chọn và copy thủ công.");
    }
}
