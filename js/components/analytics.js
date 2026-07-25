/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - ANALYTICS COMPONENT (analytics.js)
   ========================================================================== */

class AnalyticsComponent {
    constructor() {
        this.chartCubs = null;
        this.chartYouths = null;
        this.chartWeekly = null;
    }

    renderCharts() {
        if (typeof Chart === 'undefined') return;

        this.renderCubsChart();
        this.renderYouthsChart();
        this.renderWeeklyChart();
    }

    renderCubsChart() {
        const canvas = document.getElementById('chart-cubs-teams');
        if (!canvas) return;

        const standings = leaderboardComponent.calculateStandings('cat-cubs', 'all', 'all');
        const labels = standings.map(s => s.team_name);
        const pointsData = standings.map(s => s.points);

        if (this.chartCubs) this.chartCubs.destroy();

        this.chartCubs = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'إجمالي النقاط (الأشبال)',
                    data: pointsData,
                    backgroundColor: 'rgba(59, 130, 246, 0.75)',
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#f8fafc', font: { family: 'Cairo' } } }
                },
                scales: {
                    x: { ticks: { color: '#94a3b8', font: { family: 'Cairo' } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
                }
            }
        });
    }

    renderYouthsChart() {
        const canvas = document.getElementById('chart-youths-teams');
        if (!canvas) return;

        const standings = leaderboardComponent.calculateStandings('cat-youths', 'all', 'all');
        const labels = standings.map(s => s.team_name);
        const pointsData = standings.map(s => s.points);

        if (this.chartYouths) this.chartYouths.destroy();

        this.chartYouths = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'إجمالي النقاط (الفتيان)',
                    data: pointsData,
                    backgroundColor: 'rgba(139, 92, 246, 0.75)',
                    borderColor: '#8b5cf6',
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#f8fafc', font: { family: 'Cairo' } } }
                },
                scales: {
                    x: { ticks: { color: '#94a3b8', font: { family: 'Cairo' } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
                }
            }
        });
    }

    renderWeeklyChart() {
        const canvas = document.getElementById('chart-weekly-distribution');
        if (!canvas) return;

        const weeks = db.getAll(DB_KEYS.WEEKS);
        const matches = db.getAll(DB_KEYS.MATCH_RECORDS);

        const labels = weeks.map(w => w.name);
        const counts = weeks.map(w => matches.filter(m => m.week_id === w.id).length);

        if (this.chartWeekly) this.chartWeekly.destroy();

        this.chartWeekly = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'عدد المباريات المسجلة',
                    data: counts,
                    fill: true,
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderColor: '#10b981',
                    tension: 0.3,
                    pointRadius: 6,
                    pointBackgroundColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#f8fafc', font: { family: 'Cairo' } } }
                },
                scales: {
                    x: { ticks: { color: '#94a3b8', font: { family: 'Cairo' } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true, precision: 0 }
                }
            }
        });
    }
}

const analyticsComponent = new AnalyticsComponent();
