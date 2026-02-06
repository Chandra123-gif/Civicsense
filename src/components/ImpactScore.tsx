import { TrendingUp, Zap, AlertTriangle, Clock, Target } from 'lucide-react';
import { Priority } from '../lib/database.types';

interface ImpactScoreProps {
    priorityScore: number | null;
    priority: Priority;
    aiConfidence: number;
    escalationLevel?: number;
    compact?: boolean;
}

export default function ImpactScore({
    priorityScore,
    priority,
    aiConfidence,
    escalationLevel = 0,
    compact = false,
}: ImpactScoreProps) {
    // Calculate overall impact (0-100)
    const baseScore = priorityScore ? priorityScore * 100 : 50;
    const priorityMultiplier = { low: 0.5, medium: 1, high: 1.5, critical: 2 }[priority];
    const escalationBonus = escalationLevel * 10;
    const impactScore = Math.min(100, Math.round(baseScore * priorityMultiplier + escalationBonus));

    const getImpactLevel = (score: number) => {
        if (score >= 80) return { label: 'Critical', color: 'text-red-600', bg: 'bg-red-100', gradient: 'from-red-500 to-red-600' };
        if (score >= 60) return { label: 'High', color: 'text-orange-600', bg: 'bg-orange-100', gradient: 'from-orange-500 to-orange-600' };
        if (score >= 40) return { label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100', gradient: 'from-yellow-500 to-yellow-600' };
        return { label: 'Low', color: 'text-green-600', bg: 'bg-green-100', gradient: 'from-green-500 to-green-600' };
    };

    const impactLevel = getImpactLevel(impactScore);

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${impactLevel.bg} flex items-center justify-center`}>
                    <Zap className={`w-4 h-4 ${impactLevel.color}`} />
                </div>
                <div>
                    <div className="text-sm font-bold text-gray-900">{impactScore}</div>
                    <div className={`text-[10px] font-medium ${impactLevel.color}`}>{impactLevel.label}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    Impact Score
                </h4>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${impactLevel.bg} ${impactLevel.color}`}>
                    {impactLevel.label} Priority
                </span>
            </div>

            {/* Main Score */}
            <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                    <svg className="w-20 h-20 transform -rotate-90">
                        <circle cx="40" cy="40" r="35" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                        <circle
                            cx="40"
                            cy="40"
                            r="35"
                            fill="none"
                            stroke="url(#scoreGradient)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={`${(impactScore / 100) * 220} 220`}
                            className="transition-all duration-1000"
                        />
                        <defs>
                            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-900">{impactScore}</span>
                    </div>
                </div>

                <div className="flex-1 space-y-2">
                    <ScoreFactor
                        label="AI Confidence"
                        value={Math.round(aiConfidence * 100)}
                        icon={<Zap className="w-3 h-3 text-purple-500" />}
                    />
                    <ScoreFactor
                        label="Priority Weight"
                        value={Math.round(priorityMultiplier * 50)}
                        icon={<TrendingUp className="w-3 h-3 text-blue-500" />}
                    />
                    {escalationLevel > 0 && (
                        <ScoreFactor
                            label="Escalation Bonus"
                            value={escalationBonus}
                            icon={<AlertTriangle className="w-3 h-3 text-orange-500" />}
                        />
                    )}
                </div>
            </div>

            {/* Breakdown Bar */}
            <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500">
                    <span>Community Impact</span>
                    <span>{impactScore}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r ${impactLevel.gradient} transition-all duration-700`}
                        style={{ width: `${impactScore}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

function ScoreFactor({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                {icon}
                {label}
            </div>
            <span className="text-xs font-medium text-gray-700">{value}</span>
        </div>
    );
}

// Mini impact badge for list items
export function ImpactBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
    const getColor = (s: number) => {
        if (s >= 80) return 'bg-red-500';
        if (s >= 60) return 'bg-orange-500';
        if (s >= 40) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    if (size === 'sm') {
        return (
            <div className={`${getColor(score)} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md`}>
                {score}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5">
            <div className={`${getColor(score)} w-2 h-2 rounded-full`} />
            <span className="text-xs font-medium text-gray-600">{score}</span>
            <Zap className="w-3 h-3 text-gray-400" />
        </div>
    );
}
