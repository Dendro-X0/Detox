/// <reference types="chrome" />
import { useEffect, useState } from 'react';
import { DEFAULT_USER_RULES, type UserRulesSettings } from '../core/types/user-rules';
import { loadUserRules, saveUserRules } from '../core/rules/user-rules-store';
import { BOTHER_KEYWORD_MAP, type BotherCategory } from '../onboarding/types';

const TOPIC_PRESETS: readonly { readonly id: BotherCategory; readonly label: string }[] = [
    { id: 'outrage', label: 'Outrage' },
    { id: 'spam', label: 'Spam' },
    { id: 'hostile', label: 'Hostile' },
    { id: 'engagement-bait', label: 'Engagement bait' },
    { id: 'low-effort', label: 'Low effort' },
];

function parseBulkInput(value: string): readonly string[] {
    return value
        .split(/[\n,]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}

type RuleListEditorProps = {
    readonly title: string;
    readonly description: string;
    readonly values: readonly string[];
    readonly placeholder: string;
    readonly onChange: (next: readonly string[]) => void;
};

function RuleListEditor({ title, description, values, placeholder, onChange }: RuleListEditorProps) {
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
            <div className="stat-row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder={placeholder}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addDraft();
                        }
                    }}
                    style={{ flex: 1, padding: '0.35rem' }}
                />
                <button className="preset-btn" onClick={addDraft}>Add</button>
            </div>
            <ul className="blocked-list" style={{ maxHeight: '160px' }}>
                {values.length === 0 ? (
                    <li className="muted">No entries yet.</li>
                ) : (
                    values.map((value) => (
                        <li key={value} className="blocked-item">
                            <div className="blocked-header">
                                <span className="badge">{value}</span>
                            </div>
                            <button className="debug-toggle" onClick={() => removeValue(value)}>Remove</button>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}

export default function UserRulesPanel() {
    const [rules, setRules] = useState<UserRulesSettings>(DEFAULT_USER_RULES);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        void loadUserRules().then(setRules);
    }, []);

    const persist = async (next: UserRulesSettings): Promise<void> => {
        setRules(next);
        await saveUserRules(next);
        setStatus('Rules saved.');
        window.setTimeout(() => setStatus(null), 1500);
    };

    const addTopicPreset = (category: BotherCategory): void => {
        const additions = BOTHER_KEYWORD_MAP[category];
        const merged = [...new Set([...rules.blockKeywords, ...additions])];
        void persist({ ...rules, blockKeywords: merged });
    };

    return (
        <div className="card policy-card">
            <h3>Your Filtering Rules</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                Customize what gets filtered. Wizard choices seed these lists; you can refine them anytime.
            </p>

            <div className="preset-buttons" style={{ marginBottom: '1rem' }}>
                {TOPIC_PRESETS.map((preset) => (
                    <button key={preset.id} className="preset-btn" onClick={() => addTopicPreset(preset.id)}>
                        + {preset.label}
                    </button>
                ))}
            </div>

            <RuleListEditor
                title="Block keywords"
                description="Content containing these phrases is more likely to be filtered."
                values={rules.blockKeywords}
                placeholder="e.g. sponsored, clickbait"
                onChange={(blockKeywords) => { void persist({ ...rules, blockKeywords }); }}
            />

            <RuleListEditor
                title="Allow keywords"
                description="Content with these phrases is never filtered, even if it matches block rules."
                values={rules.allowKeywords}
                placeholder="e.g. important, breaking news"
                onChange={(allowKeywords) => { void persist({ ...rules, allowKeywords }); }}
            />

            <RuleListEditor
                title="Allowed domains"
                description="Filtering is paused on these sites (useful for work tools or email)."
                values={rules.allowDomains}
                placeholder="e.g. mail.google.com"
                onChange={(allowDomains) => { void persist({ ...rules, allowDomains }); }}
            />

            {status ? <p className="muted" style={{ marginBottom: 0 }}>{status}</p> : null}
        </div>
    );
}
