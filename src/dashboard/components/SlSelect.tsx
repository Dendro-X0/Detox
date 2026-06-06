import { useEffect, useId, useRef, useState } from 'react';

export type SlSelectOption = {
    readonly value: string;
    readonly label: string;
};

type SlSelectProps = {
    readonly id?: string;
    readonly label?: string;
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly options: readonly SlSelectOption[];
    readonly placeholder?: string;
    readonly disabled?: boolean;
    readonly className?: string;
};

export default function SlSelect({
    id,
    label,
    value,
    onChange,
    options,
    placeholder = 'Select…',
    disabled = false,
    className = '',
}: SlSelectProps) {
    const generatedId = useId();
    const controlId = id ?? generatedId;
    const listboxId = `${controlId}-listbox`;
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    const selected = options.find((option) => option.value === value);
    const displayLabel = selected?.label ?? (value.trim() ? value : placeholder);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: MouseEvent): void => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const selectOption = (nextValue: string): void => {
        onChange(nextValue);
        setOpen(false);
    };

    return (
        <div className={`sl-select ${className}`.trim()} ref={rootRef}>
            {label ? (
                <span className="sl-form-label" id={`${controlId}-label`}>
                    {label}
                </span>
            ) : null}
            <button
                type="button"
                id={controlId}
                className={`sl-select-trigger${open ? ' is-open' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-labelledby={label ? `${controlId}-label` : undefined}
                aria-controls={listboxId}
                disabled={disabled}
                onClick={() => setOpen((current) => !current)}
            >
                <span className={`sl-select-value${selected || value.trim() ? '' : ' is-placeholder'}`}>
                    {displayLabel}
                </span>
                <span className="sl-select-chevron" aria-hidden />
            </button>
            {open ? (
                <ul
                    id={listboxId}
                    className="sl-select-menu sl-scroll-region"
                    role="listbox"
                    aria-labelledby={label ? `${controlId}-label` : controlId}
                >
                    {options.map((option) => {
                        const isSelected = option.value === value;
                        return (
                            <li key={option.value} role="presentation">
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    className={`sl-select-option${isSelected ? ' is-selected' : ''}`}
                                    onClick={() => selectOption(option.value)}
                                >
                                    {option.label}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </div>
    );
}
