
const fs = require('fs');
const path = require('path');

const SIMULATION_COUNT = 10000;
const BASE_RUNS = 4.5;

const dataPath = path.join(__dirname, 'team-stats.json');

if (!fs.existsSync(dataPath)) {
    throw new Error('找不到 team-stats.json');
}

const data = JSON.parse(
    fs.readFileSync(dataPath, 'utf8')
);

const teams = data.teams;
const league = data.league;

function poisson(lambda) {
    if (!Number.isFinite(lambda) || lambda < 0) {
        throw new Error('無效的 Poisson 參數');
    }

    if (lambda === 0) return 0;

    const limit = Math.exp(-lambda);
    let product = 1;
    let count = 0;

    do {
        count++;
        product *= Math.random();
    } while (product > limit);

    return count - 1;
}

function calculateExpectedRuns(team, opponent) {
    const battingWoba = team.batting.woba;
    const pitchingWoba = opponent.pitching.wobaAgainst;

    if (
        !Number.isFinite(battingWoba) ||
        !Number.isFinite(pitchingWoba) ||
        !Number.isFinite(league.battingWoba) ||
        !Number.isFinite(league.pitchingWobaAgainst) ||
        league.battingWoba <= 0 ||
        league.pitchingWobaAgainst <= 0
    ) {
        throw new Error('球隊統計資料無效');
    }

    const battingFactor =
        battingWoba / league.battingWoba;

    const pitchingFactor =
        pitchingWoba / league.pitchingWobaAgainst;

    return BASE_RUNS * battingFactor * pitchingFactor;
}

function findTeam(teamId) {
    return teams.find(team => team.teamId === teamId);
}

function simulateMatch(teamA, teamB) {
    if (!teamA || !teamB) {
        throw new Error('找不到指定球隊');
    }

    if (teamA.teamId === teamB.teamId) {
        throw new Error('不能選擇相同的球隊');
    }

    const expectedA =
        calculateExpectedRuns(teamA, teamB);

    const expectedB =
        calculateExpectedRuns(teamB, teamA);

    let winsA = 0;
    let winsB = 0;
    let draws = 0;

    let totalScoreA = 0;
    let totalScoreB = 0;

    const scoreDistribution = {};

    for (let i = 0; i < SIMULATION_COUNT; i++) {
        const scoreA = poisson(expectedA);
        const scoreB = poisson(expectedB);

        totalScoreA += scoreA;
        totalScoreB += scoreB;

        const scoreKey = `${scoreA}-${scoreB}`;

        scoreDistribution[scoreKey] =
            (scoreDistribution[scoreKey] || 0) + 1;

        if (scoreA > scoreB) {
            winsA++;
        } else if (scoreB > scoreA) {
            winsB++;
        } else {
            draws++;
        }
    }

    return {
        teamA: {
            teamId: teamA.teamId,
            name: teamA.teamName,
            expectedRuns: Number(expectedA.toFixed(3)),
            averageScore: Number(
                (totalScoreA / SIMULATION_COUNT).toFixed(3)
            ),
            wins: winsA,
            winRate: Number(
                (winsA / SIMULATION_COUNT * 100).toFixed(2)
            )
        },

        teamB: {
            teamId: teamB.teamId,
            name: teamB.teamName,
            expectedRuns: Number(expectedB.toFixed(3)),
            averageScore: Number(
                (totalScoreB / SIMULATION_COUNT).toFixed(3)
            ),
            wins: winsB,
            winRate: Number(
                (winsB / SIMULATION_COUNT * 100).toFixed(2)
            )
        },

        draws,
        drawRate: Number(
            (draws / SIMULATION_COUNT * 100).toFixed(2)
        ),

        simulationCount: SIMULATION_COUNT,
        baseRuns: BASE_RUNS,
        scoreDistribution
    };
}

module.exports = {
    teams,
    findTeam,
    simulateMatch,
    SIMULATION_COUNT,
    BASE_RUNS
};

// 保留終端機執行方式
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 1 && args[0] === '--list') {
        teams.forEach((team, index) => {
            console.log(`${index + 1}. ${team.teamName}`);
        });
        process.exit(0);
    }

    if (args.length !== 2) {
        console.log('使用方式：');
        console.log('node simulator.js --list');
        console.log('node simulator.js "味全龍" "中信兄弟"');
        process.exit(0);
    }

    const teamA = teams.find(t => t.teamName === args[0]);
    const teamB = teams.find(t => t.teamName === args[1]);

    try {
        const result = simulateMatch(teamA, teamB);

        console.log(JSON.stringify(result, null, 2));

        fs.writeFileSync(
            path.join(__dirname, 'simulation-result.json'),
            JSON.stringify(result, null, 2),
            'utf8'
        );

        console.log('結果已儲存至 simulation-result.json');
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}
