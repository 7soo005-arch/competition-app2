/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - AUTH & PERMISSION SERVICE (auth.js)
   ========================================================================== */

const SESSION_KEY = 'comp_active_session';
const ADMIN_RESTRICTED_MESSAGE = 'هذا الإجراء متاح فقط لمدير النظام.';

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
                role: user.role, // 'admin' | 'supervisor'
                login_at: new Date().toISOString()
            };
            this.saveSession(sessionData);

            // Record in audit log
            auditService.log(user.id, 'تسجيل دخول', `قام ${user.role === 'admin' ? 'مدير النظام' : 'المشرف'} ${user.name} بتسجيل الدخول`);
            return { success: true, user: sessionData };
        } else {
            return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
        }
    }

    logout() {
        if (this.currentUser) {
            auditService.log(this.currentUser.id, 'تسجيل خروج', `قام ${this.currentUser.name} بتسجيل الخروج`);
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

    isSupervisor() {
        return this.currentUser && this.currentUser.role === 'supervisor';
    }

    // Role-based Security Guard
    requireAdminPermission() {
        if (!this.isAdmin()) {
            if (window.app) window.app.showToast(ADMIN_RESTRICTED_MESSAGE, 'error');
            return false;
        }
        return true;
    }

    updateUI() {
        const userInfoBox = document.getElementById('logged-user-info');
        const loginBtn = document.getElementById('login-modal-btn');
        const displayName = document.getElementById('user-display-name');
        const roleBadge = document.getElementById('user-role-badge');
        const activeSupervisorNotice = document.getElementById('active-supervisor-name');
        const navAdmin = document.getElementById('nav-admin-btn');

        if (this.currentUser) {
            if (userInfoBox) userInfoBox.style.display = 'flex';
            if (loginBtn) loginBtn.style.display = 'none';
            if (displayName) displayName.textContent = this.currentUser.name;
            if (roleBadge) roleBadge.textContent = this.isAdmin() ? 'مدير النظام' : 'مشرف منافسة';
            if (activeSupervisorNotice) activeSupervisorNotice.textContent = `${this.currentUser.name} (${this.isAdmin() ? 'مدير النظام' : 'مشرف منافسة'})`;

            // Hide Admin Navigation button from Supervisors completely
            if (navAdmin) {
                navAdmin.style.display = this.isAdmin() ? 'flex' : 'none';
            }
        } else {
            if (userInfoBox) userInfoBox.style.display = 'none';
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (activeSupervisorNotice) activeSupervisorNotice.textContent = 'غير مسجل - يرجى تسجيل الدخول ليُنسب التسجيل إليك';
            if (navAdmin) navAdmin.style.display = 'none';
        }

        // Toggle visibility of all elements marked with admin-only class
        const adminElements = document.querySelectorAll('.admin-only, [data-admin-only="true"]');
        adminElements.forEach(el => {
            el.style.display = this.isAdmin() ? '' : 'none';
        });

        // Trigger Component Refresh if active
        if (window.scoringComponent) window.scoringComponent.renderRecentFeed();
        if (window.adminComponent) window.adminComponent.renderCurrentTab();
        if (window.scheduleComponent) window.scheduleComponent.render();
    }
}

const authService = new AuthService();
