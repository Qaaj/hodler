const _ = require('lodash');
const CLI = require('clui'),
    clc = require('cli-color'),
    clear = require('clear');
const fetch = require('node-fetch');
const numbro = require('numbro');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const holdings = {
    'havven': {
        name: 'SNX',
        amount: 1000
    },
    'ethereum': {
        name: 'ETH',
        amount: 100
    },
    'bitcoin': {
        name: 'BTC',
        amount: 10
    },
    'yearn-finance': {
        name: 'YFI',
        amount: 1
    }
}

const updateUI = async (data) => {
    if(!data) return;
    clear();
}
const main = async () => {
    const ids = Object.keys(holdings).join('%2C');
    const data = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    const json = await data.json();
    updateUI(json);
    const result = Object.entries(json).map(([key, { usd: price }]) => {
        const { name, amount } = holdings[key];
        return {
            Token: name,
            Price: price,
            Holdings: numbro(amount).format(),
            Total: numbro(amount * price).formatCurrency(),
            sum: amount * price,
        }
    })
    console.table(result);
    console.log('')
    console.log(`  Portfolio Value: ${numbro(_.sumBy(result, 'sum')).formatCurrency()}`)
    await sleep(5000);
    main();
}

main();
