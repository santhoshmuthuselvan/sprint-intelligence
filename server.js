import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Helper to ensure directory exists
const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Setup storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        ensureDir(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// API to save report
app.post('/api/report', upload.single('file'), (req, res) => {
    try {
        const { team, week, category } = req.body;
        const file = req.file;

        if (!file || !team || !week || !category) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        const targetDir = path.join(__dirname, 'data', team, week);
        ensureDir(targetDir);

        // Keep original extension
        const ext = path.extname(file.originalname);
        const targetPath = path.join(targetDir, `${category}${ext}`);

        fs.rename(file.path, targetPath, (err) => {
            if (err) {
                console.error('Error moving file:', err);
                return res.status(500).json({ error: 'Failed to save file' });
            }
            res.json({ message: 'Report saved successfully' });
        });
    } catch (error) {
        console.error('Error in /api/report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API to list reports
app.get('/api/reports', (req, res) => {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        return res.json([]);
    }

    const reports = [];
    try {
        const teams = fs.readdirSync(dataDir).filter(f => fs.statSync(path.join(dataDir, f)).isDirectory());

        for (const team of teams) {
            const teamDir = path.join(dataDir, team);
            const weeks = fs.readdirSync(teamDir).filter(f => fs.statSync(path.join(teamDir, f)).isDirectory());

            for (const week of weeks) {
                const weekDir = path.join(teamDir, week);
                const files = fs.readdirSync(weekDir);

                for (const file of files) {
                    if (file.startsWith('.')) continue; // skip hidden files
                    reports.push({
                        team,
                        week,
                        category: path.parse(file).name,
                        file: file,
                        path: `${team}/${week}/${file}`
                    });
                }
            }
        }
        res.json(reports);
    } catch (err) {
        console.error('Error listing reports:', err);
        res.status(500).json({ error: 'Failed to list reports' });
    }
});

// API to get aggregated dashboard data
app.get('/api/dashboard-data', (req, res) => {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        return res.json({ trends: [], userStats: [], distribution: {} });
    }

    try {
        const trends = {}; // { Week: { tasks: 0, points: 0 } }
        const userStats = {}; // { User: { tasks: 0, points: 0 } }
        const typeDist = {}; // { Type: count }
        const priorityDist = {}; // { Priority: count }
        const rawItems = [];

        const teams = fs.readdirSync(dataDir).filter(f => fs.statSync(path.join(dataDir, f)).isDirectory());

        for (const team of teams) {
            const teamDir = path.join(dataDir, team);
            const weeks = fs.readdirSync(teamDir).filter(f => fs.statSync(path.join(teamDir, f)).isDirectory());

            for (const week of weeks) {
                const weekDir = path.join(teamDir, week);
                const files = fs.readdirSync(weekDir);

                for (const file of files) {
                    if (file.startsWith('.')) continue;

                    const fullPath = path.join(weekDir, file);
                    const workbook = xlsx.readFile(fullPath);
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    // Read strict parsing, look for header row
                    const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

                    // Find header row index
                    let headerIndex = -1;
                    for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
                        const row = jsonData[i];
                        if (row && row.includes('Item Id') && row.includes('Assignee')) {
                            headerIndex = i;
                            break;
                        }
                    }

                    if (headerIndex !== -1) {
                        // Re-parse with header
                        const rows = xlsx.utils.sheet_to_json(sheet, { header: headerIndex, range: headerIndex });

                        // Initialize week in trends if not exists
                        // Try to normalize week name/date if possible, else use directory name
                        // Simple aggregation for now
                        if (!trends[week]) trends[week] = { name: week, tasks: 0, points: 0 };


                        rows.forEach(row => {
                            // Filter valid items (e.g. have an ID)
                            if (!row['Item Id']) return;

                            // Increment trends
                            trends[week].tasks++;
                            // Points extraction (some might be strings)
                            const points = parseFloat(row['Estimation Points']) || 0;
                            trends[week].points += points;

                            // User Stats
                            const assignees = row['Assignee'] ? row['Assignee'].split(',').map(s => s.trim()) : ['Unassigned'];
                            assignees.forEach(user => {
                                if (!userStats[user]) userStats[user] = { name: user, tasks: 0, points: 0 };
                                userStats[user].tasks++;
                                userStats[user].points += points;
                            });

                            // Distributions
                            const type = row['Item Type'] || 'Unknown';
                            typeDist[type] = (typeDist[type] || 0) + 1;

                            const priority = row['Priority'] || 'Unknown';
                            priorityDist[priority] = (priorityDist[priority] || 0) + 1;

                            // Add raw item for frontend filtering
                            rawItems.push({
                                id: row['Item Id'],
                                name: row['Item Name'],
                                description: row['Description'],
                                team: team,
                                week: week,
                                sprint: row['Sprint'],
                                assignee: row['Assignee'],
                                status: row['Status'],
                                type: row['Item Type'],
                                priority: row['Priority'],
                                points: points,
                                epic: row['Epic'],
                                tags: row['Tags']
                            });
                        });
                    }
                }
            }
        }

        res.json({
            trends: Object.values(trends),
            userStats: Object.values(userStats).sort((a, b) => b.tasks - a.tasks),
            distribution: {
                type: Object.entries(typeDist).map(([name, value]) => ({ name, value })),
                priority: Object.entries(priorityDist).map(([name, value]) => ({ name, value }))
            },
            rawItems: rawItems
        });

    } catch (err) {
        console.error('Error in dashboard data aggregation:', err);
        res.status(500).json({ error: 'Failed to aggregate data' });
    }
});

// API to read a specific report content and return as JSON
app.get('/api/report-content', (req, res) => {
    try {
        const { path: reportPath } = req.query;
        if (!reportPath || typeof reportPath !== 'string') {
            return res.status(400).json({ error: 'Missing path parameter' });
        }

        // Security: Prevent directory traversal
        const safePath = path.normalize(reportPath).replace(/^(\.\.[\/\\])+/, '');
        const fullPath = path.join(__dirname, 'data', safePath);

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const workbook = xlsx.readFile(fullPath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

        res.json(data);
    } catch (error) {
        console.error('Error reading file:', error);
        res.status(500).json({ error: 'Failed to read file content' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
