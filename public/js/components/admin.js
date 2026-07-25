/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - ADMIN COMPONENT (admin.js)
   ========================================================================== */

class AdminComponent {
    constructor() {
        this.currentAdminTab = 'adm-participants';
        this.bindAdminEvents();
    }

    bindAdminEvents() {
        // Admin Subtab Switching
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-admin-tab');
                document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                const targetContent = document.getElementById(target);
                if (targetContent) targetContent.classList.add('active');

                this.currentAdminTab = target;
                this.renderCurrentTab();
            });
        });

        // Add Buttons
        document.getElementById('btn-add-participant')?.addEventListener('click', () => this.openEntityModal('participant'));
        document.getElementById('btn-add-team')?.addEventListener('click', () => this.openEntityModal('team'));
        document.getElementById('btn-add-category')?.addEventListener('click', () => this.openEntityModal('category'));
        document.getElementById('btn-add-competition')?.addEventListener('click', () => this.openEntityModal('competition'));
        document.getElementById('btn-add-week')?.addEventListener('click', () => this.openEntityModal('week'));
        document.getElementById('btn-add-supervisor')?.addEventListener('click', () => this.openEntityModal('supervisor'));

        // Search Participant
        const searchInput = document.getElementById('search-participant-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.renderParticipantsTable(e.target.value.trim()));
        }

        // Entity Form Submission
        const entityForm = document.getElementById('entity-form');
        if (entityForm) {
            entityForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEntityFormSubmit();
            });
        }

        // Supabase Settings Form
        const supForm = document.getElementById('supabase-settings-form');
        if (supForm) {
            supForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const url = document.getElementById('sup-url-input').value.trim();
                const key = document.getElementById('sup-key-input').value.trim();
                db.setSupabaseCredentials(url, key);
                app.showToast('تم حفظ وتفعيل الربط السحابي بقواعد بيانات Supabase بنجاح!', 'success');
            });
        }

        const btnSyncNow = document.getElementById('btn-sync-cloud-now');
        if (btnSyncNow) {
            btnSyncNow.addEventListener('click', async () => {
                app.showToast('جاري جلب ومزامنة البيانات من Supabase السحابية...', 'info');
                await db.pullAllTablesFromCloud();
                app.showToast('تمت مزامنة كافة البيانات السحابية بنجاح!', 'success');
            });
        }
    }

    renderCurrentTab() {
        switch (this.currentAdminTab) {
            case 'adm-participants': this.renderParticipantsTable(); break;
            case 'adm-teams': this.renderTeamsTable(); break;
            case 'adm-categories': this.renderCategoriesTable(); break;
            case 'adm-competitions': this.renderCompetitionsTable(); break;
            case 'adm-weeks': this.renderWeeksTable(); break;
            case 'adm-supervisors': this.renderSupervisorsTable(); break;
            case 'adm-audit': this.renderAuditLogsTable(); break;
            case 'adm-supabase': this.renderSupabaseSettings(); break;
        }
    }

    renderSupabaseSettings() {
        const urlInput = document.getElementById('sup-url-input');
        const keyInput = document.getElementById('sup-key-input');
        if (urlInput) urlInput.value = localStorage.getItem('comp_supabase_url') || window.ENV_SUPABASE_URL || '';
        if (keyInput) keyInput.value = localStorage.getItem('comp_supabase_key') || window.ENV_SUPABASE_KEY || '';
    }

    /* ---------------- 1. PARTICIPANTS ---------------- */
    renderParticipantsTable(searchQuery = '') {
        const tbody = document.getElementById('adm-participants-tbody');
        if (!tbody) return;

        let participants = db.getAll(DB_KEYS.PARTICIPANTS);
        const teams = db.getAll(DB_KEYS.TEAMS);
        const categories = db.getAll(DB_KEYS.CATEGORIES);

        if (searchQuery) {
            participants = participants.filter(p => p.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        if (participants.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">لا يوجد مشاركون مطابقون.</td></tr>';
            return;
        }

        tbody.innerHTML = participants.slice(0, 100).map((p, i) => {
            const team = teams.find(t => t.id === p.team_id);
            const cat = categories.find(c => c.id === p.category_id);

            return `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${p.full_name}</strong></td>
                    <td>${team ? team.name : '-'}</td>
                    <td><span class="badge badge-accent">${cat ? cat.name : '-'}</span></td>
                    <td>
                        <button class="btn-ghost icon-only" onclick="adminComponent.editEntity('participant', '${p.id}')"><i data-lucide="edit"></i></button>
                        <button class="btn-ghost icon-only text-danger" onclick="adminComponent.deleteEntity('participant', '${p.id}')"><i data-lucide="trash-2"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
        lucide.createIcons();
    }

    /* ---------------- 2. TEAMS ---------------- */
    renderTeamsTable() {
        const tbody = document.getElementById('adm-teams-tbody');
        if (!tbody) return;

        const teams = db.getAll(DB_KEYS.TEAMS);
        const categories = db.getAll(DB_KEYS.CATEGORIES);

        tbody.innerHTML = teams.map((t, i) => {
            const cat = categories.find(c => c.id === t.category_id);
            return `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${t.name}</strong></td>
                    <td><span class="badge badge-accent">${cat ? cat.name : '-'}</span></td>
                    <td><span style="display:inline-block; width:20px; height:20px; border-radius:50%; background:${t.color || '#3b82f6'}; border:1px solid #fff;"></span></td>
                    <td>
                        <button class="btn-ghost icon-only" onclick="adminComponent.editEntity('team', '${t.id}')"><i data-lucide="edit"></i></button>
                        <button class="btn-ghost icon-only text-danger" onclick="adminComponent.deleteEntity('team', '${t.id}')"><i data-lucide="trash-2"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
        lucide.createIcons();
    }

    /* ---------------- 3. CATEGORIES ---------------- */
    renderCategoriesTable() {
        const tbody = document.getElementById('adm-categories-tbody');
        if (!tbody) return;

        const categories = db.getAll(DB_KEYS.CATEGORIES);
        const teams = db.getAll(DB_KEYS.TEAMS);

        tbody.innerHTML = categories.map((c, i) => {
            const teamCount = teams.filter(t => t.category_id === c.id).length;
            return `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.description || '-'}</td>
                    <td><span class="badge badge-success">${teamCount} فرق</span></td>
                    <td>
                        <button class="btn-ghost icon-only" onclick="adminComponent.editEntity('category', '${c.id}')"><i data-lucide="edit"></i></button>
                        <button class="btn-ghost icon-only text-danger" onclick="adminComponent.deleteEntity('category', '${c.id}')"><i data-lucide="trash-2"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
        lucide.createIcons();
    }

    /* ---------------- 4. COMPETITIONS ---------------- */
    renderCompetitionsTable() {
        const tbody = document.getElementById('adm-competitions-tbody');
        if (!tbody) return;

        const comps = db.getAll(DB_KEYS.COMPETITIONS);
        tbody.innerHTML = comps.map((c, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${c.name}</strong></td>
                <td class="text-success">+${c.points_win || 3}</td>
                <td>+${c.points_draw || 1}</td>
                <td class="text-muted">${c.points_loss || 0}</td>
                <td>
                    <button class="btn-ghost icon-only" onclick="adminComponent.editEntity('competition', '${c.id}')"><i data-lucide="edit"></i></button>
                    <button class="btn-ghost icon-only text-danger" onclick="adminComponent.deleteEntity('competition', '${c.id}')"><i data-lucide="trash-2"></i></button>
                </td>
            </tr>
        `).join('');
        lucide.createIcons();
    }

    /* ---------------- 5. WEEKS ---------------- */
    renderWeeksTable() {
        const tbody = document.getElementById('adm-weeks-tbody');
        if (!tbody) return;

        const weeks = db.getAll(DB_KEYS.WEEKS);
        tbody.innerHTML = weeks.map((w, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${w.name}</strong></td>
                <td>${w.is_active ? '<span class="badge badge-success">الأسبوع النشط حالياً</span>' : '<span class="badge badge-accent">مستقبلي / منتهي</span>'}</td>
                <td>
                    <button class="btn-ghost icon-only" onclick="adminComponent.editEntity('week', '${w.id}')"><i data-lucide="edit"></i></button>
                    <button class="btn-ghost icon-only text-danger" onclick="adminComponent.deleteEntity('week', '${w.id}')"><i data-lucide="trash-2"></i></button>
                </td>
            </tr>
        `).join('');
        lucide.createIcons();
    }

    /* ---------------- 6. SUPERVISORS ---------------- */
    renderSupervisorsTable() {
        const tbody = document.getElementById('adm-supervisors-tbody');
        if (!tbody) return;

        const sups = db.getAll(DB_KEYS.SUPERVISORS);
        tbody.innerHTML = sups.map((s, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${s.name}</strong></td>
                <td><code>${s.username}</code></td>
                <td>${s.role === 'admin' ? '<span class="badge badge-danger">مدير النظام</span>' : '<span class="badge badge-accent">مشرف منافسة</span>'}</td>
                <td><small>${new Date(s.created_at || Date.now()).toLocaleDateString('ar-SA')}</small></td>
                <td>
                    <button class="btn-ghost icon-only" onclick="adminComponent.editEntity('supervisor', '${s.id}')"><i data-lucide="edit"></i></button>
                    ${s.username !== 'admin' ? `<button class="btn-ghost icon-only text-danger" onclick="adminComponent.deleteEntity('supervisor', '${s.id}')"><i data-lucide="trash-2"></i></button>` : ''}
                </td>
            </tr>
        `).join('');
        lucide.createIcons();
    }

    /* ---------------- 7. AUDIT LOGS ---------------- */
    renderAuditLogsTable() {
        const tbody = document.getElementById('adm-audit-tbody');
        if (!tbody) return;

        const logs = auditService.getAllLogs();
        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">لا يوجد سجل حركات حتى الآن.</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(l => `
            <tr>
                <td><small>${new Date(l.timestamp).toLocaleString('ar-SA')}</small></td>
                <td><strong>${l.supervisor_name}</strong></td>
                <td><span class="badge badge-accent">${l.action}</span></td>
                <td>${l.details}</td>
            </tr>
        `).join('');
    }

    /* ---------------- MODAL BUILDER & HANDLERS ---------------- */
    openEntityModal(type, entityId = null) {
        if (!authService.isAdmin()) {
            app.showToast('يتطلب هذا الإجراء صلاحيات مدير النظام!', 'error');
            return;
        }

        this.editingType = type;
        this.editingId = entityId;

        const modal = document.getElementById('entity-modal');
        const modalTitle = document.getElementById('entity-modal-title');
        const fieldsContainer = document.getElementById('entity-modal-fields');

        let item = null;
        if (entityId) {
            const keyMap = { participant: DB_KEYS.PARTICIPANTS, team: DB_KEYS.TEAMS, category: DB_KEYS.CATEGORIES, competition: DB_KEYS.COMPETITIONS, week: DB_KEYS.WEEKS, supervisor: DB_KEYS.SUPERVISORS };
            item = db.getById(keyMap[type], entityId);
        }

        modalTitle.textContent = entityId ? `تعديل ${this.getTypeLabel(type)}` : `إضافة ${this.getTypeLabel(type)} جديد`;
        fieldsContainer.innerHTML = this.buildModalFields(type, item);

        modal.style.display = 'flex';
    }

    getTypeLabel(type) {
        const map = { participant: 'مشارك', team: 'فريق', category: 'فئة عمرية', competition: 'مسابقة / فقرة', week: 'أسبوع / جولة', supervisor: 'مشرف' };
        return map[type] || 'عنصر';
    }

    buildModalFields(type, item) {
        if (type === 'participant') {
            const teams = db.getAll(DB_KEYS.TEAMS);
            if (teams.length === 0) {
                return `<div class="alert alert-warning text-center"><i data-lucide="alert-circle"></i> يرجى إضافة فريق واحد على الأقل من تبويب (الفرق) أولاً قبل إضافة المشاركين.</div>`;
            }
            return `
                <div class="form-group">
                    <label>الاسم الثلاثي للمشارك / اللاعب *</label>
                    <input type="text" id="m-part-name" class="form-control" value="${item ? item.full_name : ''}" placeholder="اسم اللاعب الثلاثي..." required>
                </div>
                <div class="form-group mt-3">
                    <label>الفريق التابع له *</label>
                    <select id="m-part-team" class="form-control" required>
                        ${teams.map(t => `<option value="${t.id}" ${item && item.team_id === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
                    </select>
                </div>
            `;
        } else if (type === 'team') {
            const categories = db.getAll(DB_KEYS.CATEGORIES);
            return `
                <div class="form-group">
                    <label>اسم الفريق *</label>
                    <input type="text" id="m-team-name" class="form-control" value="${item ? item.name : ''}" required placeholder="مثال: أشبال 1">
                </div>
                <div class="form-group mt-3">
                    <label>الفئة العمرية *</label>
                    <select id="m-team-category" class="form-control" required>
                        ${categories.map(c => `<option value="${c.id}" ${item && item.category_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group mt-3">
                    <label>لون تمييز الفريق</label>
                    <input type="color" id="m-team-color" class="form-control" value="${item ? item.color || '#3b82f6' : '#3b82f6'}">
                </div>
            `;
        } else if (type === 'category') {
            return `
                <div class="form-group">
                    <label>اسم الفئة *</label>
                    <input type="text" id="m-cat-name" class="form-control" value="${item ? item.name : ''}" required placeholder="مثال: البراعم">
                </div>
                <div class="form-group mt-3">
                    <label>الوصف</label>
                    <input type="text" id="m-cat-desc" class="form-control" value="${item ? item.description || '' : ''}" placeholder="وصف للفئة...">
                </div>
            `;
        } else if (type === 'competition') {
            return `
                <div class="form-group">
                    <label>عنوان الفقرة / المسابقة *</label>
                    <input type="text" id="m-comp-name" class="form-control" value="${item ? item.name : ''}" required placeholder="مثال: سباقات السرعة">
                </div>
                <div class="form-row mt-3">
                    <div class="form-group">
                        <label>نقاط الفوز</label>
                        <input type="number" id="m-comp-win" class="form-control" value="${item ? item.points_win : 3}">
                    </div>
                    <div class="form-group">
                        <label>نقاط التعادل</label>
                        <input type="number" id="m-comp-draw" class="form-control" value="${item ? item.points_draw : 1}">
                    </div>
                </div>
            `;
        } else if (type === 'week') {
            return `
                <div class="form-group">
                    <label>اسم الأسبوع / الجولة *</label>
                    <input type="text" id="m-week-name" class="form-control" value="${item ? item.name : ''}" required placeholder="مثال: الأسبوع السابع">
                </div>
                <div class="form-group mt-3">
                    <label>
                        <input type="checkbox" id="m-week-active" ${item && item.is_active ? 'checked' : ''}>
                        تعيين كأسبوع نشط حالياً
                    </label>
                </div>
            `;
        } else if (type === 'supervisor') {
            return `
                <div class="form-group">
                    <label>الاسم الكامل للمشرف *</label>
                    <input type="text" id="m-sup-name" class="form-control" value="${item ? item.name : ''}" required>
                </div>
                <div class="form-group mt-3">
                    <label>اسم المستخدم (الدخول) *</label>
                    <input type="text" id="m-sup-username" class="form-control" value="${item ? item.username : ''}" required>
                </div>
                <div class="form-group mt-3">
                    <label>كلمة المرور *</label>
                    <input type="password" id="m-sup-password" class="form-control" value="${item ? item.password_hash : ''}" required>
                </div>
                <div class="form-group mt-3">
                    <label>الصلاحية والدور *</label>
                    <select id="m-sup-role" class="form-control" required>
                        <option value="supervisor" ${item && item.role === 'supervisor' ? 'selected' : ''}>مشرف منافسة</option>
                        <option value="admin" ${item && item.role === 'admin' ? 'selected' : ''}>مدير النظام</option>
                    </select>
                </div>
            `;
        }
        return '';
    }

    handleEntityFormSubmit() {
        const type = this.editingType;
        const id = this.editingId;
        const currentUser = authService.getCurrentUser();

        let data = {};
        if (type === 'participant') {
            const teamId = document.getElementById('m-part-team').value;
            const team = db.getById(DB_KEYS.TEAMS, teamId);
            data = {
                full_name: document.getElementById('m-part-name').value.trim(),
                team_id: teamId,
                category_id: team ? team.category_id : null
            };
            if (id) db.update(DB_KEYS.PARTICIPANTS, id, data);
            else db.insert(DB_KEYS.PARTICIPANTS, data);

        } else if (type === 'team') {
            data = {
                name: document.getElementById('m-team-name').value.trim(),
                category_id: document.getElementById('m-team-category').value,
                color: document.getElementById('m-team-color').value
            };
            if (id) db.update(DB_KEYS.TEAMS, id, data);
            else db.insert(DB_KEYS.TEAMS, data);

        } else if (type === 'category') {
            data = {
                name: document.getElementById('m-cat-name').value.trim(),
                description: document.getElementById('m-cat-desc').value.trim()
            };
            if (id) db.update(DB_KEYS.CATEGORIES, id, data);
            else db.insert(DB_KEYS.CATEGORIES, data);

        } else if (type === 'competition') {
            data = {
                name: document.getElementById('m-comp-name').value.trim(),
                points_win: parseInt(document.getElementById('m-comp-win').value) || 3,
                points_draw: parseInt(document.getElementById('m-comp-draw').value) || 1,
                points_loss: 0
            };
            if (id) db.update(DB_KEYS.COMPETITIONS, id, data);
            else db.insert(DB_KEYS.COMPETITIONS, data);

        } else if (type === 'week') {
            const isActive = document.getElementById('m-week-active').checked;
            data = {
                name: document.getElementById('m-week-name').value.trim(),
                is_active: isActive
            };
            if (isActive) {
                // reset other active weeks
                const weeks = db.getAll(DB_KEYS.WEEKS);
                weeks.forEach(w => db.update(DB_KEYS.WEEKS, w.id, { is_active: false }));
            }
            if (id) db.update(DB_KEYS.WEEKS, id, data);
            else db.insert(DB_KEYS.WEEKS, data);

        } else if (type === 'supervisor') {
            data = {
                name: document.getElementById('m-sup-name').value.trim(),
                username: document.getElementById('m-sup-username').value.trim(),
                password_hash: document.getElementById('m-sup-password').value,
                role: document.getElementById('m-sup-role').value
            };
            if (id) db.update(DB_KEYS.SUPERVISORS, id, data);
            else db.insert(DB_KEYS.SUPERVISORS, data);
        }

        auditService.log(currentUser.id, id ? 'تعديل عنصر' : 'إضافة عنصر', `تم ${id ? 'تعديل' : 'إضافة'} ${this.getTypeLabel(type)}: ${data.name || data.full_name}`);

        app.showToast('تم حفظ التغييرات بنجاح!', 'success');
        document.getElementById('entity-modal').style.display = 'none';

        this.renderCurrentTab();
        if (window.scoringComponent) window.scoringComponent.populateDropdowns();
        if (window.leaderboardComponent) window.leaderboardComponent.renderAll();
    }

    editEntity(type, id) {
        this.openEntityModal(type, id);
    }

    deleteEntity(type, id) {
        if (!authService.isAdmin()) {
            app.showToast('يتطلب هذا الإجراء صلاحيات مدير النظام!', 'error');
            return;
        }

        if (confirm(`هل أنت تأكد من إرادتك لحذف هذا الـ (${this.getTypeLabel(type)})؟`)) {
            const keyMap = { participant: DB_KEYS.PARTICIPANTS, team: DB_KEYS.TEAMS, category: DB_KEYS.CATEGORIES, competition: DB_KEYS.COMPETITIONS, week: DB_KEYS.WEEKS, supervisor: DB_KEYS.SUPERVISORS };
            db.delete(keyMap[type], id);

            auditService.log(authService.getCurrentUser()?.id, 'حذف عنصر', `تم حذف ${this.getTypeLabel(type)} معرف: ${id}`);
            app.showToast('تم حذف العنصر بنجاح.', 'success');

            this.renderCurrentTab();
            if (window.scoringComponent) window.scoringComponent.populateDropdowns();
            if (window.leaderboardComponent) window.leaderboardComponent.renderAll();
        }
    }
}

const adminComponent = new AdminComponent();
