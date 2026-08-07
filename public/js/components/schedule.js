/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - MATCH SCHEDULE BUILDER (schedule.js)
   ========================================================================== */

class ScheduleComponent {
    constructor() {
        this.editingMatchId = null;
        this.deletingMatchId = null;
        this.draggedMatchId = null;
        this.isSubmitting = false;

        this.init();
    }

    init() {
        // Event Listeners for Filters
        const searchInput = document.getElementById('schedule-search-input');
        const filterCategory = document.getElementById('schedule-filter-category');
        const filterComp = document.getElementById('schedule-filter-competition');
        const filterWeek = document.getElementById('schedule-filter-week');
        const filterField = document.getElementById('schedule-filter-field');
        const filterStatus = document.getElementById('schedule-filter-status');
        const resetBtn = document.getElementById('schedule-reset-filters');

        if (searchInput) searchInput.addEventListener('input', () => this.render());
        if (filterCategory) filterCategory.addEventListener('change', () => this.render());
        if (filterComp) filterComp.addEventListener('change', () => this.render());
        if (filterWeek) filterWeek.addEventListener('change', () => this.render());
        if (filterField) filterField.addEventListener('change', () => this.render());
        if (filterStatus) filterStatus.addEventListener('change', () => this.render());
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (filterCategory) filterCategory.value = 'all';
                if (filterComp) filterComp.value = 'all';
                if (filterWeek) filterWeek.value = 'all';
                if (filterField) filterField.value = 'all';
                if (filterStatus) filterStatus.value = 'all';
                this.render();
            });
        }

        // Form Submit
        const form = document.getElementById('schedule-match-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }

        // Close modal buttons
        const matchModal = document.getElementById('schedule-match-modal');
        const deleteModal = document.getElementById('schedule-delete-modal');
        if (matchModal) {
            matchModal.querySelectorAll('.modal-close-btn').forEach(btn => {
                btn.addEventListener('click', () => { matchModal.style.display = 'none'; });
            });
        }
        if (deleteModal) {
            deleteModal.querySelectorAll('.modal-close-btn').forEach(btn => {
                btn.addEventListener('click', () => { deleteModal.style.display = 'none'; });
            });
        }

        // Render initially
        setTimeout(() => this.render(), 100);
    }

    populateDropdowns() {
        const categories = db.getAll(DB_KEYS.CATEGORIES);
        const competitions = db.getAll(DB_KEYS.COMPETITIONS);
        const weeks = db.getAll(DB_KEYS.WEEKS);

        // Filter Dropdowns
        this.populateSelectOptions('schedule-filter-category', categories, 'all', 'جميع الفئات');
        this.populateSelectOptions('schedule-filter-competition', competitions, 'all', 'جميع المنافسات');
        this.populateSelectOptions('schedule-filter-week', weeks, 'all', 'جميع الأسابيع');

        // Extract unique fields
        const matches = db.getAll(DB_KEYS.MATCH_RECORDS);
        const fieldsSet = new Set(['الملعب الرئيسي']);
        matches.forEach(m => { if (m.field_name) fieldsSet.add(m.field_name); });
        const fieldSelect = document.getElementById('schedule-filter-field');
        if (fieldSelect) {
            fieldSelect.innerHTML = '<option value="all">جميع الملاعب</option>';
            fieldsSet.forEach(f => {
                fieldSelect.innerHTML += `<option value="${f}">${f}</option>`;
            });
        }

        // Modal Dropdowns
        this.populateSelectOptions('m-sch-category', categories, '', '-- اختر الفئة --');
        this.populateSelectOptions('m-sch-competition', competitions, '', '-- اختر المنافسة --');
        this.populateSelectOptions('m-sch-week', weeks, '', '-- اختر الأسبوع --');
        this.populateTeamDropdowns();
    }

    populateSelectOptions(elementId, items, defaultVal, defaultText) {
        const select = document.getElementById(elementId);
        if (!select) return;
        const currentVal = select.value || defaultVal;
        let html = `<option value="${defaultVal}">${defaultText}</option>`;
        items.forEach(item => {
            html += `<option value="${item.id}">${item.name}</option>`;
        });
        select.innerHTML = html;
        select.value = currentVal;
    }

    populateTeamDropdowns(categoryId = null) {
        let teams = db.getAll(DB_KEYS.TEAMS);
        if (categoryId) {
            teams = teams.filter(t => t.category_id === categoryId);
        }

        const team1Select = document.getElementById('m-sch-team1');
        const team2Select = document.getElementById('m-sch-team2');

        const opt1 = '<option value="">-- اختر الفريق الأول (أ) --</option>' + teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        const opt2 = '<option value="">-- اختر الفريق الثاني (ب) --</option>' + teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

        if (team1Select) team1Select.innerHTML = opt1;
        if (team2Select) team2Select.innerHTML = opt2;
    }

    onCategoryChangeModal() {
        const catId = document.getElementById('m-sch-category')?.value;
        this.populateTeamDropdowns(catId);
    }

    render() {
        this.populateDropdowns();

        const searchVal = document.getElementById('schedule-search-input')?.value?.toLowerCase().trim() || '';
        const filterCat = document.getElementById('schedule-filter-category')?.value || 'all';
        const filterComp = document.getElementById('schedule-filter-competition')?.value || 'all';
        const filterWeek = document.getElementById('schedule-filter-week')?.value || 'all';
        const filterField = document.getElementById('schedule-filter-field')?.value || 'all';
        const filterStatus = document.getElementById('schedule-filter-status')?.value || 'all';

        let matches = db.getAll(DB_KEYS.MATCH_RECORDS);
        const categories = db.getAll(DB_KEYS.CATEGORIES);
        const competitions = db.getAll(DB_KEYS.COMPETITIONS);
        const weeks = db.getAll(DB_KEYS.WEEKS);
        const teams = db.getAll(DB_KEYS.TEAMS);

        // Sort by sort_order or created_at
        matches.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        // Filtering
        let filtered = matches.filter(m => {
            if (filterCat !== 'all' && m.category_id !== filterCat) return false;
            if (filterComp !== 'all' && m.competition_id !== filterComp) return false;
            if (filterWeek !== 'all' && m.week_id !== filterWeek) return false;
            if (filterField !== 'all' && (m.field_name || 'الملعب الرئيسي') !== filterField) return false;
            
            const matchStatus = m.status || (m.team1_score !== undefined || m.team2_score !== undefined ? 'completed' : 'scheduled');
            if (filterStatus !== 'all' && matchStatus !== filterStatus) return false;

            if (searchVal) {
                const t1 = teams.find(t => t.id === m.team1_id)?.name.toLowerCase() || '';
                const t2 = teams.find(t => t.id === m.team2_id)?.name.toLowerCase() || '';
                const field = (m.field_name || 'الملعب الرئيسي').toLowerCase();
                if (!t1.includes(searchVal) && !t2.includes(searchVal) && !field.includes(searchVal)) return false;
            }
            return true;
        });

        const isAdmin = authService.isAdmin();

        // Update Admin-only UI Controls Visibility
        const btnCreate = document.getElementById('btn-schedule-create-match');
        if (btnCreate) btnCreate.style.display = isAdmin ? 'inline-flex' : 'none';

        const dragNotice = document.querySelector('.drag-info-notice');
        if (dragNotice) dragNotice.style.display = isAdmin ? 'flex' : 'none';

        // Update Total Counter
        const totalBadge = document.getElementById('schedule-total-count');
        if (totalBadge) totalBadge.textContent = filtered.length;

        // Render Table & Cards
        const tbody = document.getElementById('schedule-table-body');
        const cardsContainer = document.getElementById('schedule-cards-list');

        if (!tbody || !cardsContainer) return;

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">لا توجد مباريات مجدولة تطابق الفلاتر المحددة.</td></tr>`;
            cardsContainer.innerHTML = `<div class="text-center py-4 text-muted">لا توجد مباريات مجدولة تطابق الفلاتر المحددة.</div>`;
            return;
        }

        let tableHtml = '';
        let cardsHtml = '';

        filtered.forEach((m, idx) => {
            const catName = categories.find(c => c.id === m.category_id)?.name || 'عام';
            const compName = competitions.find(c => c.id === m.competition_id)?.name || 'منافسة';
            const weekName = weeks.find(w => w.id === m.week_id)?.name || 'أسبوع';
            const t1Obj = teams.find(t => t.id === m.team1_id);
            const t2Obj = teams.find(t => t.id === m.team2_id);

            const t1Name = t1Obj?.name || 'الفريق أ';
            const t2Name = t2Obj?.name || 'الفريق ب';
            const t1Color = t1Obj?.color || '#00BDB0';
            const t2Color = t2Obj?.color || '#E60067';

            const fieldName = m.field_name || 'الملعب الرئيسي';
            const matchDate = m.match_date || (m.created_at ? m.created_at.substr(0, 10) : 'اليوم');
            const matchTime = m.match_time || '17:00';
            
            const statusKey = m.status || (m.team1_score > 0 || m.team2_score > 0 ? 'completed' : 'scheduled');
            const statusBadge = this.getStatusBadgeHtml(statusKey);
            const scoreDisplay = (m.team1_score !== undefined && m.team2_score !== undefined) 
                ? `<span class="badge badge-accent">${m.team1_score} - ${m.team2_score}</span>` 
                : `<span class="text-muted">-</span>`;

            const dragAttrs = isAdmin ? `draggable="true" 
                ondragstart="scheduleComponent.handleDragStart(event, '${m.id}')"
                ondragover="scheduleComponent.handleDragOver(event)"
                ondrop="scheduleComponent.handleDrop(event, '${m.id}')"
                ondragend="scheduleComponent.handleDragEnd(event)"` : '';

            const dragCell = isAdmin ? `
                <td class="drag-handle-cell" title="اسحب لإعادة الترتيب">
                    <i data-lucide="grip-vertical" class="drag-handle-icon"></i>
                </td>` : `<td></td>`;

            const actionsCell = isAdmin ? `
                <td>
                    <div class="actions-cell">
                        <button class="btn btn-sm btn-outline-primary" onclick="scheduleComponent.editScheduleMatch('${m.id}')" title="تعديل">
                            <i data-lucide="edit-2"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="scheduleComponent.duplicateMatch('${m.id}')" title="تكرار المباراة">
                            <i data-lucide="copy"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info" onclick="scheduleComponent.confirmDeleteMatch('${m.id}')" title="حذف">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>` : `<td><small class="text-muted">عرض فقط</small></td>`;

            // Table Row
            tableHtml += `
                <tr ${dragAttrs} class="schedule-row">
                    ${dragCell}
                    <td>
                        <div class="fw-bold">${compName}</div>
                        <small class="text-muted">${catName}</small>
                    </td>
                    <td><span class="badge badge-warning">${weekName}</span></td>
                    <td>
                        <div class="match-teams-display">
                            <span class="team-pill" style="border-right: 3px solid ${t1Color};">${t1Name}</span>
                            <span class="vs-badge">VS</span>
                            <span class="team-pill" style="border-right: 3px solid ${t2Color};">${t2Name}</span>
                        </div>
                    </td>
                    <td><i data-lucide="map-pin" class="icon-sm"></i> ${fieldName}</td>
                    <td>
                        <div><i data-lucide="calendar" class="icon-sm"></i> ${matchDate}</div>
                        <small class="text-muted"><i data-lucide="clock" class="icon-sm"></i> ${matchTime}</small>
                    </td>
                    <td>${statusBadge}</td>
                    <td class="text-center">${scoreDisplay}</td>
                    ${actionsCell}
                </tr>
            `;

            const cardActions = isAdmin ? `
                <div class="schedule-card-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="scheduleComponent.editScheduleMatch('${m.id}')">
                        <i data-lucide="edit-2"></i> تعديل
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="scheduleComponent.duplicateMatch('${m.id}')">
                        <i data-lucide="copy"></i> تكرار
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="scheduleComponent.confirmDeleteMatch('${m.id}')">
                        <i data-lucide="trash-2"></i> حذف
                    </button>
                </div>` : '';

            // Mobile Card
            cardsHtml += `
                <div class="schedule-card-item glass-card" ${dragAttrs}>
                    <div class="schedule-card-header">
                        <div class="drag-handle-cell">
                            ${isAdmin ? '<i data-lucide="grip-vertical"></i>' : ''}
                            <span class="badge badge-warning">${weekName}</span>
                            <small class="text-muted">${catName}</small>
                        </div>
                        <div>${statusBadge}</div>
                    </div>

                    <div class="schedule-card-body">
                        <div class="team-pill-row">
                            <strong style="color: ${t1Color}">${t1Name}</strong>
                            <span class="vs-circle">VS</span>
                            <strong style="color: ${t2Color}">${t2Name}</strong>
                        </div>
                        <div class="score-banner">${scoreDisplay}</div>
                    </div>

                    <div class="schedule-card-meta">
                        <span><i data-lucide="trophy"></i> ${compName}</span>
                        <span><i data-lucide="map-pin"></i> ${fieldName}</span>
                        <span><i data-lucide="clock"></i> ${matchDate} | ${matchTime}</span>
                    </div>

                    ${cardActions}
                </div>
            `;
        });

        tbody.innerHTML = tableHtml;
        cardsContainer.innerHTML = cardsHtml;

        if (window.lucide) lucide.createIcons();
    }

    getStatusBadgeHtml(statusKey) {
        switch (statusKey) {
            case 'live':
                return `<span class="badge badge-warning"><i data-lucide="play-circle" class="icon-xs"></i> قيد اللعب</span>`;
            case 'completed':
                return `<span class="badge badge-success"><i data-lucide="check-circle" class="icon-xs"></i> مكتملة</span>`;
            case 'canceled':
                return `<span class="badge badge-danger"><i data-lucide="x-circle" class="icon-xs"></i> ملغاة</span>`;
            case 'scheduled':
            default:
                return `<span class="badge badge-accent"><i data-lucide="calendar" class="icon-xs"></i> مجدولة</span>`;
        }
    }

    openCreateModal() {
        if (!authService.requireAdminPermission()) return;

        this.editingMatchId = null;
        const modal = document.getElementById('schedule-match-modal');
        const form = document.getElementById('schedule-match-form');
        const title = document.getElementById('schedule-modal-title') || document.getElementById('m-sch-title');

        if (form) form.reset();
        if (title) title.innerHTML = '<i data-lucide="calendar"></i> إضافة مباراة مجدولة جديدة';

        // Set default date & time
        const dateInput = document.getElementById('m-sch-date');
        const timeInput = document.getElementById('m-sch-time');
        const fieldInput = document.getElementById('m-sch-field');

        if (dateInput) dateInput.value = new Date().toISOString().substr(0, 10);
        if (timeInput) timeInput.value = '17:00';
        if (fieldInput) fieldInput.value = 'الملعب الرئيسي';

        this.populateDropdowns();
        if (modal) modal.style.display = 'flex';
        if (window.lucide) lucide.createIcons();
    }

    editScheduleMatch(id) {
        if (!authService.requireAdminPermission()) return;

        const match = db.getById(DB_KEYS.MATCH_RECORDS, id);
        if (!match) return;

        this.editingMatchId = id;
        const modal = document.getElementById('schedule-match-modal');
        const title = document.getElementById('schedule-modal-title') || document.getElementById('m-sch-title');

        if (title) title.innerHTML = '<i data-lucide="edit-2"></i> تعديل بيانات المباراة المجدولة';

        document.getElementById('m-sch-category').value = match.category_id || '';
        this.populateTeamDropdowns(match.category_id);

        document.getElementById('m-sch-competition').value = match.competition_id || '';
        document.getElementById('m-sch-week').value = match.week_id || '';
        document.getElementById('m-sch-team1').value = match.team1_id || '';
        document.getElementById('m-sch-team2').value = match.team2_id || '';
        document.getElementById('m-sch-field').value = match.field_name || 'الملعب الرئيسي';
        document.getElementById('m-sch-date').value = match.match_date || (match.created_at ? match.created_at.substr(0, 10) : '');
        document.getElementById('m-sch-time').value = match.match_time || '17:00';
        document.getElementById('m-sch-status').value = match.status || 'scheduled';

        if (modal) modal.style.display = 'flex';
    }

    async duplicateMatch(id) {
        if (!authService.requireAdminPermission()) return;

        const match = db.getById(DB_KEYS.MATCH_RECORDS, id);
        if (!match) return;

        app.showToast('جاري تكرار المباراة...', 'info');

        const newMatch = {
            ...match,
            id: 'match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            status: 'scheduled',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        delete newMatch.team1_score;
        delete newMatch.team2_score;
        delete newMatch.winner_team_id;

        const res = await db.insert(DB_KEYS.MATCH_RECORDS, newMatch);
        if (res && res.success) {
            app.showToast('تم تكرار المباراة بنجاح!', 'success');
            this.render();
        } else {
            app.showToast('فشل تكرار المباراة. يرجى المحاولة مرة أخرى.', 'error');
        }
    }

    confirmDeleteMatch(id) {
        if (!authService.requireAdminPermission()) return;

        this.deletingMatchId = id;
        const modal = document.getElementById('schedule-delete-modal');
        if (modal) modal.style.display = 'flex';
    }

    async executeDeleteMatch() {
        if (!this.deletingMatchId) return;

        const id = this.deletingMatchId;
        this.deletingMatchId = null;

        document.getElementById('schedule-delete-modal').style.display = 'none';
        app.showToast('جاري الحذف...', 'info');

        const res = await db.delete(DB_KEYS.MATCH_RECORDS, id);
        if (res && res.success) {
            app.showToast('تم حذف المباراة بنجاح', 'success');
            this.render();
        } else {
            app.showToast('فشل الحذف. يرجى المحاولة مرة أخرى.', 'error');
        }
    }

    async handleFormSubmit() {
        if (this.isSubmitting) return;

        const currentUser = authService.getCurrentUser();
        if (!currentUser) return;

        const categoryId = document.getElementById('m-sch-category').value;
        const competitionId = document.getElementById('m-sch-competition').value;
        const weekId = document.getElementById('m-sch-week').value;
        const team1Id = document.getElementById('m-sch-team1').value;
        const team2Id = document.getElementById('m-sch-team2').value;
        const fieldName = document.getElementById('m-sch-field').value.trim() || 'الملعب الرئيسي';
        const matchDate = document.getElementById('m-sch-date').value;
        const matchTime = document.getElementById('m-sch-time').value;
        const status = document.getElementById('m-sch-status').value;

        if (team1Id === team2Id) {
            app.showToast('لا يمكن اختيار نفس الفريق لطرفي المباراة!', 'error');
            return;
        }

        const submitBtn = document.querySelector('#schedule-match-form button[type="submit"]');
        const isEditing = !!this.editingMatchId;

        this.isSubmitting = true;
        if (submitBtn) submitBtn.disabled = true;
        app.showToast('جاري الحفظ...', 'info');

        try {
            const matchId = isEditing ? this.editingMatchId : ('match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4));
            const existingMatch = isEditing ? db.getById(DB_KEYS.MATCH_RECORDS, matchId) : null;

            const matchRecord = {
                id: matchId,
                category_id: categoryId,
                competition_id: competitionId,
                week_id: weekId,
                team1_id: team1Id,
                team2_id: team2Id,
                field_name: fieldName,
                match_date: matchDate,
                match_time: matchTime,
                status: status,
                supervisor_id: currentUser.id,
                created_at: existingMatch ? existingMatch.created_at : new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            let res;
            if (isEditing) {
                res = await db.update(DB_KEYS.MATCH_RECORDS, matchId, matchRecord);
            } else {
                res = await db.insert(DB_KEYS.MATCH_RECORDS, matchRecord);
            }

            if (!res || !res.success) {
                throw new Error(res?.error || 'فشل حفظ المباراة في قواعد البيانات');
            }

            app.showToast('تم الحفظ بنجاح', 'success');
            document.getElementById('schedule-match-modal').style.display = 'none';
            this.render();

        } catch (error) {
            console.error('❌ Schedule save failed:', error);
            app.showToast('فشل الحفظ. يرجى المحاولة مرة أخرى.', 'error');
        } finally {
            this.isSubmitting = false;
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    // Drag and Drop Reordering Handlers
    handleDragStart(e, id) {
        this.draggedMatchId = id;
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    async handleDrop(e, targetId) {
        e.preventDefault();
        if (!this.draggedMatchId || this.draggedMatchId === targetId) return;

        const matches = db.getAll(DB_KEYS.MATCH_RECORDS);
        const dragIndex = matches.findIndex(m => m.id === this.draggedMatchId);
        const targetIndex = matches.findIndex(m => m.id === targetId);

        if (dragIndex === -1 || targetIndex === -1) return;

        // Reorder array
        const [moved] = matches.splice(dragIndex, 1);
        matches.splice(targetIndex, 0, moved);

        // Update sort_order across matches
        app.showToast('جاري تحديث ترتيب المباريات...', 'info');
        for (let i = 0; i < matches.length; i++) {
            matches[i].sort_order = i;
            await db.update(DB_KEYS.MATCH_RECORDS, matches[i].id, { sort_order: i });
        }

        app.showToast('تم تحديث ترتيب جدول المباريات بنجاح!', 'success');
        this.render();
    }

    handleDragEnd(e) {
        this.draggedMatchId = null;
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    }
}

// Global Schedule Component Instance
const scheduleComponent = new ScheduleComponent();
window.scheduleComponent = scheduleComponent;
