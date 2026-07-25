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
        document.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTabId = btn.getAttribute('data-tab');
                document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                const targetTab = document.getElementById(targetTabId);
                if (targetTab) targetTab.classList.add('active');
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

        const catFilter = this.filterCategory.value;
        const weekFilter = this.filterWeek.value;
        const compFilter = this.filterCompetition.value;

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
                    <td><span class="rank-badge ${rankBadgeClass}">${index + 1}</span></td>
                    <td><strong>${item.team_name}</strong></td>
                    <td><span class="badge badge-accent">${item.category_name}</span></td>
                    <td>${item.played}</td>
                    <td class="text-success font-weight-bold">${item.won}</td>
                    <td>${item.drawn}</td>
                    <td class="text-danger">${item.lost}</td>
                    <td>${item.goals_for}</td>
                    <td>${item.goals_against}</td>
                    <td class="text-danger">${item.penalties > 0 ? `-${item.penalties}` : '0'}</td>
                    <td><strong style="font-size: 1.1rem; color: var(--primary);">${item.points}</strong></td>
                </tr>
            `;
        }).join('');
    }

    renderBestPlayersTable() {
        if (!this.bestPlayersTbody) return;

        const scoreEntries = db.getAll(DB_KEYS.SCORE_ENTRIES).filter(e => e.entry_type === 'best_player');
        const participants = db.getAll(DB_KEYS.PARTICIPANTS);
        const teams = db.getAll(DB_KEYS.TEAMS);
        const categories = db.getAll(DB_KEYS.CATEGORIES);

        const playerMap = {};
        scoreEntries.forEach(entry => {
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

        const list = Object.values(playerMap).sort((a, b) => b.count - a.count);

        if (list.length === 0) {
            this.bestPlayersTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">لا يوجد لاعبون متميزون مسجلون بعد.</td></tr>';
            return;
        }

        this.bestPlayersTbody.innerHTML = list.map((item, index) => `
            <tr>
                <td><strong>#${index + 1}</strong></td>
                <td><i data-lucide="star" style="color: gold; width: 16px;"></i> <strong>${item.name}</strong></td>
                <td>${item.team_name}</td>
                <td><span class="badge badge-accent">${item.category_name}</span></td>
                <td><strong class="text-warning">${item.count} مرات</strong></td>
                <td>+${item.points} نقطة</td>
            </tr>
        `).join('');
        lucide.createIcons();
    }

    renderIdealPlayersTable() {
        if (!this.idealPlayersTbody) return;

        const scoreEntries = db.getAll(DB_KEYS.SCORE_ENTRIES).filter(e => e.entry_type === 'ideal_player');
        const participants = db.getAll(DB_KEYS.PARTICIPANTS);
        const teams = db.getAll(DB_KEYS.TEAMS);
        const categories = db.getAll(DB_KEYS.CATEGORIES);

        const playerMap = {};
        scoreEntries.forEach(entry => {
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
                <td><strong>#${index + 1}</strong></td>
                <td><i data-lucide="heart" style="color: #ef4444; width: 16px;"></i> <strong>${item.name}</strong></td>
                <td>${item.team_name}</td>
                <td><span class="badge badge-accent">${item.category_name}</span></td>
                <td><strong class="text-success">${item.count} مرات</strong></td>
            </tr>
        `).join('');
        lucide.createIcons();
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
                    <td><small>${new Date(e.created_at).toLocaleString('ar-SA')}</small></td>
                    <td><strong>${p ? p.full_name : '-'}</strong></td>
                    <td>${team ? team.name : '-'}</td>
                    <td><strong class="badge badge-danger">${e.points_change} نقطة</strong></td>
                    <td>${e.reason_notes || 'بدون سبب مذكور'}</td>
                    <td><small>${sup ? sup.name : 'مشرف'}</small></td>
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
