import { useState } from 'react';

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
}: RuleListEditorProps) {
    const [draft, setDraft] = useState('');

    const addDraft = (): void => {
        const additions = parseBulkInput(draft);
        if (additions.length === 0) return;
        onChange([...values, ...additions]);
        setDraft('');
    };

    const removeValue = (value: string): void => {
        onChange(values.filter((entry) => entry !== value));
    };

    return (
        <div className="rule-editor">
            <h4>{title}</h4>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>{description}</p>
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
                <button className="preset-btn" type="button" onClick={addDraft}>{addLabel}</button>
            </div>
            <ul className="blocked-list" style={{ maxHeight: '160px' }}>
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
        </div>
    );
}
