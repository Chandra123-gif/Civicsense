import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

// Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    duration?: number;
}

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id'>) => string;
    removeNotification: (id: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNotification: Notification = {
            id,
            duration: 5000,
            ...notification,
        };

        setNotifications((prev) => [...prev, newNotification]);

        // Auto-remove after duration
        if (newNotification.duration && newNotification.duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, newNotification.duration);
        }

        return id;
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const success = useCallback((title: string, message?: string) => {
        addNotification({ type: 'success', title, message });
    }, [addNotification]);

    const error = useCallback((title: string, message?: string) => {
        addNotification({ type: 'error', title, message, duration: 8000 });
    }, [addNotification]);

    const warning = useCallback((title: string, message?: string) => {
        addNotification({ type: 'warning', title, message });
    }, [addNotification]);

    const info = useCallback((title: string, message?: string) => {
        addNotification({ type: 'info', title, message });
    }, [addNotification]);

    return (
        <NotificationContext.Provider
            value={{ notifications, addNotification, removeNotification, success, error, warning, info }}
        >
            {children}
            <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
}

// Toast Container Component
function NotificationContainer({
    notifications,
    onRemove,
}: {
    notifications: Notification[];
    onRemove: (id: string) => void;
}) {
    if (notifications.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            {notifications.map((notification, index) => (
                <Toast
                    key={notification.id}
                    notification={notification}
                    onRemove={onRemove}
                    index={index}
                />
            ))}
        </div>
    );
}

// Individual Toast Component
function Toast({
    notification,
    onRemove,
    index,
}: {
    notification: Notification;
    onRemove: (id: string) => void;
    index: number;
}) {
    const config: Record<NotificationType, { icon: React.ReactNode; bg: string; border: string; iconBg: string }> = {
        success: {
            icon: <CheckCircle className="w-5 h-5 text-green-600" />,
            bg: 'bg-white',
            border: 'border-green-200',
            iconBg: 'bg-green-100',
        },
        error: {
            icon: <XCircle className="w-5 h-5 text-red-600" />,
            bg: 'bg-white',
            border: 'border-red-200',
            iconBg: 'bg-red-100',
        },
        warning: {
            icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
            bg: 'bg-white',
            border: 'border-amber-200',
            iconBg: 'bg-amber-100',
        },
        info: {
            icon: <Info className="w-5 h-5 text-blue-600" />,
            bg: 'bg-white',
            border: 'border-blue-200',
            iconBg: 'bg-blue-100',
        },
    };

    const style = config[notification.type];

    return (
        <div
            className={`${style.bg} ${style.border} border rounded-xl shadow-lg p-4 pointer-events-auto animate-slideUp`}
            style={{ animationDelay: `${index * 50}ms` }}
            role="alert"
        >
            <div className="flex items-start gap-3">
                <div className={`${style.iconBg} w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0`}>
                    {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm">{notification.title}</h4>
                    {notification.message && (
                        <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{notification.message}</p>
                    )}
                </div>
                <button
                    onClick={() => onRemove(notification.id)}
                    className="text-gray-400 hover:text-gray-600 p-1 -m-1 rounded-lg hover:bg-gray-100 transition flex-shrink-0"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
