
const fs = require('fs');
const path = require('path');

// 讀取整理後的球員資料
const batters = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'batters.json'), 'utf8')
);

const pitchers = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'pitchers.json'), 'utf8')
);

// 計算 PA 加權平均 wOBA
function calculateWeightedWoba(players) {
    let totalPA = 0;
    let weightedTotal = 0;
    let validPlayers = 0;
    let excludedPlayers = 0;

    for (const player of players) {
        const pa = Number(player.stats?.pa);
        const woba = Number(player.stats?.woba);

        // 排除缺少資料或 PA 不合理的紀錄
        if (
            !Number.isFinite(pa) ||
            !Number.isFinite(woba) ||
            pa <= 0
        ) {
            excludedPlayers++;
            continue;
        }

        totalPA += pa;
        weightedTotal += pa * woba;
        validPlayers++;
    }

    return {
        weightedWoba: totalPA > 0
            ? weightedTotal / totalPA
            : null,
        totalPA,
        validPlayers,
        excludedPlayers
    };
}

// 依照球隊分組
function groupByTeam(players) {
    const teams = {};

    for (const player of players) {
        const teamId = player.teamId;
        const teamName = player.teamName;

        if (!teamId || !teamName) {
            continue;
        }

        if (!teams[teamId]) {
            teams[teamId] = {
                teamId,
                teamName,
                players: []
            };
        }

        teams[teamId].players.push(player);
    }

    return teams;
}

// 分別整理打者與投手
const batterTeams = groupByTeam(batters);
const pitcherTeams = groupByTeam(pitchers);

// 計算全聯盟打者加權 wOBA
const leagueBatting = calculateWeightedWoba(batters);

// 計算全聯盟投手端加權 wOBA
const leaguePitching = calculateWeightedWoba(pitchers);

// 合併六隊資料
const teamIds = new Set([
    ...Object.keys(batterTeams),
    ...Object.keys(pitcherTeams)
]);

const teamResults = [];

for (const teamId of teamIds) {
    const batterTeam = batterTeams[teamId];
    const pitcherTeam = pitcherTeams[teamId];

    const teamName =
        batterTeam?.teamName ||
        pitcherTeam?.teamName ||
        '未知球隊';

    const batting = calculateWeightedWoba(
        batterTeam?.players || []
    );

    const pitching = calculateWeightedWoba(
        pitcherTeam?.players || []
    );

    teamResults.push({
        teamId,
        teamName,

        batting: {
            woba: batting.weightedWoba,
            totalPA: batting.totalPA,
            playerCount: batting.validPlayers,
            excludedCount: batting.excludedPlayers
        },

        pitching: {
            wobaAgainst: pitching.weightedWoba,
            totalPA: pitching.totalPA,
            playerCount: pitching.validPlayers,
            excludedCount: pitching.excludedPlayers
        }
    });
}

// 依球隊代碼排序
teamResults.sort((a, b) =>
    a.teamId.localeCompare(b.teamId)
);

// 建立輸出資料
const result = {
    league: {
        battingWoba: leagueBatting.weightedWoba,
        battingPA: leagueBatting.totalPA,

        pitchingWobaAgainst: leaguePitching.weightedWoba,
        pitchingPA: leaguePitching.totalPA
    },

    teams: teamResults
};

// 輸出 JSON
const outputPath = path.join(__dirname, 'team-stats.json');

fs.writeFileSync(
    outputPath,
    JSON.stringify(result, null, 2),
    'utf8'
);

// 顯示執行結果
console.log('================================');
console.log('CPBL 球隊數據整理完成');
console.log('================================');

console.log('\n【聯盟平均數據】');
console.log(
    '打者加權 wOBA：',
    leagueBatting.weightedWoba?.toFixed(4)
);
console.log(
    '投手端加權 wOBA：',
    leaguePitching.weightedWoba?.toFixed(4)
);

console.log('\n【各隊數據】');

for (const team of teamResults) {
    console.log(`\n${team.teamName} (${team.teamId})`);

    console.log(
        `打者 wOBA：${team.batting.woba?.toFixed(4) ?? '無資料'}`
    );
    console.log(
        `打者 PA：${team.batting.totalPA}`
    );

    console.log(
        `投手端 wOBA Against：${team.pitching.wobaAgainst?.toFixed(4) ?? '無資料'}`
    );
    console.log(
        `投手 PA：${team.pitching.totalPA}`
    );
}

console.log('\n輸出檔案：team-stats.json');
console.log('================================');
