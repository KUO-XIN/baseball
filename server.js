
const express = require('express');
const path = require('path');

const {
    teams,
    findTeam,
    getPlayersForTeam,
    simulateMatch
} = require('./simulator');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// 取得指定球隊的球員名單
app.get('/api/teams/:teamId/players', (req, res) => {
    try {
        const players = getPlayersForTeam(req.params.teamId);

        res.json({
            success: true,
            batters: players.batters,
            pitchers: players.pitchers
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
});

// 執行比賽模擬
app.post('/api/simulate', (req, res) => {
    try {
        const {
            teamAId,
            teamBId,
            lineupA,
            lineupB,
            pitcherAId,
            pitcherBId
        } = req.body;

        if (!teamAId || !teamBId) {
            return res.status(400).json({
                success: false,
                message: '\u8ACB\u9078\u64C7\u5169\u652F\u7403\u968A'
            });
        }

        if (teamAId === teamBId) {
            return res.status(400).json({
                success: false,
                message: '\u4E0D\u80FD\u9078\u64C7\u76F8\u540C\u7684\u7403\u968A'
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

        if (
            !Array.isArray(lineupA) ||
            !Array.isArray(lineupB) ||
            lineupA.length !== 9 ||
            lineupB.length !== 9 ||
            !pitcherAId ||
            !pitcherBId
        ) {
            return res.status(400).json({
                success: false,
                message: '\u8ACB\u5B8C\u6210\u5169\u968A\u7684\u5148\u767C\u9663\u5BB9\u9078\u64C7'
            });
        }

        const result = simulateMatch(
            teamA,
            teamB,
            lineupA,
            lineupB,
            pitcherAId,
            pitcherBId
        );

        res.json({
            success: true,
            result
        });

    } catch (error) {
        console.error(error);

        res.status(400).json({
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
