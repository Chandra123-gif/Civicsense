import { UserRole } from '../lib/database.types';

export default function RoleBadge({ role }: { role: UserRole | string }) {
    if (!role) return null;

    const styles: Record<string, string> = {
        admin: 'bg-purple-100 text-purple-800',
        officer: 'bg-blue-100 text-blue-800',
        citizen: 'bg-green-100 text-green-800'
    };

    const normalizedRole = role.toLowerCase();
    const label = role.charAt(0).toUpperCase() + role.slice(1);
    const style = styles[normalizedRole] || 'bg-gray-100 text-gray-800';

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
            {label}
        </span>
    );
}
