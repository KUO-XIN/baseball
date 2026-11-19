
const fs = require('fs');
const path = require('path');

const SIMULATION_COUNT = 10000;
const BASE_RUNS = 4.5;

function readJson(filename) {
    const filePath = path.join(__dirname, filename);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing file: ${filename}`);
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const teamData = readJson('team-stats.json');
const batters = readJson('batters.json');
const pitchers = readJson('pitchers.json');

const teams = teamData.teams;
const league = teamData.league;

function poisson(lambda) {
    if (!Number.isFinite(lambda) || lambda < 0) {
        throw new Error('Invalid Poisson parameter');
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

function findTeam(teamId) {
    return teams.find(team =>
        String(team.teamId) === String(teamId)
    );
}

function getPlayersForTeam(teamId) {
    const team = findTeam(teamId);

    if (!team) {
        throw new Error('Team not found');
    }

    return {
        batters: batters
            .filter(player =>
                String(player.teamId) === String(teamId)
            )
            .map(player => ({
                playerId: String(player.playerId),
                playerName: player.playerName,
                pa: Number(player.stats.pa) || 0,
                woba: Number(player.stats.woba)
            })),

        pitchers: pitchers
            .filter(player =>
                String(player.teamId) === String(teamId)
            )
            .map(player => ({
                playerId: String(player.playerId),
                playerName: player.playerName,
                pa: Number(player.stats.pa) || 0,
                woba: Number(player.stats.woba)
            }))
    };
}

function findPlayer(playerList, playerId) {
    return playerList.find(player =>
        String(player.playerId) === String(playerId)
    );
}

function calculateLineupWoba(lineup) {
    if (!Array.isArray(lineup) || lineup.length !== 9) {
        throw new Error('A lineup must contain exactly 9 batters');
    }

    const uniqueIds = new Set(lineup.map(String));

    if (uniqueIds.size !== 9) {
        throw new Error('Duplicate batters are not allowed');
    }

    let totalPa = 0;
    let weightedWoba = 0;

    for (const playerId of lineup) {
        const player = findPlayer(batters, playerId);

        if (!player) {
            throw new Error('Batter not found');
        }

        const pa = Number(player.stats.pa);
        const woba = Number(player.stats.woba);

        if (
            !Number.isFinite(pa) ||
            pa <= 0 ||
            !Number.isFinite(woba)
        ) {
            throw new Error('Invalid batter statistics');
        }

        totalPa += pa;
        weightedWoba += pa * woba;
    }

    if (totalPa <= 0) {
        throw new Error('Invalid lineup PA');
    }

    return weightedWoba / totalPa;
}

function validatePitcher(teamId, pitcherId) {
    const pitcher = findPlayer(pitchers, pitcherId);

    if (!pitcher) {
        throw new Error('Pitcher not found');
    }

    if (String(pitcher.teamId) !== String(teamId)) {
        throw new Error('Pitcher does not belong to selected team');
    }

    const woba = Number(pitcher.stats.woba);

    if (!Number.isFinite(woba) || woba < 0) {
        throw new Error('Invalid pitcher statistics');
    }

    return woba;
}

function calculateExpectedRuns(
    battingWoba,
    opponentPitchingWoba
) {
    if (
        !Number.isFinite(battingWoba) ||
        !Number.isFinite(opponentPitchingWoba) ||
        !Number.isFinite(league.battingWoba) ||
        !Number.isFinite(league.pitchingWobaAgainst) ||
        league.battingWoba <= 0 ||
        league.pitchingWobaAgainst <= 0
    ) {
        throw new Error('Invalid statistics');
    }

    const battingFactor =
        battingWoba / league.battingWoba;

    const pitchingFactor =
        opponentPitchingWoba / league.pitchingWobaAgainst;

    return BASE_RUNS * battingFactor * pitchingFactor;
}

function simulateMatch(
    teamA,
    teamB,
    lineupA,
    lineupB,
    pitcherAId,
    pitcherBId
) {
    if (!teamA || !teamB) {
        throw new Error('Team not found');
    }

    if (teamA.teamId === teamB.teamId) {
        throw new Error('Same teams are not allowed');
    }

    // 確認所有打者都屬於指定球隊
    for (const playerId of lineupA) {
        const player = findPlayer(batters, playerId);

        if (!player || String(player.teamId) !== String(teamA.teamId)) {
            throw new Error('Team A lineup contains an invalid batter');
        }
    }

    for (const playerId of lineupB) {
        const player = findPlayer(batters, playerId);

        if (!player || String(player.teamId) !== String(teamB.teamId)) {
            throw new Error('Team B lineup contains an invalid batter');
        }
    }

    const lineupWobaA = calculateLineupWoba(lineupA);
    const lineupWobaB = calculateLineupWoba(lineupB);

    const pitcherWobaA = validatePitcher(
        teamA.teamId,
        pitcherAId
    );

    const pitcherWobaB = validatePitcher(
        teamB.teamId,
        pitcherBId
    );

    const expectedA = calculateExpectedRuns(
        lineupWobaA,
        pitcherWobaB
    );

    const expectedB = calculateExpectedRuns(
        lineupWobaB,
        pitcherWobaA
    );

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
            ),
            lineupWoba: Number(lineupWobaA.toFixed(4)),
            pitcherWoba: Number(pitcherWobaA.toFixed(4))
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
            ),
            lineupWoba: Number(lineupWobaB.toFixed(4)),
            pitcherWoba: Number(pitcherWobaB.toFixed(4))
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
    batters,
    pitchers,
    findTeam,
    getPlayersForTeam,
    simulateMatch,
    SIMULATION_COUNT,
    BASE_RUNS
};

// 保留終端機執行方式
if (require.main === module) {
    console.log('This simulator is now intended to be used through server.js.');
}
