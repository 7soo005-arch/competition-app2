/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - LEADERBOARD COMPONENT (leaderboard.js)
   ========================================================================== */

class LeaderboardComponent {
    constructor() {
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.filterCategory = document.getElementById('filter-category');
        this.filterWeek = document.getElementById('filter-week');
        this.filterCompetition = document.getElementById('filter-competition');

        this.teamsTbody = document.getElementById('teams-standings-tbody');
        this.bestPlayersTbody = document.getElementById('best-players-tbody');
        this.idealPlayersTbody = document.getElementById('ideal-players-tbody');
        this.penaltiesTbody = document.getElementById('penalties-log-tbody');
    }

    bindEvents() {
        // Populate filter dropdowns
        this.populateFilterDropdowns();

        // Listen for filter changes
        [this.filterCategory, this.filterWeek, this.filterCompetition].forEach(select => {
            if (select) {
                select.addEventListener('change', () => this.renderAll());
            }
        });

        // Tab Switching for Leaderboards
        document.querySelectorAll('.sub-tabs .sub-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTabId = btn.getAttribute('data-tab');

                // Toggle active button inside sub-tabs container
                const container = btn.closest('.sub-tabs') || document;
                container.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Toggle tab content visibility
                const section = btn.closest('section') || document;
                section.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                const targetTab = document.getElementById(targetTabId);
                if (targetTab) {
                    targetTab.classList.add('active');
                }

                this.renderAll();
            });
        });
    }

    populateFilterDropdowns() {
        if (!this.filterCategory) return;

        const categories = db.getAll(DB_KEYS.CATEGORIES);
        this.filterCategory.innerHTML = '<option value="all">كل الفئات</option>' + 
            categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        const weeks = db.getAll(DB_KEYS.WEEKS);
        this.filterWeek.innerHTML = '<option value="all">كافة الأسابيع</option>' + 
            weeks.map(w => `<option value="${w.id}">${w.name}</option>`).join('');

        const comps = db.getAll(DB_KEYS.COMPETITIONS);
        this.filterCompetition.innerHTML = '<option value="all">كافة المسابقات</option>' + 
            comps.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    calculateStandings(catFilter, weekFilter, compFilter) {
        let matches = db.getAll(DB_KEYS.MATCH_RECORDS);
        let teams = db.getAll(DB_KEYS.TEAMS);
        const categories = db.getAll(DB_KEYS.CATEGORIES);
        const scoreEntries = db.getAll(DB_KEYS.SCORE_ENTRIES);
        const participants = db.getAll(DB_KEYS.PARTICIPANTS);

        // Apply filters to matches
        if (weekFilter && weekFilter !== 'all') {
            matches = matches.filter(m => m.week_id === weekFilter);
        }
        if (compFilter && compFilter !== 'all') {
            matches = matches.filter(m => m.competition_id === compFilter);
        }

        if (catFilter && catFilter !== 'all') {
            teams = teams.filter(t => t.category_id === catFilter);
        }

        // Initialize team stats map
        const teamMap = {};
        teams.forEach(t => {
            const cat = categories.find(c => c.id === t.category_id);
            teamMap[t.id] = {
                team_id: t.id,
                team_name: t.name,
                category_name: cat ? cat.name : '-',
                category_id: t.category_id,
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                goals_for: 0,
                goals_against: 0,
                penalties: 0,
                points: 0
            };
        });

        // Compute Match Points (3 for win, 1 for draw, 0 for loss)
        matches.forEach(m => {
            const t1 = teamMap[m.team1_id];
            const t2 = teamMap[m.team2_id];

            if (t1) {
                t1.played++;
                t1.goals_for += m.team1_score;
                t1.goals_against += m.team2_score;
            }
            if (t2) {
                t2.played++;
                t2.goals_for += m.team2_score;
                t2.goals_against += m.team1_score;
            }

            if (m.is_draw) {
                if (t1) { t1.drawn++; t1.points += 1; }
                if (t2) { t2.drawn++; t2.points += 1; }
            } else if (m.winner_team_id === m.team1_id) {
                if (t1) { t1.won++; t1.points += 3; }
                if (t2) { t2.lost++; }
            } else if (m.winner_team_id === m.team2_id) {
                if (t2) { t2.won++; t2.points += 3; }
                if (t1) { t1.lost++; }
            }
        });

        // Deduct team penalties if individual penalties exist for players in team
        scoreEntries.forEach(entry => {
            if (entry.entry_type === 'penalty') {
                const part = participants.find(p => p.id === entry.participant_id);
                if (part && teamMap[part.team_id]) {
                    teamMap[part.team_id].penalties += Math.abs(entry.points_change);
                    teamMap[part.team_id].points -= Math.abs(entry.points_change);
                }
            }
        });

        // Convert map to array & sort by Points -> Goal Difference -> Goals For
        const result = Object.values(teamMap).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            const diffA = a.goals_for - a.goals_against;
            const diffB = b.goals_for - b.goals_against;
            if (diffB !== diffA) return diffB - diffA;
            return b.goals_for - a.goals_for;
        });

        return result;
    }

    renderTeamsTable() {
        if (!this.teamsTbody) return;

        const catFilter = this.filterCategory ? this.filterCategory.value : 'all';
        const weekFilter = this.filterWeek ? this.filterWeek.value : 'all';
        const compFilter = this.filterCompetition ? this.filterCompetition.value : 'all';

        const standings = this.calculateStandings(catFilter, weekFilter, compFilter);

        if (standings.length === 0) {
            this.teamsTbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted">لا توجد بيانات متاحة حالياً.</td></tr>';
            return;
        }

        this.teamsTbody.innerHTML = standings.map((item, index) => {
            let rankBadgeClass = '';
            if (index === 0) rankBadgeClass = 'rank-1';
            else if (index === 1) rankBadgeClass = 'rank-2';
            else if (index === 2) rankBadgeClass = 'rank-3';

            return `
                <tr>
                    <td data-label="الترتيب"><span class="rank-badge ${rankBadgeClass}">${index + 1}</span></td>
                    <td data-label="اسم الفريق"><strong style="font-size: 1.05rem; color: #0F172A; font-weight: 800;">${item.team_name}</strong></td>
                    <td data-label="الفئة"><span class="badge badge-accent">${item.category_name}</span></td>
                    <td data-label="لعب"><strong style="color: #0F172A;">${item.played}</strong></td>
                    <td data-label="فوز"><strong class="text-success" style="font-weight: 800;">${item.won}</strong></td>
                    <td data-label="تعادل"><strong style="color: #0F172A;">${item.drawn}</strong></td>
                    <td data-label="خسارة"><strong class="text-danger" style="font-weight: 800;">${item.lost}</strong></td>
                    <td data-label="له"><strong style="color: #0F172A;">${item.goals_for}</strong></td>
                    <td data-label="عليه"><strong style="color: #0F172A;">${item.goals_against}</strong></td>
                    <td data-label="خصم عقوبات">${item.penalties > 0 ? `<strong class="text-danger">-${item.penalties}</strong>` : '<span style="color: #64748B;">0</span>'}</td>
                    <td data-label="النقاط الكلية"><strong style="font-size: 1.2rem; color: #008B82; font-weight: 900;">${item.points}</strong></td>
                </tr>
            `;
        }).join('');
    }

    renderBestPlayersTable() {
        if (!this.bestPlayersTbody) return;

        const catFilter = this.filterCategory ? this.filterCategory.value : 'all';
        const weekFilter = this.filterWeek ? this.filterWeek.value : 'all';
        const compFilter = this.filterCompetition ? this.filterCompetition.value : 'all';

        let scoreEntries = db.getAll(DB_KEYS.SCORE_ENTRIES).filter(e => e.entry_type === 'best_player');
        let matches = db.getAll(DB_KEYS.MATCH_RECORDS);
        let participants = db.getAll(DB_KEYS.PARTICIPANTS);
        const teams = db.getAll(DB_KEYS.TEAMS);
        const categories = db.getAll(DB_KEYS.CATEGORIES);

        // Filter by week/competition via match_id
        if ((weekFilter && weekFilter !== 'all') || (compFilter && compFilter !== 'all')) {
            let validMatches = matches;
            if (weekFilter && weekFilter !== 'all') validMatches = validMatches.filter(m => m.week_id === weekFilter);
            if (compFilter && compFilter !== 'all') validMatches = validMatches.filter(m => m.competition_id === compFilter);
            const validMatchIds = new Set(validMatches.map(m => m.id));
            scoreEntries = scoreEntries.filter(e => e.match_id && validMatchIds.has(e.match_id));
        }

        // Filter by category
        if (catFilter && catFilter !== 'all') {
            participants = participants.filter(p => p.category_id === catFilter);
        }
        const participantSet = new Set(participants.map(p => p.id));

        const playerMap = {};
        scoreEntries.forEach(entry => {
            if (!participantSet.has(entry.participant_id)) return;

            if (!playerMap[entry.participant_id]) {
                const p = participants.find(part => part.id === entry.participant_id);
                if (p) {
                    const team = teams.find(t => t.id === p.team_id);
                    const cat = categories.find(c => c.id === p.category_id);
                    playerMap[entry.participant_id] = {
                        name: p.full_name,
                        team_name: team ? team.name : '-',
                        category_name: cat ? cat.name : '-',
                        count: 0,
                        points: 0
                    };
                }
            }
            if (playerMap[entry.participant_id]) {
                playerMap[entry.participant_id].count++;
                playerMap[entry.participant_id].points += (entry.points_change || 5);
            }
        });

        const list = Object.values(playerMap).sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return b.points - a.points;
        });

        if (list.length === 0) {
            this.bestPlayersTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">لا يوجد لاعبون متميزون مسجلون بعد.</td></tr>';
            return;
        }

        this.bestPlayersTbody.innerHTML = list.map((item, index) => `
            <tr>
                <td data-label="المركز"><strong>#${index + 1}</strong></td>
                <td data-label="الاسم"><i data-lucide="star" style="color: gold; width: 16px;"></i> <strong>${item.name}</strong></td>
                <td data-label="الفريق">${item.team_name}</td>
                <td data-label="الفئة"><span class="badge badge-accent">${item.category_name}</span></td>
                <td data-label="مرات الفوز"><strong class="text-warning">${item.count} مرات</strong></td>
                <td data-label="النقاط">+${item.points} نقطة</td>
            </tr>
        `).join('');
        if (window.lucide) window.lucide.createIcons();
    }

    renderIdealPlayersTable() {
        if (!this.idealPlayersTbody) return;

        const catFilter = this.filterCategory ? this.filterCategory.value : 'all';
        const weekFilter = this.filterWeek ? this.filterWeek.value : 'all';
        const compFilter = this.filterCompetition ? this.filterCompetition.value : 'all';

        let scoreEntries = db.getAll(DB_KEYS.SCORE_ENTRIES).filter(e => e.entry_type === 'ideal_player');
        let matches = db.getAll(DB_KEYS.MATCH_RECORDS);
        let participants = db.getAll(DB_KEYS.PARTICIPANTS);
        const teams = db.getAll(DB_KEYS.TEAMS);
        const categories = db.getAll(DB_KEYS.CATEGORIES);

        // Filter by week/competition via match_id
        if ((weekFilter && weekFilter !== 'all') || (compFilter && compFilter !== 'all')) {
            let validMatches = matches;
            if (weekFilter && weekFilter !== 'all') validMatches = validMatches.filter(m => m.week_id === weekFilter);
            if (compFilter && compFilter !== 'all') validMatches = validMatches.filter(m => m.competition_id === compFilter);
            const validMatchIds = new Set(validMatches.map(m => m.id));
            scoreEntries = scoreEntries.filter(e => e.match_id && validMatchIds.has(e.match_id));
        }

        // Filter by category
        if (catFilter && catFilter !== 'all') {
            participants = participants.filter(p => p.category_id === catFilter);
        }
        const participantSet = new Set(participants.map(p => p.id));

        const playerMap = {};
        scoreEntries.forEach(entry => {
            if (!participantSet.has(entry.participant_id)) return;

            if (!playerMap[entry.participant_id]) {
                const p = participants.find(part => part.id === entry.participant_id);
                if (p) {
                    const team = teams.find(t => t.id === p.team_id);
                    const cat = categories.find(c => c.id === p.category_id);
                    playerMap[entry.participant_id] = {
                        name: p.full_name,
                        team_name: team ? team.name : '-',
                        category_name: cat ? cat.name : '-',
                        count: 0
                    };
                }
            }
            if (playerMap[entry.participant_id]) {
                playerMap[entry.participant_id].count++;
            }
        });

        const list = Object.values(playerMap).sort((a, b) => b.count - a.count);

        if (list.length === 0) {
            this.idealPlayersTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">لا يوجد لاعبون مثاليون مسجلون بعد.</td></tr>';
            return;
        }

        this.idealPlayersTbody.innerHTML = list.map((item, index) => `
            <tr>
                <td data-label="المركز"><strong>#${index + 1}</strong></td>
                <td data-label="الاسم"><i data-lucide="heart" style="color: #ef4444; width: 16px;"></i> <strong>${item.name}</strong></td>
                <td data-label="الفريق">${item.team_name}</td>
                <td data-label="الفئة"><span class="badge badge-accent">${item.category_name}</span></td>
                <td data-label="التكريمات"><strong class="text-success">${item.count} مرات</strong></td>
            </tr>
        `).join('');
        if (window.lucide) window.lucide.createIcons();
    }

    renderPenaltiesLogTable() {
        if (!this.penaltiesTbody) return;

        const scoreEntries = db.getAll(DB_KEYS.SCORE_ENTRIES).filter(e => e.entry_type === 'penalty').reverse();
        const participants = db.getAll(DB_KEYS.PARTICIPANTS);
        const teams = db.getAll(DB_KEYS.TEAMS);
        const supervisors = db.getAll(DB_KEYS.SUPERVISORS);

        if (scoreEntries.length === 0) {
            this.penaltiesTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">لا توجد خصومات أو عقوبات مسجلة.</td></tr>';
            return;
        }

        this.penaltiesTbody.innerHTML = scoreEntries.map(e => {
            const p = participants.find(part => part.id === e.participant_id);
            const team = p ? teams.find(t => t.id === p.team_id) : null;
            const sup = supervisors.find(s => s.id === e.supervisor_id);

            return `
                <tr>
                    <td data-label="التاريخ"><small>${new Date(e.created_at).toLocaleString('ar-SA')}</small></td>
                    <td data-label="اسم المشارك"><strong>${p ? p.full_name : '-'}</strong></td>
                    <td data-label="الفريق">${team ? team.name : '-'}</td>
                    <td data-label="الخصم"><strong class="badge badge-danger">${e.points_change} نقطة</strong></td>
                    <td data-label="سبب الخصم">${e.reason_notes || 'بدون سبب مذكور'}</td>
                    <td data-label="المشرف المنفذ"><small>${sup ? sup.name : 'مشرف'}</small></td>
                </tr>
            `;
        }).join('');
    }

    renderAll() {
        this.renderTeamsTable();
        this.renderBestPlayersTable();
        this.renderIdealPlayersTable();
        this.renderPenaltiesLogTable();
    }
}

const leaderboardComponent = new LeaderboardComponent();
