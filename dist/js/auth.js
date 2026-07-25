/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - AUTH & SESSION SERVICE (auth.js)
   ========================================================================== */

const SESSION_KEY = 'comp_active_session';

class AuthService {
    constructor() {
        this.currentUser = this.loadSession();
    }

    loadSession() {
        try {
            const data = localStorage.getItem(SESSION_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error("Session load error:", e);
            return null;
        }
    }

    saveSession(user) {
        this.currentUser = user;
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        this.updateUI();
    }

    login(username, password) {
        const supervisors = db.getAll(DB_KEYS.SUPERVISORS);
        const user = supervisors.find(s => s.username.trim().toLowerCase() === username.trim().toLowerCase() && s.password_hash === password);

        if (user) {
            const sessionData = {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role,
                login_at: new Date().toISOString()
            };
            this.saveSession(sessionData);

            // Record in audit log
            auditService.log(user.id, 'تسجيل دخول', `قام المشرف/المدير ${user.name} بتسجيل الدخول إلى النظام`);
            return { success: true, user: sessionData };
        } else {
            return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
        }
    }

    logout() {
        if (this.currentUser) {
            auditService.log(this.currentUser.id, 'تسجيل خروج', `قام المشرف ${this.currentUser.name} بتسجيل الخروج`);
        }
        this.currentUser = null;
        localStorage.removeItem(SESSION_KEY);
        this.updateUI();
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    updateUI() {
        const userInfoBox = document.getElementById('logged-user-info');
        const loginBtn = document.getElementById('login-modal-btn');
        const displayName = document.getElementById('user-display-name');
        const roleBadge = document.getElementById('user-role-badge');
        const activeSupervisorNotice = document.getElementById('active-supervisor-name');
        const adminNavBtn = id => document.getElementById(id);

        const navAdmin = document.getElementById('nav-admin-btn');

        if (this.currentUser) {
            if (userInfoBox) userInfoBox.style.display = 'flex';
            if (loginBtn) loginBtn.style.display = 'none';
            if (displayName) displayName.textContent = this.currentUser.name;
            if (roleBadge) roleBadge.textContent = this.currentUser.role === 'admin' ? 'مدير النظام' : 'مشرف منافسة';
            if (activeSupervisorNotice) activeSupervisorNotice.textContent = `${this.currentUser.name} (${this.currentUser.role === 'admin' ? 'مدير' : 'مشرف'})`;

            if (this.isAdmin()) {
                if (navAdmin) navAdmin.style.display = 'flex';
            } else {
                if (navAdmin) navAdmin.style.display = 'none';
            }
        } else {
            if (userInfoBox) userInfoBox.style.display = 'none';
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (activeSupervisorNotice) activeSupervisorNotice.textContent = 'غير مسجل - يرجى تسجيل الدخول ليُنسب التسجيل إليك';
            if (navAdmin) navAdmin.style.display = 'none';
        }
    }
}

const authService = new AuthService();
