// Issue Categories and Department Routing Configuration

export interface IssueType {
    value: string;
    label: string;
    icon: string;
}

export interface IssueCategory {
    id: string;
    icon: string;
    label: string;
    department: string;
    officer: string;
    color: string;
    defaultPriority?: 'low' | 'medium' | 'high' | 'critical';
    issues: IssueType[];
}

export const ISSUE_CATEGORIES: IssueCategory[] = [
    {
        id: 'road_transport',
        icon: '🚧',
        label: 'Road & Transport',
        department: 'Roads & Buildings Department',
        officer: 'Ward Engineer',
        color: 'bg-orange-50 border-orange-200 hover:border-orange-400',
        issues: [
            { value: 'pothole', label: 'Pothole', icon: '🕳️' },
            { value: 'road_damage', label: 'Road Damage', icon: '🚧' },
            { value: 'broken_footpath', label: 'Broken Footpath', icon: '🚶' },
            { value: 'speed_breaker', label: 'Speed Breaker', icon: '⚠️' },
            { value: 'missing_signboard', label: 'Missing Signboard', icon: '🪧' },
        ]
    },
    {
        id: 'sanitation',
        icon: '🗑️',
        label: 'Sanitation & Waste',
        department: 'Municipal Sanitation Department',
        officer: 'Waste Management Officer',
        color: 'bg-green-50 border-green-200 hover:border-green-400',
        issues: [
            { value: 'garbage', label: 'Garbage Dump', icon: '🗑️' },
            { value: 'illegal_dumping', label: 'Illegal Dumping', icon: '🚯' },
            { value: 'dead_animal', label: 'Dead Animal', icon: '🐕' },
            { value: 'public_toilet', label: 'Public Toilet', icon: '🚻' },
        ]
    },
    {
        id: 'electricity',
        icon: '💡',
        label: 'Electricity & Lights',
        department: 'Electricity Department',
        officer: 'Power Utility Office',
        color: 'bg-yellow-50 border-yellow-200 hover:border-yellow-400',
        issues: [
            { value: 'streetlight', label: 'Streetlight', icon: '💡' },
            { value: 'power_outage', label: 'Power Outage', icon: '⚡' },
            { value: 'loose_wires', label: 'Loose Wires', icon: '🔌' },
            { value: 'transformer_fault', label: 'Transformer Fault', icon: '🔋' },
        ]
    },
    {
        id: 'water_drainage',
        icon: '🚰',
        label: 'Water & Drainage',
        department: 'Water Supply & Sewerage Board',
        officer: 'Drainage Maintenance Dept',
        color: 'bg-blue-50 border-blue-200 hover:border-blue-400',
        issues: [
            { value: 'drainage', label: 'Blocked Drainage', icon: '🌊' },
            { value: 'water_leak', label: 'Water Leak', icon: '💧' },
            { value: 'sewer_overflow', label: 'Sewer Overflow', icon: '🚰' },
            { value: 'flooding', label: 'Flooding', icon: '🌧️' },
        ]
    },
    {
        id: 'environment',
        icon: '🌳',
        label: 'Environment & Parks',
        department: 'Parks & Environment Department',
        officer: 'Municipal Estate Office',
        color: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
        issues: [
            { value: 'fallen_tree', label: 'Fallen Tree', icon: '🌳' },
            { value: 'park_damage', label: 'Park Damage', icon: '🏞️' },
            { value: 'tree_cutting', label: 'Illegal Tree Cutting', icon: '🪓' },
            { value: 'encroachment', label: 'Encroachment', icon: '🏗️' },
        ]
    },
    {
        id: 'traffic',
        icon: '🚦',
        label: 'Traffic & Safety',
        department: 'Traffic Police Department',
        officer: 'Urban Transport Authority',
        color: 'bg-purple-50 border-purple-200 hover:border-purple-400',
        issues: [
            { value: 'traffic_signal', label: 'Traffic Signal', icon: '🚦' },
            { value: 'parking_violation', label: 'Parking Violation', icon: '🅿️' },
            { value: 'accident_prone', label: 'Accident Prone Zone', icon: '⚠️' },
        ]
    },
    {
        id: 'emergency',
        icon: '⚠️',
        label: 'Emergency / High Risk',
        department: 'Emergency Services',
        officer: 'Disaster Management Authority',
        color: 'bg-red-50 border-red-300 hover:border-red-500',
        defaultPriority: 'critical',
        issues: [
            { value: 'fire_hazard', label: 'Fire Hazard', icon: '🔥' },
            { value: 'gas_leak', label: 'Gas Leak', icon: '💨' },
            { value: 'building_collapse', label: 'Building Collapse', icon: '🏚️' },
        ]
    },
];

// Helper functions
export function getCategoryById(categoryId: string): IssueCategory | undefined {
    return ISSUE_CATEGORIES.find(cat => cat.id === categoryId);
}

export function getCategoryByIssue(issueValue: string): IssueCategory | undefined {
    return ISSUE_CATEGORIES.find(cat => cat.issues.some(issue => issue.value === issueValue));
}

export function getIssueDetails(issueValue: string): { issue: IssueType; category: IssueCategory } | undefined {
    for (const category of ISSUE_CATEGORIES) {
        const issue = category.issues.find(i => i.value === issueValue);
        if (issue) return { issue, category };
    }
    return undefined;
}

export function getDepartmentForIssue(issueValue: string): string | undefined {
    return getCategoryByIssue(issueValue)?.department;
}

export function getOfficerForIssue(issueValue: string): string | undefined {
    return getCategoryByIssue(issueValue)?.officer;
}

export function getAllIssueTypes(): IssueType[] {
    return ISSUE_CATEGORIES.flatMap(cat => cat.issues);
}

export function isEmergencyIssue(issueValue: string): boolean {
    const category = getCategoryByIssue(issueValue);
    return category?.id === 'emergency';
}
