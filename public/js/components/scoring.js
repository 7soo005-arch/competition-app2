/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - SCORING COMPONENT (scoring.js)
   ========================================================================== */

class ScoringComponent {
    constructor() {
        this.editingMatchId = null;
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.form = document.getElementById('match-scoring-form');
        this.categorySelect = document.getElementById('scoring-category');
        this.competitionSelect = document.getElementById('scoring-competition');
        this.weekSelect = document.getElementById('scoring-week');
        this.team1Select = document.getElementById('scoring-team1');
        this.team2Select = document.getElementById('scoring-team2');
        this.team1GoalsInput = document.getElementById('scoring-team1-goals');
        this.team2GoalsInput = document.getElementById('scoring-team2-goals');
        this.isDrawCheckbox = document.getElementById('scoring-is-draw');

        this.bestPlayerSelect = document.getElementById('scoring-best-player');
        this.topScorerSelect = document.getElementById('scoring-top-scorer');
        this.bestGkSelect = document.getElementById('scoring-best-gk');
        this.idealPlayerSelect = document.getElementById('scoring-ideal-player');
        this.penaltyPlayerSelect = document.getElementById('scoring-penalty-player');
        this.penaltyPointsInput = document.getElementById('scoring-penalty-points');
        this.penaltyReasonInput = document.getElementById('scoring-penalty-reason');

        this.lblWinnerTeam1 = document.getElementById('lbl-winner-team1');
        this.lblWinnerTeam2 = document.getElementById('lbl-winner-team2');
        this.recentFeed = document.getElementById('recent-scores-list');

        this.btnSaveScore = document.getElementById('btn-save-score');
        this.btnSaveScoreText = document.getElementById('btn-save-score-text');
        this.btnCancelEdit = document.getElementById('btn-cancel-edit');
        this.cardHeaderTitle = document.querySelector('.scoring-form-card .card-header h3');
    }

    bindEvents() {
        if (!this.form) return;

        // Populate initial dropdowns
        this.populateDropdowns();

        // On Category change -> Filter Teams & Participants
        if (this.categorySelect) {
            this.categorySelect.addEventListener('change', () => {
                const catId = this.categorySelect.value;
                this.populateTeams(catId);
                this.populateMatchPlayers();
            });
        }

        // On Teams change -> Update winner label text & match players
        if (this.team1Select) {
            this.team1Select.addEventListener('change', () => {
                this.updateWinnerLabels();
                this.populateMatchPlayers();
            });
        }
        if (this.team2Select) {
            this.team2Select.addEventListener('change', () => {
                this.updateWinnerLabels();
                this.populateMatchPlayers();
            });
        }

        // On Score Goals Change -> auto calculate draw or winner (if inputs exist)
        if (this.team1GoalsInput) {
            this.team1GoalsInput.addEventListener('input', () => this.autoDetectWinner());
        }
        if (this.team2GoalsInput) {
            this.team2GoalsInput.addEventListener('input', () => this.autoDetectWinner());
        }

        // On Draw Checkbox change
        if (this.isDrawCheckbox) {
            this.isDrawCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const drawRadio = this.form ? this.form.querySelector('input[name="match-winner"][value="draw"]') : null;
                    if (drawRadio) drawRadio.checked = true;
                }
            });
        }

        // Form Submit Event Handler (Prevents Page Reload!)
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleScoreSubmission();
            });
        }

        // Save Score Button Direct Click Handler (Prevents Page Reload!)
        if (this.btnSaveScore) {
            this.btnSaveScore.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleScoreSubmission();
            });
        }

        // Cancel Edit Button
        if (this.btnCancelEdit) {
            this.btnCancelEdit.addEventListener('click', () => this.cancelEdit());
        }

        // Refresh Feed
        const btnRefresh = document.getElementById('btn-refresh-feed');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.renderRecentFeed());
        }
    }

    populateDropdowns() {
        // Populate Categories
        const categories = db.getAll(DB_KEYS.CATEGORIES);
        this.categorySelect.innerHTML = '<option value="">-- اختر الفئة --</option>' + 
            categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        // Populate Competitions
        const comps = db.getAll(DB_KEYS.COMPETITIONS);
        this.competitionSelect.innerHTML = '<option value="">-- اختر الفقرة --</option>' + 
            comps.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        // Populate Weeks
        const weeks = db.getAll(DB_KEYS.WEEKS);
        this.weekSelect.innerHTML = '<option value="">-- اختر الأسبوع --</option>' + 
            weeks.map(w => `<option value="${w.id}" ${w.is_active ? 'selected' : ''}>${w.name} ${w.is_active ? '(الأسبوع الحالي)' : ''}</option>`).join('');

        // Initial Teams & Players
        this.populateTeams('');
        this.populateMatchPlayers();
        this.renderRecentFeed();
    }

    populateTeams(categoryId) {
        let teams = db.getAll(DB_KEYS.TEAMS);
        if (categoryId) {
            teams = teams.filter(t => t.category_id === categoryId);
        }

        const optionsHtml = '<option value="">-- اختر الفريق --</option>' + 
            teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

        this.team1Select.innerHTML = optionsHtml;
        this.team2Select.innerHTML = optionsHtml;
    }

    populateMatchPlayers() {
        const team1Id = this.team1Select.value;
        const team2Id = this.team2Select.value;
        const categoryId = this.categorySelect.value;

        let participants = db.getAll(DB_KEYS.PARTICIPANTS);
        const teams = db.getAll(DB_KEYS.TEAMS);

        // Filter players belonging strictly to selected Team 1 or Team 2
        if (team1Id || team2Id) {
            participants = participants.filter(p => p.team_id === team1Id || p.team_id === team2Id);
        } else if (categoryId) {
            participants = participants.filter(p => p.category_id === categoryId);
        }

        let optionsHtml = '';

        if (participants.length === 0) {
            optionsHtml = '<option value="">-- لا يوجد لاعبون مسجلون في هذا الفريق (أضفهم من لوحة الإدارة) --</option>';
        } else {
            optionsHtml = '<option value="">-- اختر اللاعب --</option>' + 
                participants.map(p => {
                    const team = teams.find(t => t.id === p.team_id);
                    return `<option value="${p.id}">${p.full_name} (${team ? team.name : '-'})</option>`;
                }).join('');
        }

        if (this.bestPlayerSelect) this.bestPlayerSelect.innerHTML = optionsHtml;
        if (this.topScorerSelect) this.topScorerSelect.innerHTML = optionsHtml;
        if (this.bestGkSelect) this.bestGkSelect.innerHTML = optionsHtml;
        if (this.idealPlayerSelect) this.idealPlayerSelect.innerHTML = optionsHtml;
        if (this.penaltyPlayerSelect) this.penaltyPlayerSelect.innerHTML = optionsHtml;
    }

    updateWinnerLabels() {
        const t1Id = this.team1Select.value;
        const t2Id = this.team2Select.value;
        const teams = db.getAll(DB_KEYS.TEAMS);

        const t1 = teams.find(t => t.id === t1Id);
        const t2 = teams.find(t => t.id === t2Id);

        this.lblWinnerTeam1.textContent = t1 ? `فوز (${t1.name})` : 'فوز الفريق الأول';
        this.lblWinnerTeam2.textContent = t2 ? `فوز (${t2.name})` : 'فوز الفريق الثاني';
    }

    autoDetectWinner() {
        if (!this.team1GoalsInput || !this.team2GoalsInput) return;
        const g1 = parseInt(this.team1GoalsInput?.value) || 0;
        const g2 = parseInt(this.team2GoalsInput?.value) || 0;

        const radios = this.form.querySelectorAll('input[name="match-winner"]');
        if (!radios || radios.length < 3) return;
        if (g1 > g2) {
            radios[0].checked = true; // team1
            if (this.isDrawCheckbox) this.isDrawCheckbox.checked = false;
        } else if (g2 > g1) {
            radios[2].checked = true; // team2
            if (this.isDrawCheckbox) this.isDrawCheckbox.checked = false;
        } else {
            radios[1].checked = true; // draw
            if (this.isDrawCheckbox) this.isDrawCheckbox.checked = true;
        }
    }

    async handleScoreSubmission() {
        if (this.isSubmitting) return;

        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            app.showToast('يرجى تسجيل الدخول أولاً لتسجيل وسلسلة النقاط بحسابك!', 'error');
            app.openLoginModal();
            return;
        }

        const categoryId = this.categorySelect?.value || '';
        const competitionId = this.competitionSelect?.value || '';
        const weekId = this.weekSelect?.value || '';
        const team1Id = this.team1Select?.value || '';
        const team2Id = this.team2Select?.value || '';
        const team1Goals = parseInt(this.team1GoalsInput?.value) || 0;
        const team2Goals = parseInt(this.team2GoalsInput?.value) || 0;

        if (!categoryId || !competitionId || !weekId) {
            app.showToast('يرجى اختيار الفئة والمنافسة والأسبوع أولاً!', 'error');
            return;
        }

        if (!team1Id || !team2Id) {
            app.showToast('يرجى اختيار طرفي المباراة (الفريق الأول والفريق الثاني)!', 'error');
            return;
        }

        if (team1Id === team2Id) {
            app.showToast('لا يمكن اختيار نفس الفريق لطرفي المباراة!', 'error');
            return;
        }

        const selectedWinnerRadio = this.form.querySelector('input[name="match-winner"]:checked')?.value;
        let winnerTeamId = null;
        let isDraw = false;

        if (selectedWinnerRadio === 'team1') {
            winnerTeamId = team1Id;
        } else if (selectedWinnerRadio === 'team2') {
            winnerTeamId = team2Id;
        } else {
            isDraw = true;
        }

        const isEditing = !!this.editingMatchId;
        if (isEditing && !authService.isAdmin()) {
            app.showToast('هذا الإجراء متاح فقط لمدير النظام.', 'error');
            return;
        }

        // 1. Show Saving State & Disable Button
        this.isSubmitting = true;
        if (this.btnSaveScore) {
            this.btnSaveScore.disabled = true;
            if (this.btnSaveScoreText) this.btnSaveScoreText.textContent = 'جاري الحفظ...';
        }
        app.showToast('جاري الحفظ...', 'info');

        try {
            const matchRecordId = isEditing ? this.editingMatchId : ('match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4));
            const existingMatch = isEditing ? db.getById(DB_KEYS.MATCH_RECORDS, matchRecordId) : null;

            const matchRecord = {
                id: matchRecordId,
                category_id: categoryId,
                competition_id: competitionId,
                week_id: weekId,
                team1_id: team1Id,
                team2_id: team2Id,
                team1_score: team1Goals,
                team2_score: team2Goals,
                winner_team_id: winnerTeamId,
                is_draw: isDraw,
                supervisor_id: currentUser.id,
                created_at: existingMatch ? existingMatch.created_at : new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            let res;
            if (isEditing) {
                res = await db.update(DB_KEYS.MATCH_RECORDS, matchRecordId, matchRecord);
                if (res && res.success) {
                    let oldEntries = db.getAll(DB_KEYS.SCORE_ENTRIES).filter(e => e.match_id === matchRecordId);
                    for (const entry of oldEntries) {
                        await db.delete(DB_KEYS.SCORE_ENTRIES, entry.id);
                    }
                }
            } else {
                res = await db.insert(DB_KEYS.MATCH_RECORDS, matchRecord);
            }

            if (!res || !res.success) {
                throw new Error(res?.error || 'فشل الإدخال في قاعدة البيانات');
            }

            // Record Individual Awards & Penalties
            const bestPlayerId = this.bestPlayerSelect?.value;
            if (bestPlayerId) {
                await db.insert(DB_KEYS.SCORE_ENTRIES, {
                    match_id: matchRecord.id,
                    participant_id: bestPlayerId,
                    entry_type: 'best_player',
                    points_change: 5,
                    supervisor_id: currentUser.id,
                    created_at: new Date().toISOString()
                });
            }

            const topScorerId = this.topScorerSelect?.value;
            if (topScorerId) {
                await db.insert(DB_KEYS.SCORE_ENTRIES, {
                    match_id: matchRecord.id,
                    participant_id: topScorerId,
                    entry_type: 'top_scorer',
                    points_change: 3,
                    supervisor_id: currentUser.id,
                    created_at: new Date().toISOString()
                });
            }

            const bestGkId = this.bestGkSelect?.value;
            if (bestGkId) {
                await db.insert(DB_KEYS.SCORE_ENTRIES, {
                    match_id: matchRecord.id,
                    participant_id: bestGkId,
                    entry_type: 'best_goalkeeper',
                    points_change: 3,
                    supervisor_id: currentUser.id,
                    created_at: new Date().toISOString()
                });
            }

            const idealPlayerId = this.idealPlayerSelect?.value;
            if (idealPlayerId) {
                await db.insert(DB_KEYS.SCORE_ENTRIES, {
                    match_id: matchRecord.id,
                    participant_id: idealPlayerId,
                    entry_type: 'ideal_player',
                    points_change: 3,
                    supervisor_id: currentUser.id,
                    created_at: new Date().toISOString()
                });
            }

            const penaltyPlayerId = this.penaltyPlayerSelect?.value;
            const penaltyPoints = parseInt(this.penaltyPointsInput?.value) || 0;
            const penaltyReason = this.penaltyReasonInput?.value?.trim() || '';

            if (penaltyPlayerId && penaltyPoints > 0) {
                await db.insert(DB_KEYS.SCORE_ENTRIES, {
                    match_id: matchRecord.id,
                    participant_id: penaltyPlayerId,
                    entry_type: 'penalty',
                    points_change: -Math.abs(penaltyPoints),
                    reason_notes: penaltyReason || 'خصم سلوكي / فني',
                    supervisor_id: currentUser.id,
                    created_at: new Date().toISOString()
                });
            }

            // Audit Logging
            const teams = db.getAll(DB_KEYS.TEAMS);
            const t1 = teams.find(t => t.id === team1Id)?.name || 'الفريق الأول';
            const t2 = teams.find(t => t.id === team2Id)?.name || 'الفريق الثاني';
            const actionName = isEditing ? 'تعديل مباراة' : 'إدخال مباراة';
            const logDetail = isEditing 
                ? `قام المشرف ${currentUser.name} بتعديل بيانات مباراة (${t1} ${team1Goals} - ${team2Goals} ${t2})`
                : `تم رصد مباراة (${t1} ${team1Goals} - ${team2Goals} ${t2}) بواسطة المشرف ${currentUser.name}`;

            await auditService.log(currentUser.id, actionName, logDetail);

            // 2. Show Success State
            app.showToast('تم الحفظ بنجاح', 'success');

            this.cancelEdit();

            // Refresh feed & leaderboards & analytics & admin audit
            this.renderRecentFeed();
            if (window.leaderboardComponent) window.leaderboardComponent.renderAll();
            if (window.analyticsComponent) window.analyticsComponent.renderCharts();
            if (window.adminComponent) window.adminComponent.renderCurrentTab();

        } catch (error) {
            console.error('❌ Score submission failed:', error);
            // 3. Show Error State with exact error details
            app.showToast(error.message || 'فشل الحفظ في قاعدة البيانات.', 'error');
        } finally {
            this.isSubmitting = false;
            if (this.btnSaveScore) {
                this.btnSaveScore.disabled = false;
                if (this.btnSaveScoreText) {
                    this.btnSaveScoreText.textContent = isEditing ? 'تحديث وتعديل نتيجة المباراة' : 'اعتماد وتسجيل نقاط المباراة';
                }
            }
        }
    }

    editMatch(matchId) {
        if (!authService.requireAdminPermission()) return;

        const match = db.getById(DB_KEYS.MATCH_RECORDS, matchId);
        if (!match) return;

        this.editingMatchId = matchId;

        // Set Form Dropdowns & Fields
        if (this.categorySelect) this.categorySelect.value = match.category_id || '';
        this.populateTeams(match.category_id || '');
        
        if (this.competitionSelect) this.competitionSelect.value = match.competition_id || '';
        if (this.weekSelect) this.weekSelect.value = match.week_id || '';
        
        if (this.team1Select) this.team1Select.value = match.team1_id || '';
        if (this.team2Select) this.team2Select.value = match.team2_id || '';

        if (this.team1GoalsInput) this.team1GoalsInput.value = match.team1_score || 0;
        if (this.team2GoalsInput) this.team2GoalsInput.value = match.team2_score || 0;

        if (this.isDrawCheckbox) this.isDrawCheckbox.checked = !!match.is_draw;

        const winnerRadioVal = match.is_draw ? 'draw' : (match.winner_team_id === match.team1_id ? 'team1' : (match.winner_team_id === match.team2_id ? 'team2' : 'draw'));
        const targetRadio = this.form.querySelector(`input[name="match-winner"][value="${winnerRadioVal}"]`);
        if (targetRadio) targetRadio.checked = true;

        this.updateWinnerLabels();
        this.populateMatchPlayers();

        // Get saved awards & penalties from SCORE_ENTRIES
        const scoreEntries = db.getAll(DB_KEYS.SCORE_ENTRIES).filter(e => e.match_id === matchId);

        const bestPlayer = scoreEntries.find(e => e.entry_type === 'best_player');
        const topScorer = scoreEntries.find(e => e.entry_type === 'top_scorer');
        const bestGk = scoreEntries.find(e => e.entry_type === 'best_goalkeeper');
        const idealPlayer = scoreEntries.find(e => e.entry_type === 'ideal_player');
        const penalty = scoreEntries.find(e => e.entry_type === 'penalty');

        if (this.bestPlayerSelect) this.bestPlayerSelect.value = bestPlayer ? bestPlayer.participant_id : '';
        if (this.topScorerSelect) this.topScorerSelect.value = topScorer ? topScorer.participant_id : '';
        if (this.bestGkSelect) this.bestGkSelect.value = bestGk ? bestGk.participant_id : '';
        if (this.idealPlayerSelect) this.idealPlayerSelect.value = idealPlayer ? idealPlayer.participant_id : '';

        if (this.penaltyPlayerSelect) this.penaltyPlayerSelect.value = penalty ? penalty.participant_id : '';
        if (this.penaltyPointsInput) this.penaltyPointsInput.value = penalty ? Math.abs(penalty.points_change) : '';
        if (this.penaltyReasonInput) this.penaltyReasonInput.value = penalty ? (penalty.reason_notes || '') : '';

        // UI Edit Mode styling
        if (this.btnSaveScoreText) this.btnSaveScoreText.textContent = 'تحديث وتعديل نتيجة المباراة';
        if (this.btnSaveScore) {
            this.btnSaveScore.classList.remove('btn-success');
            this.btnSaveScore.classList.add('btn-warning');
        }
        if (this.btnCancelEdit) this.btnCancelEdit.style.display = 'inline-flex';
        if (this.cardHeaderTitle) this.cardHeaderTitle.innerHTML = '<i data-lucide="edit-3"></i> تعديل بيانات مباراة مسجلة';
        lucide.createIcons();

        // Scroll to form
        this.form.scrollIntoView({ behavior: 'smooth' });
        app.showToast('تم تحميل بيانات المباراة في النموذج للتعديل.', 'info');
    }

    cancelEdit() {
        this.editingMatchId = null;

        // Reset Inputs
        if (this.team1GoalsInput) this.team1GoalsInput.value = 0;
        if (this.team2GoalsInput) this.team2GoalsInput.value = 0;
        if (this.bestPlayerSelect) this.bestPlayerSelect.value = '';
        if (this.topScorerSelect) this.topScorerSelect.value = '';
        if (this.bestGkSelect) this.bestGkSelect.value = '';
        if (this.idealPlayerSelect) this.idealPlayerSelect.value = '';
        if (this.penaltyPlayerSelect) this.penaltyPlayerSelect.value = '';
        if (this.penaltyPointsInput) this.penaltyPointsInput.value = '';
        if (this.penaltyReasonInput) this.penaltyReasonInput.value = '';

        // Restore UI
        if (this.btnSaveScoreText) this.btnSaveScoreText.textContent = 'اعتماد وتسجيل نقاط المباراة';
        if (this.btnSaveScore) {
            this.btnSaveScore.classList.remove('btn-warning');
            this.btnSaveScore.classList.add('btn-success');
        }
        if (this.btnCancelEdit) this.btnCancelEdit.style.display = 'none';
        if (this.cardHeaderTitle) this.cardHeaderTitle.innerHTML = '<i data-lucide="plus-circle"></i> رصد نتيجة مباراة جديدة';
        lucide.createIcons();
    }

    async deleteMatch(matchId) {
        if (!authService.requireAdminPermission()) return;

        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            app.showToast('يرجى تسجيل الدخول أولاً لتنفيذ الحذف!', 'error');
            app.openLoginModal();
            return;
        }

        const match = db.getById(DB_KEYS.MATCH_RECORDS, matchId);
        if (!match) return;

        const teams = db.getAll(DB_KEYS.TEAMS);
        const t1 = teams.find(t => t.id === match.team1_id)?.name || 'الفريق الأول';
        const t2 = teams.find(t => t.id === match.team2_id)?.name || 'الفريق الثاني';

        if (!confirm(`هل أنت تأكد من رغبتك في حذف سجل مباراة (${t1} ضد ${t2}) نهائياً؟ سيتسبب ذلك في حذف كافة جوائزها وإعادة حساب الترتيب.`)) {
            return;
        }

        // Delete match record
        await db.delete(DB_KEYS.MATCH_RECORDS, matchId);

        // Delete associated score entries
        let scoreEntries = db.getAll(DB_KEYS.SCORE_ENTRIES).filter(e => e.match_id === matchId);
        for (const entry of scoreEntries) {
            await db.delete(DB_KEYS.SCORE_ENTRIES, entry.id);
        }

        // Audit Logging
        const logDetail = `قام المشرف ${currentUser.name} بحذف سجل مباراة (${t1} ضد ${t2})`;
        await auditService.log(currentUser.id, 'حذف مباراة', logDetail);

        app.showToast('تم حذف سجل المباراة وإعادة حساب النقاط والترتيب بنجاح.', 'success');

        if (this.editingMatchId === matchId) {
            this.cancelEdit();
        }

        // Refresh feed & leaderboards & analytics & admin audit
        this.renderRecentFeed();
        if (window.leaderboardComponent) {
            window.leaderboardComponent.renderAll();
        }
        if (window.analyticsComponent) {
            window.analyticsComponent.renderCharts();
        }
        if (window.adminComponent) {
            window.adminComponent.renderCurrentTab();
        }
    }

    renderRecentFeed() {
        if (!this.recentFeed) return;

        const matches = db.getAll(DB_KEYS.MATCH_RECORDS).slice(-15).reverse();
        const teams = db.getAll(DB_KEYS.TEAMS);
        const comps = db.getAll(DB_KEYS.COMPETITIONS);
        const weeks = db.getAll(DB_KEYS.WEEKS);
        const supervisors = db.getAll(DB_KEYS.SUPERVISORS);

        if (matches.length === 0) {
            this.recentFeed.innerHTML = '<div class="text-center text-muted p-3">لا توجد مباريات مسجلة حتى الآن.</div>';
            return;
        }

        this.recentFeed.innerHTML = matches.map(m => {
            const t1 = teams.find(t => t.id === m.team1_id)?.name || '-';
            const t2 = teams.find(t => t.id === m.team2_id)?.name || '-';
            const comp = comps.find(c => c.id === m.competition_id)?.name || '-';
            const week = weeks.find(w => w.id === m.week_id)?.name || '-';
            const supervisor = supervisors.find(s => s.id === m.supervisor_id)?.name || 'مشرف غير معروف';

            return `
                <div class="recent-item" id="recent-item-${m.id}">
                    <div class="header">
                        <span>${week} | ${comp}</span>
                        <span class="badge badge-accent">${new Date(m.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div class="body text-center my-1">
                        <strong>${t1} (${m.team1_score})</strong> ضد <strong>(${m.team2_score}) ${t2}</strong>
                    </div>
                    <div class="footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                        <span>رُصد بواسطة: ${supervisor}</span>
                        ${authService.isAdmin() ? `
                        <div class="match-actions" style="display: flex; gap: 4px;">
                            <button class="btn-ghost icon-only" title="تعديل نتيجة المباراة" onclick="scoringComponent.editMatch('${m.id}')">
                                <i data-lucide="edit-3"></i>
                            </button>
                            <button class="btn-ghost icon-only text-danger" title="حذف سجل المباراة" onclick="scoringComponent.deleteMatch('${m.id}')">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        lucide.createIcons();
    }
}

const scoringComponent = new ScoringComponent();
