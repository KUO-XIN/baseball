
const teamASelect = document.getElementById('teamA');
const teamBSelect = document.getElementById('teamB');

const simulateBtn = document.getElementById('simulateBtn');
const errorMessage = document.getElementById('errorMessage');
const resultSection = document.getElementById('resultSection');
const lineupSection = document.getElementById('lineupSection');
const lineupStatus = document.getElementById('lineupStatus');

let teamAPlayers = null;
let teamBPlayers = null;

const batterSelectsA = [];
const batterSelectsB = [];

const pitcherASelect = document.getElementById('pitcherA');
const pitcherBSelect = document.getElementById('pitcherB');

async function loadTeams() {
    try {
        const response = await fetch('/api/teams');
        const data = await response.json();

        if (!data.success) {
            throw new Error('Unable to load teams');
        }

        teamASelect.innerHTML = '';
        teamBSelect.innerHTML = '';

        data.teams.forEach(team => {
            const optionA = document.createElement('option');
            optionA.value = team.teamId;
            optionA.textContent = team.teamName;

            const optionB = document.createElement('option');
            optionB.value = team.teamId;
            optionB.textContent = team.teamName;

            teamASelect.appendChild(optionA);
            teamBSelect.appendChild(optionB);
        });

        if (data.teams.length > 1) {
            teamBSelect.selectedIndex = 1;
        }

        await loadLineups();

    } catch (error) {
        errorMessage.textContent = error.message;
    }
}

async function fetchTeamPlayers(teamId) {
    const response = await fetch(
        `/api/teams/${encodeURIComponent(teamId)}/players`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load players');
    }

    return data;
}

function createPlayerOption(player) {
    const option = document.createElement('option');

    option.value = player.playerId;
    option.textContent = player.playerName;

    return option;
}

function createBatterSelect(container, index, players, selectList) {
    const row = document.createElement('div');
    row.className = 'lineup-row';

    const label = document.createElement('label');
    label.textContent = `${index + 1} \u68D2`;
    label.htmlFor = `batter-${selectList === batterSelectsA ? 'A' : 'B'}-${index}`;

    const select = document.createElement('select');
    select.id = label.htmlFor;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '\u8ACB\u9078\u64C7\u6253\u8005';

    select.appendChild(placeholder);

    players.forEach(player => {
        select.appendChild(createPlayerOption(player));
    });

    select.addEventListener('change', () => {
        updateDuplicateOptions();
        updateLineupStatus();
    });

    row.appendChild(label);
    row.appendChild(select);

    container.appendChild(row);
    selectList.push(select);
}

function createPitcherOptions(select, players) {
    select.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '\u8ACB\u9078\u64C7\u6295\u624B';

    select.appendChild(placeholder);

    players.forEach(player => {
        select.appendChild(createPlayerOption(player));
    });

    select.addEventListener('change', updateLineupStatus);
}

function renderLineup(side, players) {
    const container = document.getElementById(
        side === 'A' ? 'lineupA' : 'lineupB'
    );

    const selectList = side === 'A'
        ? batterSelectsA
        : batterSelectsB;

    container.innerHTML = '';
    selectList.length = 0;

    for (let i = 0; i < 9; i++) {
        createBatterSelect(
            container,
            i,
            players.batters,
            selectList
        );
    }

    const pitcherSelect = side === 'A'
        ? pitcherASelect
        : pitcherBSelect;

    createPitcherOptions(
        pitcherSelect,
        players.pitchers
    );
}

function getSelectedIds(selects) {
    return selects.map(select => select.value);
}

function updateDuplicateOptions() {
    const allSelects = [
        ...batterSelectsA,
        ...batterSelectsB
    ];

    allSelects.forEach(currentSelect => {
        const selectedIds = allSelects
            .filter(select => select !== currentSelect)
            .map(select => select.value)
            .filter(Boolean);

        Array.from(currentSelect.options).forEach(option => {
            if (!option.value) return;

            option.disabled = selectedIds.includes(option.value);
        });
    });
}

function updateLineupStatus() {
    const lineupA = getSelectedIds(batterSelectsA);
    const lineupB = getSelectedIds(batterSelectsB);

    const completeA =
        lineupA.length === 9 &&
        lineupA.every(Boolean) &&
        Boolean(pitcherASelect.value);

    const completeB =
        lineupB.length === 9 &&
        lineupB.every(Boolean) &&
        Boolean(pitcherBSelect.value);

    const complete = completeA && completeB;

    simulateBtn.disabled = !complete;

    if (complete) {
        lineupStatus.textContent =
            '\u5169\u968A\u9663\u5BB9\u5DF2\u5B8C\u6210\uFF0C\u53EF\u4EE5\u958B\u59CB\u6A21\u64EC\u3002';
    } else {
        lineupStatus.textContent =
            '\u8ACB\u70BA\u5169\u968A\u5404\u81EA\u9078\u64C7 9 \u540D\u6253\u8005\u8207 1 \u540D\u6295\u624B\u3002';
    }
}

async function loadLineups() {
    errorMessage.textContent = '';
    resultSection.classList.add('hidden');
    lineupSection.classList.add('hidden');

    simulateBtn.disabled = true;

    const teamAId = teamASelect.value;
    const teamBId = teamBSelect.value;

    if (!teamAId || !teamBId) return;

    if (teamAId === teamBId) {
        errorMessage.textContent =
            '\u4E0D\u80FD\u9078\u64C7\u76F8\u540C\u7684\u7403\u968A';
        return;
    }

    try {
        const [playersA, playersB] = await Promise.all([
            fetchTeamPlayers(teamAId),
            fetchTeamPlayers(teamBId)
        ]);

        teamAPlayers = playersA;
        teamBPlayers = playersB;

        batterSelectsA.length = 0;
        batterSelectsB.length = 0;

        document.getElementById('lineupTitleA').textContent =
            teamASelect.options[teamASelect.selectedIndex].textContent +
            ' \u9663\u5BB9';

        document.getElementById('lineupTitleB').textContent =
            teamBSelect.options[teamBSelect.selectedIndex].textContent +
            ' \u9663\u5BB9';

        renderLineup('A', playersA);
        renderLineup('B', playersB);

        lineupSection.classList.remove('hidden');

        updateDuplicateOptions();
        updateLineupStatus();

    } catch (error) {
        errorMessage.textContent = error.message;
    }
}

async function simulate() {
    errorMessage.textContent = '';

    const teamAId = teamASelect.value;
    const teamBId = teamBSelect.value;

    const lineupA = getSelectedIds(batterSelectsA);
    const lineupB = getSelectedIds(batterSelectsB);

    const pitcherAId = pitcherASelect.value;
    const pitcherBId = pitcherBSelect.value;

    if (
        lineupA.length !== 9 ||
        lineupB.length !== 9 ||
        lineupA.some(id => !id) ||
        lineupB.some(id => !id) ||
        !pitcherAId ||
        !pitcherBId
    ) {
        errorMessage.textContent =
            '\u8ACB\u5B8C\u6210\u5169\u968A\u9663\u5BB9\u9078\u64C7';
        return;
    }

    if (
        new Set(lineupA).size !== 9 ||
        new Set(lineupB).size !== 9
    ) {
        errorMessage.textContent =
            '\u540C\u4E00\u540D\u6253\u8005\u4E0D\u80FD\u91CD\u8907\u9078\u64C7';
        return;
    }

    simulateBtn.disabled = true;
    simulateBtn.textContent = '\u6A21\u64EC\u9032\u884C\u4E2D...';

    try {
        const response = await fetch('/api/simulate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teamAId,
                teamBId,
                lineupA,
                lineupB,
                pitcherAId,
                pitcherBId
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Simulation failed');
        }

        showResult(data.result);

    } catch (error) {
        errorMessage.textContent = error.message;

    } finally {
        simulateBtn.textContent = '\u958B\u59CB\u6A21\u64EC';
        updateLineupStatus();
    }
}

function showResult(result) {
    const a = result.teamA;
    const b = result.teamB;

    document.getElementById('resultTeamA').textContent = a.name;
    document.getElementById('resultTeamB').textContent = b.name;

    document.getElementById('scoreA').textContent =
        a.averageScore;

    document.getElementById('scoreB').textContent =
        b.averageScore;

    document.getElementById('simulationCount').textContent =
        result.simulationCount.toLocaleString() + '\u0020\u6B21\u6A21\u64EC';

    document.getElementById('expectedRuns').innerHTML =
        '<span>' + a.name + '\uFF1A' + a.expectedRuns + '\u0020\u5206</span>' +
        '<span>' + b.name + '\uFF1A' + b.expectedRuns + '\u0020\u5206</span>';

    document.getElementById('rateNameA').textContent = a.name;
    document.getElementById('rateNameB').textContent = b.name;

    document.getElementById('rateA').textContent =
        `${a.winRate}%`;

    document.getElementById('rateB').textContent =
        `${b.winRate}%`;

    document.getElementById('barA').style.width =
        `${a.winRate}%`;

    document.getElementById('barB').style.width =
        `${b.winRate}%`;

    document.getElementById('drawRate').textContent =
        `${result.drawRate}%`;

    resultSection.classList.remove('hidden');

    resultSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

teamASelect.addEventListener('change', loadLineups);
teamBSelect.addEventListener('change', loadLineups);

simulateBtn.addEventListener('click', simulate);

loadTeams();
