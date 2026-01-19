"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { ConfirmationModal } from "@/components/ConfirmationModal";

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'primary' | 'warning';
}

interface ConfirmationContextType {
    confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ message: "" });
    const [resolvePromise, setResolvePromise] = useState<(value: boolean) => void>(() => { });

    const confirm = useCallback((opts: ConfirmOptions | string) => {
        const finalOptions = typeof opts === 'string' ? { message: opts } : opts;

        // Default title if not provided
        if (!finalOptions.title) {
            finalOptions.title = "Xác nhận";
        }

        setOptions(finalOptions);
        setIsOpen(true);

        return new Promise<boolean>((resolve) => {
            setResolvePromise(() => resolve);
        });
    }, []);

    const handleConfirm = () => {
        resolvePromise(true);
        setIsOpen(false);
    };

    const handleCancel = () => {
        resolvePromise(false);
        setIsOpen(false);
    };

    return (
        <ConfirmationContext.Provider value={{ confirm }}>
            {children}
            <ConfirmationModal
                isOpen={isOpen}
                onClose={handleCancel}
                onConfirm={handleConfirm}
                title={options.title || "Xác nhận"}
                message={options.message}
                confirmText={options.confirmText}
                cancelText={options.cancelText}
                type={options.type}
            />
        </ConfirmationContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmationContext);
    if (context === undefined) {
        throw new Error("useConfirm must be used within a ConfirmationProvider");
    }
    return context.confirm;
}
