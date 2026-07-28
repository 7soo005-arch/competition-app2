/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - NEXT.JS / REACT ROOT COMPONENT
   ========================================================================== */

import React, { useState, useEffect } from 'react';
import { supabaseDataService } from '../../lib/supabaseClient';

export default function ReactApp() {
    const [view, setView] = useState('scoring'); // 'scoring' | 'leaderboard' | 'analytics' | 'admin' | 'excel'
    const [currentUser, setCurrentUser] = useState(null);
    const [categories, setCategories] = useState([]);
    const [teams, setTeams] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [competitions, setCompetitions] = useState([]);
    const [weeks, setWeeks] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [matches, setMatches] = useState([]);
    const [scoreEntries, setScoreEntries] = useState([]);

    // Edit State
    const [editingMatchId, setEditingMatchId] = useState(null);

    // Scoring Form State
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedCompetition, setSelectedCompetition] = useState('');
    const [selectedWeek, setSelectedWeek] = useState('');
    const [team1Id, setTeam1Id] = useState('');
    const [team2Id, setTeam2Id] = useState('');
    const [team1Score, setTeam1Score] = useState(0);
    const [team2Score, setTeam2Score] = useState(0);
    const [matchResult, setMatchResult] = useState('draw'); // 'team1' | 'draw' | 'team2'
    const [bestPlayerId, setBestPlayerId] = useState('');
    const [topScorerId, setTopScorerId] = useState('');
    const [bestGkId, setBestGkId] = useState('');
    const [idealPlayerId, setIdealPlayerId] = useState('');
    const [penaltyPlayerId, setPenaltyPlayerId] = useState('');
    const [penaltyPoints, setPenaltyPoints] = useState('');
    const [penaltyReason, setPenaltyReason] = useState('');

    // Load initial Supabase data
    useEffect(() => {
        loadAllData();
        // Load active session
        const session = localStorage.getItem('comp_active_session');
        if (session) {
            try { setCurrentUser(JSON.parse(session)); } catch (e) {}
        }
    }, []);

    const loadAllData = async () => {
        const [cats, tms, parts, comps, wks, sups, mtchs, scrs] = await Promise.all([
            supabaseDataService.getCategories(),
            supabaseDataService.getTeams(),
            supabaseDataService.getParticipants(),
            supabaseDataService.getCompetitions(),
            supabaseDataService.getWeeks(),
            supabaseDataService.getSupervisors(),
            supabaseDataService.getMatchRecords(),
            supabaseDataService.getScoreEntries()
        ]);

        setCategories(cats || []);
        setTeams(tms || []);
        setParticipants(parts || []);
        setCompetitions(comps || []);
        setWeeks(wks || []);
        setSupervisors(sups || []);
        setMatches(mtchs || []);
        setScoreEntries(scrs || []);

        // Default active week
        const activeWk = (wks || []).find(w => w.is_active);
        if (activeWk && !selectedWeek) setSelectedWeek(activeWk.id);
    };

    // Filter teams by category
    const filteredTeams = selectedCategory 
        ? teams.filter(t => t.category_id === selectedCategory) 
        : teams;

    // Filter participants strictly belonging to the two competing teams in the match
    const matchParticipants = (team1Id || team2Id)
        ? participants.filter(p => p.team_id === team1Id || p.team_id === team2Id)
        : (selectedCategory ? participants.filter(p => p.category_id === selectedCategory) : participants);

    // Cancel Edit
    const cancelEdit = () => {
        setEditingMatchId(null);
        setTeam1Score(0);
        setTeam2Score(0);
        setBestPlayerId('');
        setTopScorerId('');
        setBestGkId('');
        setIdealPlayerId('');
        setPenaltyPlayerId('');
        setPenaltyPoints('');
        setPenaltyReason('');
    };

    const isAdmin = currentUser && currentUser.role === 'admin';

    // Edit Match Handler
    const handleEditMatch = (match) => {
        if (!isAdmin) {
            alert('هذا الإجراء متاح فقط لمدير النظام.');
            return;
        }
        setEditingMatchId(match.id);
        setSelectedCategory(match.category_id || '');
        setSelectedCompetition(match.competition_id || '');
        setSelectedWeek(match.week_id || '');
        setTeam1Id(match.team1_id || '');
        setTeam2Id(match.team2_id || '');
        setTeam1Score(match.team1_score || 0);
        setTeam2Score(match.team2_score || 0);
        setMatchResult(match.is_draw ? 'draw' : (match.winner_team_id === match.team1_id ? 'team1' : 'team2'));

        const mEntries = scoreEntries.filter(e => e.match_id === match.id);
        const best = mEntries.find(e => e.entry_type === 'best_player');
        const topScorer = mEntries.find(e => e.entry_type === 'top_scorer');
        const bestGk = mEntries.find(e => e.entry_type === 'best_goalkeeper');
        const ideal = mEntries.find(e => e.entry_type === 'ideal_player');
        const pen = mEntries.find(e => e.entry_type === 'penalty');

        setBestPlayerId(best ? best.participant_id : '');
        setTopScorerId(topScorer ? topScorer.participant_id : '');
        setBestGkId(bestGk ? bestGk.participant_id : '');
        setIdealPlayerId(ideal ? ideal.participant_id : '');

        setPenaltyPlayerId(pen ? pen.participant_id : '');
        setPenaltyPoints(pen ? Math.abs(pen.points_change) : '');
        setPenaltyReason(pen ? (pen.reason_notes || '') : '');

        setView('scoring');
    };

    // Delete Match Handler
    const handleDeleteMatch = async (matchId) => {
        if (!isAdmin) {
            alert('هذا الإجراء متاح فقط لمدير النظام.');
            return;
        }

        const match = matches.find(m => m.id === matchId);
        const t1 = teams.find(t => t.id === match?.team1_id)?.name || 'الفريق الأول';
        const t2 = teams.find(t => t.id === match?.team2_id)?.name || 'الفريق الثاني';

        if (!confirm(`هل أنت متاكد من رغبتك في حذف سجل مباراة (${t1} ضد ${t2}) نهائياً؟ سيتسبب ذلك في إعادة حساب الترتيب.`)) {
            return;
        }

        await supabaseDataService.deleteMatchRecord(matchId);
        await supabaseDataService.deleteScoreEntriesForMatch(matchId);

        const logDetail = `قام المشرف ${currentUser.name} بحذف سجل مباراة (${t1} ضد ${t2})`;
        await supabaseDataService.createAuditLog({
            supervisor_id: currentUser.id,
            action: 'حذف مباراة',
            details: logDetail,
            timestamp: new Date().toISOString()
        });

        if (editingMatchId === matchId) cancelEdit();

        alert('تم حذف سجل المباراة وإعادة حساب كافة النقاط والترتيب بنجاح!');
        loadAllData();
    };

    // Submit Score Handler
    const handleScoreSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert('يرجى تسجيل الدخول أولاً لتسجيل وسلسلة النقاط بحسابك!');
            return;
        }

        if (team1Id === team2Id) {
            alert('لا يمكن اختيار نفس الفريق لطرفي المباراة!');
            return;
        }

        const isEditing = !!editingMatchId;
        const matchRecordId = isEditing ? editingMatchId : ('match_' + Date.now());

        const existingMatch = isEditing ? matches.find(m => m.id === matchRecordId) : null;

        const matchRecord = {
            id: matchRecordId,
            category_id: selectedCategory,
            competition_id: selectedCompetition,
            week_id: selectedWeek,
            team1_id: team1Id,
            team2_id: team2Id,
            team1_score: parseInt(team1Score) || 0,
            team2_score: parseInt(team2Score) || 0,
            winner_team_id: matchResult === 'team1' ? team1Id : (matchResult === 'team2' ? team2Id : null),
            is_draw: matchResult === 'draw',
            supervisor_id: currentUser.id,
            created_at: existingMatch ? existingMatch.created_at : new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (isEditing) {
            await supabaseDataService.updateMatchRecord(matchRecordId, matchRecord);
            await supabaseDataService.deleteScoreEntriesForMatch(matchRecordId);
        } else {
            await supabaseDataService.createMatchRecord(matchRecord);
        }

        // Individual Awards
        if (bestPlayerId) {
            await supabaseDataService.createScoreEntry({
                match_id: matchRecord.id,
                participant_id: bestPlayerId,
                entry_type: 'best_player',
                points_change: 5,
                supervisor_id: currentUser.id,
                created_at: new Date().toISOString()
            });
        }

        if (topScorerId) {
            await supabaseDataService.createScoreEntry({
                match_id: matchRecord.id,
                participant_id: topScorerId,
                entry_type: 'top_scorer',
                points_change: 3,
                supervisor_id: currentUser.id,
                created_at: new Date().toISOString()
            });
        }

        if (bestGkId) {
            await supabaseDataService.createScoreEntry({
                match_id: matchRecord.id,
                participant_id: bestGkId,
                entry_type: 'best_goalkeeper',
                points_change: 3,
                supervisor_id: currentUser.id,
                created_at: new Date().toISOString()
            });
        }

        if (idealPlayerId) {
            await supabaseDataService.createScoreEntry({
                match_id: matchRecord.id,
                participant_id: idealPlayerId,
                entry_type: 'ideal_player',
                points_change: 3,
                supervisor_id: currentUser.id,
                created_at: new Date().toISOString()
            });
        }

        if (penaltyPlayerId && penaltyPoints > 0) {
            await supabaseDataService.createScoreEntry({
                match_id: matchRecord.id,
                participant_id: penaltyPlayerId,
                entry_type: 'penalty',
                points_change: -Math.abs(parseInt(penaltyPoints)),
                reason_notes: penaltyReason || 'خصم سلوكي / فني',
                supervisor_id: currentUser.id,
                created_at: new Date().toISOString()
            });
        }

        const t1 = teams.find(t => t.id === team1Id)?.name || 'الفريق الأول';
        const t2 = teams.find(t => t.id === team2Id)?.name || 'الفريق الثاني';
        const actionName = isEditing ? 'تعديل مباراة' : 'إدخال مباراة';
        const logDetail = isEditing 
            ? `قام المشرف ${currentUser.name} بتعديل بيانات مباراة (${t1} ${team1Score} - ${team2Score} ${t2})`
            : `تم رصد مباراة (${t1} ${team1Score} - ${team2Score} ${t2}) بواسطة المشرف ${currentUser.name}`;

        await supabaseDataService.createAuditLog({
            supervisor_id: currentUser.id,
            action: actionName,
            details: logDetail,
            timestamp: new Date().toISOString()
        });

        alert(isEditing ? 'تم تحديث بيانات المباراة وتعديل النقاط بنجاح!' : 'تم اعتماد وتسجيل نتيجة المباراة في قواعد البيانات بنجاح!');
        cancelEdit();
        loadAllData();
    };

    return (
        <div className="next-react-container" dir="rtl">
            {/* Header */}
            <header className="main-header">
                <div className="header-container">
                    <div className="brand">
                        <div className="logo-icon">🏆</div>
                        <div className="brand-text">
                            <h1>منصة المنافسات الكبرى (React + Supabase)</h1>
                            <span className="sub-title">برنامج الأشبال والفتيان</span>
                        </div>
                    </div>

                    <nav className="main-nav">
                        <button className={`nav-btn ${view === 'scoring' ? 'active' : ''}`} onClick={() => setView('scoring')}>تسجيل النقاط</button>
                        <button className={`nav-btn ${view === 'leaderboard' ? 'active' : ''}`} onClick={() => setView('leaderboard')}>جدول الترتيب</button>
                        <button className={`nav-btn ${view === 'analytics' ? 'active' : ''}`} onClick={() => setView('analytics')}>الإحصائيات</button>
                        {currentUser?.role === 'admin' && (
                            <button className={`nav-btn ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>لوحة الإدارة</button>
                        )}
                    </nav>

                    <div className="user-auth-bar">
                        {currentUser ? (
                            <div className="user-info-chip">
                                <span>{currentUser.name} ({currentUser.role === 'admin' ? 'مدير' : 'مشرف'})</span>
                                <button className="btn btn-sm btn-danger" onClick={() => { localStorage.removeItem('comp_active_session'); setCurrentUser(null); }}>خروج</button>
                            </div>
                        ) : (
                            <button className="btn btn-primary btn-sm" onClick={() => {
                                const user = { id: 'sup-admin', name: 'مدير النظام', role: 'admin' };
                                localStorage.setItem('comp_active_session', JSON.stringify(user));
                                setCurrentUser(user);
                            }}>تسجيل الدخول (Quick Admin)</button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main App Content */}
            <main className="app-body">
                {view === 'scoring' && (
                    <section className="app-view active">
                        <div className="page-header">
                            <h2>{editingMatchId ? 'تعديل نتيجة مباراة مسجلة' : 'تسجيل نقاط برنامج المنافسة'}</h2>
                        </div>
                        <div className="glass-card scoring-form-card">
                            <form onSubmit={handleScoreSubmit}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>الفئة العمرية *</label>
                                        <select className="form-control" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} required>
                                            <option value="">-- اختر الفئة --</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>نوع المسابقة / الفقرة *</label>
                                        <select className="form-control" value={selectedCompetition} onChange={e => setSelectedCompetition(e.target.value)} required>
                                            <option value="">-- اختر الفقرة --</option>
                                            {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>الأسبوع *</label>
                                        <select className="form-control" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} required>
                                            <option value="">-- اختر الأسبوع --</option>
                                            {weeks.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="match-teams-selector mt-3">
                                    <div className="team-box">
                                        <label>الفريق الأول *</label>
                                        <select className="form-control" value={team1Id} onChange={e => setTeam1Id(e.target.value)} required>
                                            <option value="">-- اختر الفريق الأول --</option>
                                            {filteredTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <input type="number" className="form-control text-center mt-2" value={team1Score} onChange={e => setTeam1Score(e.target.value)} min="0" />
                                    </div>
                                    <div className="versus-divider">ضد</div>
                                    <div className="team-box">
                                        <label>الفريق الثاني *</label>
                                        <select className="form-control" value={team2Id} onChange={e => setTeam2Id(e.target.value)} required>
                                            <option value="">-- اختر الفريق الثاني --</option>
                                            {filteredTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <input type="number" className="form-control text-center mt-2" value={team2Score} onChange={e => setTeam2Score(e.target.value)} min="0" />
                                    </div>
                                </div>

                                <div className="form-actions mt-4" style={{ display: 'flex', gap: '12px' }}>
                                    <button type="submit" className={`btn ${editingMatchId ? 'btn-warning' : 'btn-success'} btn-lg`} style={{ flex: 1 }}>
                                        {editingMatchId ? 'تحديث وتعديل نتيجة المباراة' : 'اعتماد وتسجيل نقاط المباراة'}
                                    </button>
                                    {editingMatchId && (
                                        <button type="button" className="btn btn-secondary btn-lg" onClick={cancelEdit}>
                                            إلغاء التعديل
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* Recent Matches Feed with Edit and Delete */}
                        <div className="glass-card mt-4">
                            <h3>آخر التسجيلات والمباريات</h3>
                            <div className="recent-list mt-3">
                                {matches.slice(0, 15).map(m => {
                                    const t1 = teams.find(t => t.id === m.team1_id)?.name || '-';
                                    const t2 = teams.find(t => t.id === m.team2_id)?.name || '-';
                                    const comp = competitions.find(c => c.id === m.competition_id)?.name || '-';
                                    const week = weeks.find(w => w.id === m.week_id)?.name || '-';
                                    const supervisor = supervisors.find(s => s.id === m.supervisor_id)?.name || 'مشرف';

                                    return (
                                        <div key={m.id} className="recent-item">
                                            <div className="header">
                                                <span>{week} | {comp}</span>
                                                <span className="badge badge-accent">{new Date(m.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className="body text-center my-1">
                                                <strong>{t1} ({m.team1_score})</strong> ضد <strong>({m.team2_score}) {t2}</strong>
                                            </div>
                                            <div className="footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                                <span>رُصد بواسطة: {supervisor}</span>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button className="btn-ghost icon-only" title="تعديل" onClick={() => handleEditMatch(m)}>✏️</button>
                                                    <button className="btn-ghost icon-only text-danger" title="حذف" onClick={() => handleDeleteMatch(m.id)}>🗑️</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
