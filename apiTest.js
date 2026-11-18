
const fs = require('fs');

const API_BASE = 'https://stats.cpbl.com.tw/api/proxy/v1/leaderboards/pr-table';

async function testAPI(type) {
    const url = `${API_BASE}?year=2026&searchType=${type}&gameKind=A`;

    console.log(`\n========== ${type} ==========`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        console.log('HTTP 狀態碼：', response.status);

        if (!response.ok) {
            console.log('請求失敗');
            return;
        }

        const data = await response.json();

        // 將完整資料存成 JSON 檔案
        const filename = `${type}-data.json`;

        fs.writeFileSync(
            filename,
            JSON.stringify(data, null, 2),
            'utf8'
        );

        console.log('資料已儲存：', filename);

        // 只顯示資料結構摘要
        console.log('最上層資料類型：', typeof data);
        console.log('最上層欄位：', Object.keys(data));

        // 找出可能存放球員資料的陣列
        for (const key of Object.keys(data)) {
            if (Array.isArray(data[key])) {
                console.log('資料陣列名稱：', key);
                console.log('球員資料筆數：', data[key].length);
                console.log('前兩筆資料：');
                console.log(data[key].slice(0, 2));
            }
        }

    } catch (error) {
        console.error('取得資料失敗：', error.message);
    }
}

async function main() {
    await testAPI('batter');
    await testAPI('pitcher');
}

main();
