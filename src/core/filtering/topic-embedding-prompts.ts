import type { TopicId } from './topic-types';

/**
 * Prototype sentences per topic for D1 centroid embeddings.
 * Short, headline-like phrasing helps match BBC/Reddit units.
 */
export const TOPIC_EMBEDDING_PROMPTS: Readonly<Record<TopicId, readonly string[]>> = {
    'world-affairs': [
        'International diplomacy and relations between countries',
        'War, conflict, and military operations abroad',
        'Foreign elections and geopolitical tensions between nations',
        'United Nations sanctions and global humanitarian crises',
        'Cross-border disputes and alliance pressure on governments',
        'Nation holds election amid foreign pressure and alliance tensions',
        'Visa dispute between countries over international sporting event',
        'Currency crisis at international economic forum abroad',
        'Diplomatic row between governments over border or migration policy',
    ],
    'domestic-politics': [
        'National government policy and parliamentary debate',
        'Domestic elections, voting, and ballot counts',
        'Prime minister and congress legislation at home',
        'Local political parties and national policy fights',
        'Manhunt and shooting investigation after festival violence domestically',
        'State legislature votes on budget and domestic policy',
        'Election results in swing districts and ballot counts',
    ],
    tech: [
        'Software development tools, APIs, and programming',
        'Technology products, startups, and developer platforms',
        'Computer hardware, CLI tools, and virtual machines',
        'Open source releases and machine learning systems',
        'IDE, database, and cloud infrastructure news',
    ],
    music: [
        'Music albums, artists, and concert announcements',
        'Streaming playlists, vinyl releases, and tracklists',
        'Symphony series and opera performances',
        'Grammy nominations and live music festivals',
    ],
    'culture-arts': [
        'Film, theater, opera, and cultural reviews',
        'Books, exhibitions, and museum programming',
        'Celebrated performers and artistic staging',
        'James Bond, cinema, and arts criticism',
    ],
    business: [
        'Corporate earnings, markets, and quarterly results',
        'CEO interviews and company strategy',
        'Stock markets, IPOs, and startup funding',
        'Dynamic pricing and consumer business trends',
    ],
    'health-science': [
        'Medical research, clinical trials, and public health',
        'Peer-reviewed science and vaccine studies',
        'Patient treatment and hypertension clinical care',
        'Climate science and environmental research findings',
    ],
    sports: [
        'Sports matches, leagues, and championship games',
        'Olympic tournaments and World Cup events',
        'Team scores, coaches, and playoff results',
        'Athletic competitions and tournament schedules',
    ],
};
