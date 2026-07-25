/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - AUDIT LOG SERVICE (audit.js)
   ========================================================================== */

class AuditService {
    log(supervisorId, action, details) {
        const entry = {
            id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            supervisor_id: supervisorId || 'guest',
            action: action,
            details: details,
            timestamp: new Date().toISOString()
        };
        db.insert(DB_KEYS.AUDIT_LOGS, entry);
    }

    getAllLogs() {
        const logs = db.getAll(DB_KEYS.AUDIT_LOGS);
        const supervisors = db.getAll(DB_KEYS.SUPERVISORS);

        return logs.map(log => {
            const supervisor = supervisors.find(s => s.id === log.supervisor_id);
            return {
                ...log,
                supervisor_name: supervisor ? supervisor.name : (log.supervisor_id === 'guest' ? 'زائر / غير مسجل' : log.supervisor_id)
            };
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
}

const auditService = new AuditService();
