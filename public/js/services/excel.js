/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - EXCEL IMPORT/EXPORT SERVICE (excel.js)
   ========================================================================== */

class ExcelService {
    
    // Export Teams Standings to XLSX
    exportStandingsToExcel() {
        if (typeof XLSX === 'undefined') {
            alert('مكتبة SheetJS غير محملة، يرجى الاتصال بالإنترنت.');
            return;
        }

        const standings = leaderboardComponent.calculateStandings('all', 'all', 'all');
        const data = standings.map((item, index) => ({
            'المركز': index + 1,
            'اسم الفريق': item.team_name,
            'الفئة': item.category_name,
            'عدد المباريات': item.played,
            'فوز': item.won,
            'تعادل': item.drawn,
            'خسارة': item.lost,
            'أهداف له': item.goals_for,
            'أهداف عليه': item.goals_against,
            'الخصومات': item.penalties,
            'إجمالي النقاط': item.points
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'جدول الترتيب العام');

        XLSX.writeFile(workbook, `ترتيب_المنافسات_${new Date().toISOString().slice(0,10)}.xlsx`);
    }

    // Export Full Match Logs to XLSX
    exportMatchLogsToExcel() {
        if (typeof XLSX === 'undefined') return;

        const matches = db.getAll(DB_KEYS.MATCH_RECORDS);
        const teams = db.getAll(DB_KEYS.TEAMS);
        const comps = db.getAll(DB_KEYS.COMPETITIONS);
        const weeks = db.getAll(DB_KEYS.WEEKS);
        const supervisors = db.getAll(DB_KEYS.SUPERVISORS);

        const data = matches.map(m => {
            const team1 = teams.find(t => t.id === m.team1_id);
            const team2 = teams.find(t => t.id === m.team2_id);
            const winnerTeam = teams.find(t => t.id === m.winner_team_id);
            const comp = comps.find(c => c.id === m.competition_id);
            const week = weeks.find(w => w.id === m.week_id);
            const supervisor = supervisors.find(s => s.id === m.supervisor_id);

            return {
                'معرف النتيجة': m.id,
                'التاريخ': new Date(m.created_at).toLocaleString('ar-SA'),
                'الأسبوع': week ? week.name : '-',
                'المسابقة': comp ? comp.name : '-',
                'الفريق الأول': team1 ? team1.name : '-',
                'أهداف الفريق الأول': m.team1_score,
                'الفريق الثاني': team2 ? team2.name : '-',
                'أهداف الفريق الثاني': m.team2_score,
                'النتيجة': m.is_draw ? 'تعادل' : (winnerTeam ? `فوز ${winnerTeam.name}` : '-'),
                'المشرف المسجل': supervisor ? supervisor.name : 'غير مسجل'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل النتائج التفصيلي');

        XLSX.writeFile(workbook, `سجل_نتائج_المنافسات_${new Date().toISOString().slice(0,10)}.xlsx`);
    }

    // Export Participants List
    exportParticipantsToExcel() {
        if (typeof XLSX === 'undefined') return;

        const participants = db.getAll(DB_KEYS.PARTICIPANTS);
        const teams = db.getAll(DB_KEYS.TEAMS);
        const categories = db.getAll(DB_KEYS.CATEGORIES);

        const data = participants.map((p, i) => {
            const team = teams.find(t => t.id === p.team_id);
            const cat = categories.find(c => c.id === p.category_id);
            return {
                '#': i + 1,
                'الاسم الثلاثي': p.full_name,
                'الفريق': team ? team.name : '-',
                'الفئة': cat ? cat.name : '-'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'قائمة المشاركين');

        XLSX.writeFile(workbook, `المشاركون_والفرق_${new Date().toISOString().slice(0,10)}.xlsx`);
    }

    // Download Sample Template for Excel Import
    downloadSampleTemplate() {
        if (typeof XLSX === 'undefined') return;

        const sampleData = [
            { 'الاسم الثلاثي': 'عبدالرحمن محمد العلي', 'اسم الفريق': 'أشبال 1', 'الفئة': 'الأشبال' },
            { 'الاسم الثلاثي': 'خالد فهد الزهراني', 'اسم الفريق': 'أشبال 1', 'الفئة': 'الأشبال' },
            { 'الاسم الثلاثي': 'سعد إبراهيم العتيبي', 'اسم الفريق': 'فتيان 1', 'الفئة': 'الفتيان' },
            { 'الاسم الثلاثي': 'يوسف صالح القحطاني', 'اسم الفريق': 'فتيان 2', 'الفئة': 'الفتيان' }
        ];

        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'نموذج استيراد المشاركين');

        XLSX.writeFile(workbook, 'نموذج_استيراد_المشاركين_النموذجي.xlsx');
    }

    // Import Participants from Excel file
    importParticipantsFromExcel(file, callback) {
        if (typeof XLSX === 'undefined') {
            callback({ success: false, message: 'مكتبة SheetJS غير متوفرة' });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet);

                if (!rows || rows.length === 0) {
                    callback({ success: false, message: 'الملف فارغ أو لا يحتوي على بيانات صالحة' });
                    return;
                }

                let importedCount = 0;
                const categories = db.getAll(DB_KEYS.CATEGORIES);
                const teams = db.getAll(DB_KEYS.TEAMS);
                const participants = db.getAll(DB_KEYS.PARTICIPANTS);

                rows.forEach(row => {
                    const fullName = row['الاسم الثلاثي'] || row['اسم المشارك'] || row['الاسم'];
                    const teamName = row['اسم الفريق'] || row['الفريق'];
                    const categoryName = row['الفئة'] || row['الفئة العمرية'];

                    if (fullName && teamName) {
                        // Find or create Category
                        let catObj = categories.find(c => c.name.trim() === (categoryName || '').trim());
                        if (!catObj && categoryName) {
                            catObj = db.insert(DB_KEYS.CATEGORIES, { name: categoryName.trim(), description: 'تمت إضافتها عبر استيراد إكسل' });
                            categories.push(catObj);
                        }

                        // Find or create Team
                        let teamObj = teams.find(t => t.name.trim() === teamName.trim());
                        if (!teamObj) {
                            teamObj = db.insert(DB_KEYS.TEAMS, {
                                name: teamName.trim(),
                                category_id: catObj ? catObj.id : (categories[0] ? categories[0].id : 'cat-cubs'),
                                color: '#3b82f6'
                            });
                            teams.push(teamObj);
                        }

                        // Insert Participant
                        db.insert(DB_KEYS.PARTICIPANTS, {
                            full_name: fullName.trim(),
                            team_id: teamObj.id,
                            category_id: teamObj.category_id
                        });
                        importedCount++;
                    }
                });

                auditService.log(authService.getCurrentUser()?.id, 'استيراد إكسل', `تم استيراد ${importedCount} مشارك من ملف Excel`);

                callback({ success: true, count: importedCount });
            } catch (err) {
                console.error("Excel import error:", err);
                callback({ success: false, message: 'حدث خطأ أثناء قراءة ملف الإكسل' });
            }
        };

        reader.readAsArrayBuffer(file);
    }
}

const excelService = new ExcelService();
