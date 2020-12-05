const _ = require('lodash');
const CLI = require('clui'),
    clc = require('cli-color'),
    clear = require('clear');
const fetch = require('node-fetch');
const numbro = require('numbro');
const {Table} = require('console-table-printer');

let num = 0, STATE = {info: {}, historical: {}};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const setState = (state) => {
    STATE = {...STATE, ...state};
}

const loader = () => {
    num++;
    const spinner = ['.', '..', '...'];
    return spinner[num % 3]
}


const holdings = {
    'havven': 1000,
    'ethereum': 100,
    'bitcoin': 10,
    'yearn-finance': 1,
}

const updateUI = async () => {
    if (STATE.prices) {
        clear();
        const load = loader();
        const table = new Table({
            columns: [
                {name: 'name', alignment: 'left', color: 'yellow', title: 'Name'}, //with alignment and color
                {name: 'ticker', alignment: 'right', title: 'Ticker'},
                {name: 'price', title: 'Price'},
                {name: 'eth', title: 'ETH Price'},
                {name: 'holdings', title: 'Holdings'},
                {name: 'total', title: 'Total'},
            ],
        });

        let total = 0;
        Object.entries(holdings).forEach(([id, value]) => {
            total += (value * STATE.prices[id]);
            table.addRow({
                price: STATE.prices[id] ? numbro(STATE.prices[id]).format({
                    mantissa: 1,
                    thousandSeparated: true
                }) : load,
                eth: STATE.prices[id] ? numbro(STATE.prices[id] / STATE.prices.ethereum).format({
                    mantissa: 5,
                    thousandSeparated: true
                }) : load,
                name: STATE.info[id] ? STATE.info[id].name : load,
                ticker: STATE.info[id] ? STATE.info[id].symbol.toLocaleUpperCase() : load,
                holdings: numbro(value).format({thousandSeparated: true}),
                total: STATE.prices[id] ? numbro(value * STATE.prices[id]).formatCurrency({
                    mantissa: 1,
                    thousandSeparated: true
                }) : load,
            })
        })
        table.printTable()
        console.log(' \n')
        console.log(`  Portfolio value USD: ${numbro(total).formatCurrency({mantissa: 1, thousandSeparated: true})}`)
        console.log(`  Portfolio value ETH: ${numbro(total/STATE.prices.ethereum).format({mantissa: 2, thousandSeparated: true})}`)
        console.log(`  Portfolio value BTC: ${numbro(total/STATE.prices.bitcoin).format({mantissa: 2, thousandSeparated: true})}`)
        console.log(' \n')
        console.log(loader());
        console.log('')
    }
    await sleep(250);
    updateUI();
}

const priceFetcher = async () => {
    const ids = ['ethereum','bitcoin',...Object.keys(holdings)].join('%2C');
    const data = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    const json = await data.json();
    const result = {};
    Object.entries(json).map(([key, {usd: price}]) => {
        result[key] = price;
    })
    setState({prices: result})
    await sleep(5000);
    priceFetcher();
}

const informationFetcher = () => {
    const ids = Object.keys(holdings);
    ids.forEach(async (id, i) => {
        await sleep(i * 300);
        const data = await fetch(`https://api.coingecko.com/api/v3/coins/${id}`);
        const json = await data.json();
        const info = STATE.info || {};
        setState({info: {[id]: json, ...info}});
    })
}

const historicalFetcher = async () => {
    await sleep(1000);
    const ids = Object.keys(holdings);
    ids.map(async (id, i) => {
        await sleep(i * 300);
        const data = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=30&interval=daily`);
        const json = await data.json();
        const info = STATE.historical || {};
        setState({historical: {[id]: json, ...info}});
    });
}

priceFetcher();
informationFetcher();
historicalFetcher();
updateUI();
