import { CheckCircle, Circle, Clock, XCircle, RotateCcw, ArrowRight } from 'lucide-react';
import { ReportStatus } from '../lib/database.types';

interface StatusWorkflowProps {
    currentStatus: ReportStatus;
    createdAt: string;
    resolvedAt?: string | null;
    escalationLevel?: number;
    compact?: boolean;
}

const WORKFLOW_STEPS: { status: ReportStatus; label: string; icon: React.ReactNode }[] = [
    { status: 'pending', label: 'Submitted', icon: <Clock className="w-4 h-4" /> },
    { status: 'in_progress', label: 'In Progress', icon: <Circle className="w-4 h-4" /> },
    { status: 'resolved', label: 'Resolved', icon: <CheckCircle className="w-4 h-4" /> },
];

const STATUS_ORDER: Record<ReportStatus, number> = {
    pending: 0,
    in_progress: 1,
    resolved: 2,
    rejected: -1,
    reopened: 1,
};

export default function StatusWorkflow({
    currentStatus,
    createdAt,
    resolvedAt,
    escalationLevel = 0,
    compact = false,
}: StatusWorkflowProps) {
    const currentOrder = STATUS_ORDER[currentStatus];
    const isRejected = currentStatus === 'rejected';
    const isReopened = currentStatus === 'reopened';

    if (compact) {
        return (
            <div className="flex items-center gap-1.5">
                {WORKFLOW_STEPS.map((step, index) => {
                    const isCompleted = currentOrder > STATUS_ORDER[step.status];
                    const isCurrent = currentStatus === step.status || (isReopened && step.status === 'in_progress');

                    return (
                        <div key={step.status} className="flex items-center">
                            <div
                                className={`w-2 h-2 rounded-full transition-all ${isRejected ? 'bg-red-400' :
                                        isCompleted ? 'bg-green-500' :
                                            isCurrent ? 'bg-blue-500 animate-pulse' :
                                                'bg-gray-300'
                                    }`}
                            />
                            {index < WORKFLOW_STEPS.length - 1 && (
                                <div className={`w-4 h-0.5 ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}`} />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="bg-gray-50 rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700">Status Timeline</h4>
                {escalationLevel > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        Escalation Level {escalationLevel}
                    </span>
                )}
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Line */}
                <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gray-200" />

                {/* Steps */}
                <div className="space-y-4">
                    {WORKFLOW_STEPS.map((step, index) => {
                        const isCompleted = currentOrder > STATUS_ORDER[step.status];
                        const isCurrent = currentStatus === step.status || (isReopened && step.status === 'in_progress');

                        return (
                            <div key={step.status} className="flex items-start gap-3 relative">
                                {/* Icon */}
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all ${isRejected && index === 0 ? 'bg-red-100 text-red-600' :
                                            isCompleted ? 'bg-green-100 text-green-600' :
                                                isCurrent ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-50' :
                                                    'bg-gray-100 text-gray-400'
                                        }`}
                                >
                                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : step.icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 pt-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-medium ${isCurrent ? 'text-blue-700' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                                            }`}>
                                            {step.label}
                                        </span>
                                        {isCurrent && (
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium uppercase">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {step.status === 'pending' && new Date(createdAt).toLocaleDateString()}
                                        {step.status === 'resolved' && resolvedAt && new Date(resolvedAt).toLocaleDateString()}
                                        {isCurrent && step.status !== 'pending' && 'Processing...'}
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                    {/* Rejected State */}
                    {isRejected && (
                        <div className="flex items-start gap-3 relative">
                            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center z-10 ring-4 ring-red-50">
                                <XCircle className="w-4 h-4" />
                            </div>
                            <div className="flex-1 pt-1">
                                <span className="text-sm font-medium text-red-700">Rejected</span>
                                <p className="text-xs text-gray-400">Issue was not valid</p>
                            </div>
                        </div>
                    )}

                    {/* Reopened State */}
                    {isReopened && (
                        <div className="flex items-start gap-3 relative mt-2 pt-2 border-t border-dashed border-orange-200">
                            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                <RotateCcw className="w-4 h-4" />
                            </div>
                            <div className="flex-1 pt-1">
                                <span className="text-sm font-medium text-orange-700">Reopened</span>
                                <p className="text-xs text-gray-400">Issue was not resolved satisfactorily</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Progress</span>
                    <span>{Math.round((Math.max(0, currentOrder + 1) / 3) * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 rounded-full ${isRejected ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-green-500'
                            }`}
                        style={{ width: `${isRejected ? 33 : (Math.max(0, currentOrder + 1) / 3) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

// Mini status indicator for cards
export function StatusIndicator({ status }: { status: ReportStatus }) {
    const config: Record<ReportStatus, { bg: string; icon: React.ReactNode }> = {
        pending: { bg: 'bg-amber-500', icon: <Clock className="w-3 h-3" /> },
        in_progress: { bg: 'bg-blue-500', icon: <ArrowRight className="w-3 h-3" /> },
        resolved: { bg: 'bg-green-500', icon: <CheckCircle className="w-3 h-3" /> },
        rejected: { bg: 'bg-red-500', icon: <XCircle className="w-3 h-3" /> },
        reopened: { bg: 'bg-orange-500', icon: <RotateCcw className="w-3 h-3" /> },
    };

    const style = config[status];

    return (
        <div className={`${style.bg} w-6 h-6 rounded-full flex items-center justify-center text-white`}>
            {style.icon}
        </div>
    );
}
