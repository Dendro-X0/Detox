import { useMemo, useState } from 'react';

function parseBulkInput(value: string): readonly string[] {
    return value
        .split(/[\n,]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}

export type RuleListEditorProps = {
    readonly title: string;
    readonly description: string;
    readonly values: readonly string[];
    readonly placeholder: string;
    readonly onChange: (next: readonly string[]) => void;
    readonly addLabel: string;
    readonly removeLabel: string;
    readonly emptyLabel: string;
    readonly searchPlaceholder?: string;
    readonly variant?: 'chips' | 'legacy';
};

export default function RuleListEditor({
    title,
    description,
    values,
    placeholder,
    onChange,
    addLabel,
    removeLabel,
    emptyLabel,
    searchPlaceholder,
    variant = 'chips',
}: RuleListEditorProps) {
    const [draft, setDraft] = useState('');
    const [query, setQuery] = useState('');

    const addDraft = (): void => {
        const additions = parseBulkInput(draft);
        if (additions.length === 0) return;
        onChange([...new Set([...values, ...additions])]);
        setDraft('');
    };

    const removeValue = (value: string): void => {
        onChange(values.filter((entry) => entry !== value));
    };

    const filteredValues = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return values;
        return values.filter((value) => value.toLowerCase().includes(q));
    }, [query, values]);

    const showSearch = values.length >= 8 && searchPlaceholder;

    return (
        <div className="rule-editor">
            <h4>{title}</h4>
            <p className="muted sl-rule-editor-desc">{description}</p>
            <div className="sl-form-control-row">
                <input
                    type="text"
                    className="sl-input"
                    placeholder={placeholder}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addDraft();
                        }
                    }}
                />
                <button className="sl-btn-secondary" type="button" onClick={addDraft}>
                    {addLabel}
                </button>
            </div>

            {showSearch ? (
                <input
                    type="search"
                    className="sl-input sl-rule-search"
                    placeholder={searchPlaceholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            ) : null}

            {variant === 'legacy' ? (
                <ul className="blocked-list sl-scroll-region" style={{ maxHeight: '160px' }}>
                    {values.length === 0 ? (
                        <li className="muted">{emptyLabel}</li>
                    ) : (
                        values.map((value) => (
                            <li key={value} className="blocked-item">
                                <div className="blocked-header">
                                    <span className="badge">{value}</span>
                                </div>
                                <button className="debug-toggle" type="button" onClick={() => removeValue(value)}>
                                    {removeLabel}
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            ) : values.length === 0 ? (
                <p className="muted sl-rule-empty">{emptyLabel}</p>
            ) : (
                <div className="sl-rule-chip-panel sl-scroll-region">
                    <p className="sl-rule-chip-meta muted">
                        {filteredValues.length === values.length
                            ? `${values.length}`
                            : `${filteredValues.length} / ${values.length}`}
                    </p>
                    <ul className="sl-rule-chip-list">
                        {filteredValues.map((value) => (
                            <li key={value}>
                                <span className="sl-rule-chip">
                                    <span className="sl-rule-chip-label">{value}</span>
                                    <button
                                        type="button"
                                        className="sl-rule-chip-remove"
                                        onClick={() => removeValue(value)}
                                        aria-label={`${removeLabel}: ${value}`}
                                    >
                                        ×
                                    </button>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
