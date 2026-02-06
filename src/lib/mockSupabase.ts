// Mock types matching database schema
type TableName = 'civic_reports' | 'report_updates' | 'citizen_feedback';

class MockQueryBuilder {
    public tableName: TableName;
    public data: any[];
    public filters: ((item: any) => boolean)[] = [];
    public sorts: { column: string; ascending: boolean }[] = [];
    public rangeStart?: number;
    public rangeEnd?: number;
    public limitCount?: number;

    constructor(tableName: TableName, data: any[]) {
        this.tableName = tableName;
        this.data = data;
    }

    // @ts-ignore: columns and options reserved for future use
    select(columns: string = '*', options?: any) {
        // Return self for chaining
        return this;
    }

    eq(column: string, value: any) {
        this.filters.push((item) => item[column] === value);
        return this;
    }

    neq(column: string, value: any) {
        this.filters.push((item) => item[column] !== value);
        return this;
    }

    in(column: string, values: any[]) {
        this.filters.push((item) => values.includes(item[column]));
        return this;
    }

    lt(column: string, value: any) {
        this.filters.push((item) => item[column] < value);
        return this;
    }

    gt(column: string, value: any) {
        this.filters.push((item) => item[column] > value);
        return this;
    }

    // Add missing not() method
    not(column: string, operator: string, value: any) {
        if (operator === 'in') {
            const valStr = String(value).replace(/[()"]/g, '').split(',');
            this.filters.push((item) => !valStr.includes(item[column]));
        } else if (operator === 'eq') {
            this.filters.push((item) => item[column] !== value);
        }
        return this;
    }

    order(column: string, { ascending = true } = {}) {
        this.sorts.push({ column, ascending });
        return this;
    }

    range(from: number, to: number) {
        this.rangeStart = from;
        this.rangeEnd = to;
        return this;
    }

    limit(count: number) {
        this.limitCount = count;
        return this;
    }

    single() {
        this.limitCount = 1;
        return this;
    }

    async then(resolve: (response: { data: any; error: any; count: number | null }) => void, _reject: (err: any) => void) {
        try {
            let result = [...this.data];

            // Apply filters
            for (const filter of this.filters) {
                result = result.filter(filter);
            }

            // Apply sorts
            for (const sort of this.sorts) {
                result.sort((a, b) => {
                    const valA = a[sort.column];
                    const valB = b[sort.column];
                    if (valA < valB) return sort.ascending ? -1 : 1;
                    if (valA > valB) return sort.ascending ? 1 : -1;
                    return 0;
                });
            }

            const totalCount = result.length;

            // Apply range/limit
            if (this.rangeStart !== undefined && this.rangeEnd !== undefined) {
                result = result.slice(this.rangeStart, this.rangeEnd + 1);
            } else if (this.limitCount !== undefined) {
                result = result.slice(0, this.limitCount);
            }

            // Handle single()
            if (this.limitCount === 1) {
                if (result.length === 0) resolve({ data: null, error: { message: 'No rows found' }, count: 0 });
                else resolve({ data: result[0], error: null, count: 1 });
                return;
            }

            resolve({ data: result, error: null, count: totalCount });
        } catch (err) {
            resolve({ data: null, error: err, count: 0 });
        }
    }

    // Insert
    async insert(row: any) {
        const newItem = {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'pending', // Default
            is_duplicate: false, // Default
            duplicate_count: 0, // Default
            priority: 'low', // Default
            validation_status: 'pending', // Default
            ...row
        };
        this.data.unshift(newItem); // Add to beginning
        MockSupabase.saveTable(this.tableName, this.data);
        return { data: [newItem], error: null };
    }

    // Update
    async update(updates: any) {
        (this as any)._updates = updates;
        return this;
    }
}

// Monkey patch update execution
const originalThen = MockQueryBuilder.prototype.then;
MockQueryBuilder.prototype.then = async function (resolve, reject) {
    if ((this as any)._updates) {
        const updates = (this as any)._updates;
        let count = 0;
        // Use 'this.data' which is public now
        let data = (this as any).data;

        data.forEach((item: any, index: number) => {
            let matches = true;
            for (const filter of (this as any).filters) {
                if (!filter(item)) matches = false;
            }
            if (matches) {
                data[index] = { ...item, ...updates, updated_at: new Date().toISOString() };
                count++;
            }
        });
        MockSupabase.saveTable((this as any).tableName, data);
        resolve({ data: null, error: null, count } as any);
        return;
    }
    return originalThen.call(this, resolve, reject);
};


class MockSupabase {
    // In-memory storage for transient duplicate reports (cleared on page refresh)
    static inMemoryDuplicates: Record<string, any[]> = {};

    static getTable(table: string) {
        let json = localStorage.getItem(`civic_reports_${table}`);
        if (!json && table === 'civic_reports') {
            // Seed initial data so user sees something!
            const seedData = [
                {
                    id: 'seed-1',
                    user_id: 'local-user-id',
                    title: 'Welcome to Local Mode',
                    description: 'This is a sample report in your new Local Database. It works offline!',
                    status: 'pending',
                    priority: 'medium',
                    issue_type: 'other',
                    category: 'emergency',
                    created_at: new Date().toISOString(),
                    is_duplicate: false,
                    latitude: 12.9716, longitude: 77.5946,
                    address: 'Local System Storage',
                    image_url: 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=800&auto=format&fit=crop'
                }
            ];
            localStorage.setItem(`civic_reports_${table}`, JSON.stringify(seedData));
            return seedData;
        }

        let data = json ? JSON.parse(json) : [];

        // Append transient duplicates that exist only in this session (not persisted)
        const trans = MockSupabase.inMemoryDuplicates[`civic_reports_${table}`] || [];
        if (trans.length > 0) {
            data = [...trans, ...data];
        }

        // Sanitize/Migrate data on read to prevent crashes from bad inserts
        if (table === 'civic_reports') {
            data = data.map((d: any) => ({
                ...d,
                status: d.status || 'pending',
                is_duplicate: d.is_duplicate ?? false,
                priority: d.priority || 'low',
                issue_type: d.issue_type || 'other'
            }));
        }
        return data;
    }

    static saveTable(table: string, data: any[]) {
        try {
            if (table === 'civic_reports') {
                // Persist only non-duplicate (original) reports to localStorage.
                const originals = data.filter((d: any) => !d.is_duplicate);
                const duplicates = data.filter((d: any) => d.is_duplicate);

                localStorage.setItem(`civic_reports_${table}`, JSON.stringify(originals));

                // Keep duplicates transient in memory only for this session.
                MockSupabase.inMemoryDuplicates[`civic_reports_${table}`] = duplicates;
            } else {
                localStorage.setItem(`civic_reports_${table}`, JSON.stringify(data));
            }

            // Dispatch a custom event so the app can listen and refresh in real-time
            window.dispatchEvent(new Event('civic_db_change'));
        } catch (e) {
            // ignore in non-browser environments
        }
    }

    from(table: TableName) {
        const data = MockSupabase.getTable(table);
        return new MockQueryBuilder(table, data);
    }

    get storage() {
        return {
            from: (_bucket: string) => ({
                upload: async (path: string, file: File) => {
                    console.log('Mock upload:', path, file.name);
                    return { data: { path }, error: null };
                },
                getPublicUrl: (path: string) => {
                    return { data: { publicUrl: `https://via.placeholder.com/400?text=${encodeURIComponent(path)}` } };
                }
            })
        };
    }

    get auth() {
        return {
            getSession: async () => {
                const sessionStr = localStorage.getItem('civic_session');
                const session = sessionStr ? JSON.parse(sessionStr) : null;
                return { data: { session }, error: null };
            },
            onAuthStateChange: (cb: any) => {
                const sessionStr = localStorage.getItem('civic_session');
                const session = sessionStr ? JSON.parse(sessionStr) : null;
                if (session) {
                    setTimeout(() => cb('SIGNED_IN', session), 100);
                } else {
                    setTimeout(() => cb('SIGNED_OUT', null), 100);
                }

                // Listen for storage changes to sync tabs/reload
                const handleStorage = () => {
                    const s = localStorage.getItem('civic_session');
                    cb(s ? 'SIGNED_IN' : 'SIGNED_OUT', s ? JSON.parse(s) : null);
                };
                window.addEventListener('storage', handleStorage);

                return { data: { subscription: { unsubscribe: () => window.removeEventListener('storage', handleStorage) } } };
            },
            signInWithPassword: async ({ email, password }: any) => {
                if (email === 'admin' && password === 'admin') {
                    const session = {
                        user: { id: 'admin-id', email: 'admin@example.com', role: 'city_admin' },
                        access_token: 'mock-admin-token'
                    };
                    localStorage.setItem('civic_session', JSON.stringify(session));
                    // Also set role in user_roles table for permissions check
                    const roles = [{ user_id: 'admin-id', role: 'city_admin', is_active: true }];
                    localStorage.setItem('civic_reports_user_roles', JSON.stringify(roles));
                    window.dispatchEvent(new Event('storage')); // Trigger update
                    return { data: { user: session.user, session }, error: null };
                }

                if (email === 'user' && password === 'admin') {
                    const session = {
                        user: { id: 'user-id', email: 'user@example.com', role: 'citizen' },
                        access_token: 'mock-user-token'
                    };
                    localStorage.setItem('civic_session', JSON.stringify(session));
                    const roles = [{ user_id: 'user-id', role: 'citizen', is_active: true }];
                    localStorage.setItem('civic_reports_user_roles', JSON.stringify(roles));
                    window.dispatchEvent(new Event('storage'));
                    return { data: { user: session.user, session }, error: null };
                }

                return { data: null, error: { message: 'Invalid credentials' } };
            },
            signUp: async ({ email, password }: any) => {
                // Auto-create as citizen
                const userId = 'user-' + Math.random().toString(36).substr(2, 9);
                const session = {
                    user: { id: userId, email, role: 'citizen' },
                    access_token: 'mock-user-token-' + userId
                };
                localStorage.setItem('civic_session', JSON.stringify(session));
                const roles = [{ user_id: userId, role: 'citizen', is_active: true }];
                localStorage.setItem('civic_reports_user_roles', JSON.stringify(roles));
                // Previous roles logic might overwrite, need to merge? 
                // Actually mockSupabase doesn't persist roles well across reloads if keys collide, but for now strict roles are static.
                // We'll just set it. Ideally we append.
                const existingRolesStr = localStorage.getItem('civic_reports_user_roles');
                const existingRoles = existingRolesStr ? JSON.parse(existingRolesStr) : [];
                localStorage.setItem('civic_reports_user_roles', JSON.stringify([...existingRoles, ...roles]));

                window.dispatchEvent(new Event('storage'));
                return { data: { user: session.user, session }, error: null };
            },
            signOut: async () => {
                localStorage.removeItem('civic_session');
                window.dispatchEvent(new Event('storage'));
                return { error: null };
            },
            getUser: async () => {
                const sessionStr = localStorage.getItem('civic_session');
                const session = sessionStr ? JSON.parse(sessionStr) : null;
                return { data: { user: session?.user || null }, error: null };
            },
        };
    }

    async rpc(func: string, args: any) {
        if (func === 'check_duplicate_report') {
            const { p_lat, p_issue_type, p_radius_meters } = args;
            const reports = MockSupabase.getTable('civic_reports');
            const duplicates = reports.filter((r: any) => {
                if (r.issue_type !== p_issue_type) return false;
                if (r.status === 'resolved' || r.status === 'rejected') return false;

                const R = 6371e3;
                // Simple dist check (Latitude distance only for mock speed)
                const Δφ = (p_lat - r.latitude) * Math.PI / 180;
                return Math.abs(Δφ * R) < (p_radius_meters || 50);
            });

            return { data: duplicates.map((r: any) => ({ existing_report_id: r.id, existing_title: r.title, distance_meters: 0, hours_ago: 0 })), error: null };
        }

        if (func === 'check_and_update_rate_limit') {
            return { data: { allowed: true, remaining_daily: 10 }, error: null };
        }

        if (func === 'calculate_priority_score') {
            return { data: [{ priority: 'medium', score: 0.5 }], error: null };
        }

        return { data: null, error: null };
    }
}

export const mockSupabase = new MockSupabase() as any;
