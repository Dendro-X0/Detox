type DashboardTabIntroProps = {
    readonly title: string;
    readonly description: string;
};

export default function DashboardTabIntro({ title, description }: DashboardTabIntroProps) {
    return (
        <div className="sl-tab-intro sl-span-full">
            <h2 className="sl-tab-intro-title">{title}</h2>
            <p className="muted sl-tab-intro-desc">{description}</p>
        </div>
    );
}
