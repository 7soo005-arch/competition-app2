/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - APP ROUTER & CORE (app.js)
   ========================================================================== */

class App {
    constructor() {
        this.currentView = 'scoring';
        this.init();
    }

    async init() {
        this.bindEvents();
        const loader = document.getElementById('app-initial-loader');

        try {
            if (window.db) {
                await db.initDatabase();
            }
        } catch (e) {
            console.error('Error during initial database load:', e);
        } finally {
            authService.updateUI();
            if (window.scoringComponent) {
                window.scoringComponent.populateDropdowns();
                window.scoringComponent.renderRecentFeed();
            }
            if (window.leaderboardComponent) {
                window.leaderboardComponent.renderAll();
            }

            if (loader) {
                loader.classList.add('hidden');
                setTimeout(() => { loader.style.display = 'none'; }, 450);
            }
        }
    }

    bindEvents() {
        // Mobile Side Drawer Controls
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const mobileDrawerClose = document.getElementById('mobile-drawer-close');
        const mobileDrawerBackdrop = document.getElementById('mobile-drawer-backdrop');
        const mainNav = document.querySelector('.main-nav');

        const closeMobileDrawer = () => {
            if (mainNav) mainNav.classList.remove('open');
            if (mobileDrawerBackdrop) mobileDrawerBackdrop.classList.remove('open');
        };

        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                if (mainNav) mainNav.classList.toggle('open');
                if (mobileDrawerBackdrop) mobileDrawerBackdrop.classList.toggle('open');
            });
        }

        if (mobileDrawerClose) {
            mobileDrawerClose.addEventListener('click', closeMobileDrawer);
        }

        if (mobileDrawerBackdrop) {
            mobileDrawerBackdrop.addEventListener('click', closeMobileDrawer);
        }

        // Navigation SPA Switching
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetView = btn.getAttribute('data-view');
                this.switchView(targetView);
                closeMobileDrawer();
            });
        });

        // Login Modal Controls
        const loginModalBtn = document.getElementById('login-modal-btn');
        const loginModal = document.getElementById('login-modal');
        const loginForm = document.getElementById('login-form');
        const logoutBtn = document.getElementById('logout-btn');

        if (loginModalBtn) {
            loginModalBtn.addEventListener('click', () => this.openLoginModal());
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                authService.logout();
                this.showToast('تم تسجيل الخروج بنجاح', 'info');
                this.switchView('scoring');
            });
        }

        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal-backdrop').forEach(m => m.style.display = 'none');
            });
        });

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const u = document.getElementById('login-username').value;
                const p = document.getElementById('login-password').value;

                const result = authService.login(u, p);
                if (result.success) {
                    this.showToast(`أهلاً بك، ${result.user.name}!`, 'success');
                    loginModal.style.display = 'none';
                    loginForm.reset();
                    scoringComponent.renderRecentFeed();
                } else {
                    this.showToast(result.message, 'error');
                }
            });
        }

        // Excel Export/Import Buttons
        document.getElementById('btn-export-standings')?.addEventListener('click', () => excelService.exportStandingsToExcel());
        document.getElementById('btn-export-full-logs')?.addEventListener('click', () => excelService.exportMatchLogsToExcel());
        document.getElementById('btn-export-participants')?.addEventListener('click', () => excelService.exportParticipantsToExcel());
        document.getElementById('btn-download-sample-excel')?.addEventListener('click', () => excelService.downloadSampleTemplate());

        document.getElementById('btn-print-report')?.addEventListener('click', () => {
            window.print();
        });

        // Excel Drag & Drop Upload
        const dropzone = document.getElementById('excel-dropzone');
        const fileInput = document.getElementById('excel-file-input');

        if (dropzone && fileInput) {
            dropzone.addEventListener('click', () => fileInput.click());

            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.style.borderColor = 'var(--success)';
            });

            dropzone.addEventListener('dragleave', () => {
                dropzone.style.borderColor = 'var(--primary)';
            });

            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.style.borderColor = 'var(--primary)';
                if (e.dataTransfer.files.length > 0) {
                    this.processExcelFile(e.dataTransfer.files[0]);
                }
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.processExcelFile(e.target.files[0]);
                }
            });
        }
    }

    processExcelFile(file) {
        this.showToast('جاري قراءة واستيراد ملف الإكسل...', 'info');
        excelService.importParticipantsFromExcel(file, (res) => {
            if (res.success) {
                this.showToast(`تم استيراد ${res.count} مشارك بنجاح!`, 'success');
                if (window.scoringComponent) window.scoringComponent.populateDropdowns();
                if (window.leaderboardComponent) window.leaderboardComponent.renderAll();
                if (window.adminComponent) window.adminComponent.renderCurrentTab();
            } else {
                this.showToast(res.message, 'error');
            }
        });
    }

    switchView(viewId) {
        if (viewId === 'admin' && !authService.isAdmin()) {
            this.showToast('هذا الإجراء متاح فقط لمدير النظام.', 'error');
            this.openLoginModal();
            return;
        }

        document.querySelectorAll('.nav-btn').forEach(btn => {
            if (btn.getAttribute('data-view') === viewId) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        document.querySelectorAll('.app-view').forEach(view => {
            if (view.id === `view-${viewId}`) view.classList.add('active');
            else view.classList.remove('active');
        });

        this.currentView = viewId;

        // Render views on demand
        if (viewId === 'leaderboard') {
            leaderboardComponent.renderAll();
        } else if (viewId === 'analytics') {
            analyticsComponent.renderCharts();
        } else if (viewId === 'admin') {
            adminComponent.renderCurrentTab();
        } else if (viewId === 'scoring') {
            scoringComponent.renderRecentFeed();
        }
    }

    openLoginModal() {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) loginModal.style.display = 'flex';
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'error') iconName = 'alert-octagon';

        toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        lucide.createIcons();

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = '0.3s opacity ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
}

// Global App Instance
const app = new App();
