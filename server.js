
const express = require('express');
const path = require('path');

const {
    teams,
    findTeam,
    simulateMatch
} = require('./simulator');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 測試中文編碼
app.get('/test-encoding', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    res.send(
        '\u5473\u5168\u9F8D\u3001\u4E2D\u4FE1\u5144\u5F1F\u3001\u6A21\u64EC\u7D50\u679C\u3001\u9810\u671F\u5F97\u5206'
    );
});

// 取得球隊列表
app.get('/api/teams', (req, res) => {
    res.json({
        success: true,
        teams: teams.map(team => ({
            teamId: team.teamId,
            teamName: team.teamName
        }))
    });
});

// 執行比賽模擬
app.post('/api/simulate', (req, res) => {
    try {
        const { teamAId, teamBId } = req.body;

        if (!teamAId || !teamBId) {
            return res.status(400).json({
                success: false,
                message: '\u8ACB\u9078\u64C7\u5169\u652F\u7403\u968A'
            });
        }

        const teamA = findTeam(teamAId);
        const teamB = findTeam(teamBId);

        if (!teamA || !teamB) {
            return res.status(404).json({
                success: false,
                message: '\u627E\u4E0D\u5230\u6307\u5B9A\u7403\u968A'
            });
        }

        if (teamAId === teamBId) {
            return res.status(400).json({
                success: false,
                message: '\u4E0D\u80FD\u9078\u64C7\u76F8\u540C\u7684\u7403\u968A'
            });
        }

        const result = simulateMatch(teamA, teamB);

        res.json({
            success: true,
            result
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log('================================');
    console.log('CPBL Simulator \u5DF2\u555F\u52D5');
    console.log('\u7DB2\u5740\uFF1A' + `http://localhost:${PORT}`);
    console.log('================================');
});
