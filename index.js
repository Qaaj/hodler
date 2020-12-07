const _ = require('lodash');
const clc = require('cli-color'),
  clear = require('clear');
const fetch = require('node-fetch');
const numbro = require('numbro');
const { Table } = require('console-table-printer');

let num = 0, STATE = { info: {}, historical: {} };
const censored = false;
const sleep_interval = 300;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let fiatCurrencyRates = {
  USD: 1
};

const setState = (state) => {
  STATE = { 
    ...STATE, 
    ...state, 
    timestamp: new Date(),
  };
}

const loader = () => {
  num++;
  const spinner = ['.', '..', '...'];
  return spinner[num % 3]
}

let holdings = {
  'havven': 1000,
  'ethereum': 100,
  'bitcoin': 10,
  'yearn-finance': 1,
}

const getRowObject = (id, value, total, load) => {
  const row = {
    holdings: censored ? '***' : numbro(value).format({ thousandSeparated: true }),
    name: load,
    price: load,
    eth: load,
    ticker: load,
    percent: load,
    total: load,
    ethval: load,
    h24: load,
    h24holding: load,
    deltaeth: load,
    up: true,
  };
  if (STATE.prices[id]) {
    row.price = numbro(STATE.prices[id]).format({ mantissa: 2, thousandSeparated: true });
    row.eth = numbro(STATE.prices[id] / STATE.prices.ethereum).format({ mantissa: 4, thousandSeparated: true });
    row.percent = numbro((value * STATE.prices[id]) / total).format({ output: 'percent', mantissa: 2 });
    row.total = censored ? '***' : numbro(value * STATE.prices[id]).formatCurrency({
      mantissa: 1,
      thousandSeparated: true
    });
    row.ethval = numbro(value * STATE.prices[id] / STATE.prices.ethereum).format({
      mantissa: 1,
      thousandSeparated: true
    });
  }
  if (STATE.info[id]) {
    row.name = STATE.info[id].name;
    row.ticker = STATE.info[id].symbol.toLocaleUpperCase();
    row.h24 = numbro(Math.abs(STATE.info[id].market_data.price_change_percentage_24h / 100)).format({
      output: 'percent',
      mantissa: 2
    });
    // row.h24usd = numbro(Math.abs(STATE.info[id].market_data.price_change_24h)).format({ mantissa: 2, thousandSeparated: true });
    row.h24holding = numbro(value * Math.abs(STATE.info[id].market_data.price_change_24h)).format({
      mantissa: 2,
      thousandSeparated: true
    });
    row.deltaeth = numbro(value * Math.abs(STATE.info[id].market_data.price_change_24h_in_currency.eth)).format({
      mantissa: 2,
      thousandSeparated: true
    });
    row.up = STATE.info[id].market_data.price_change_percentage_24h
    if (STATE.info[id].market_data.price_change_percentage_24h < 0) row.up = false;
  }

  return row;
}

const updateUI = async () => {
  const load = loader();
  if (STATE.prices) {
    clear();
    const table = new Table({
      columns: [
        { name: 'name', alignment: 'left', title: 'Name' }, //with alignment and color
        { name: 'ticker', alignment: 'right', title: 'Ticker' },
        { name: 'price', title: 'Price' },
        { name: 'h24', title: '24h' },
        { name: 'eth', title: 'ETH Price' },
        { name: 'holdings', title: 'Holdings' },
        { name: 'percent', title: '% Holdings' },
        { name: 'total', title: 'Value USD' },
        { name: 'h24holding', title: 'Δ USD' },
        { name: 'ethval', title: 'Value ETH' },
        { name: 'deltaeth', title: 'Δ ETH' },
      ],
    });

    let totals = { usd: 0, eth: 0, deltausd: 0, deltaeth: 0 };
    Object.entries(holdings).forEach(([id, value]) => {
      totals.usd += (value * STATE.prices[id]);
      if (STATE.info[id]) {
        totals.deltausd += (value * STATE.info[id].market_data.price_change_24h)
        totals.deltaeth += (value * STATE.info[id].market_data.price_change_24h_in_currency.eth)
        totals.eth += (value * STATE.info[id].market_data.current_price.eth);
      }
    });

    const colorFX = (num) => num > 0 ? clc.green : clc.red;
    
    const sortHoldingsBy = (sortBy) => ([idA, valueA], [idB, valueB]) => {
      let rowA;
      let rowB;
    
      switch(sortBy.toLowerCase()){
        case "usd":
        default: {
          rowA = (valueA * STATE.prices[idA]) / totals.usd;
          rowB = (valueB * STATE.prices[idB]) / totals.usd;
        }
      }

      if (rowA > rowB) return -1;
      if (rowA <= rowB) return 1;
    };

    Object.entries(holdings)
    .sort(sortHoldingsBy("usd"))
    .forEach(([id, value]) => {
      const row = getRowObject(id, value, totals.usd, load);
      const { up } = row;
      delete row.up;
      table.addRow({
        ...row,
        name: up > 20 ? clc.green(row.name) : clc.yellow(row.name),
        h24holding: STATE.info[id] ? colorFX(up)(`${up ? '+' : '-'}${row.h24holding}`) : load,
        deltaeth: STATE.info[id] ? colorFX(up)(`${up ? '+' : '-'}${row.deltaeth}`) : load,
        h24: STATE.info[id] ? colorFX(up)(`${up ? '+' : '-'}${row.h24}`) : load,
      })
    })
    table.addRow({})
    table.addRow({
      total: numbro(totals.usd).format({thousandSeparated: true, mantissa: 1 }),
      ethval: numbro(totals.eth).format({thousandSeparated: true, mantissa: 1 }),
      h24holding: colorFX(totals.deltausd)(numbro(totals.deltausd).formatCurrency({ mantissa: 1, thousandSeparated: true })),
      deltaeth: colorFX(totals.deltaeth)(numbro(totals.deltaeth).format({ thousandSeparated: true, mantissa: 1})),
    })
    table.printTable()
    console.log(' \n')
    console.log(`  Portfolio value EUR: ${numbro(totals.usd / fiatCurrencyRates.USD).formatCurrency({
      mantissa: 1,
      thousandSeparated: true,
      currencySymbol: "€"
    })}`)

    console.log(`  Portfolio value BTC: ${numbro(totals.usd / STATE.prices.bitcoin).format({
      mantissa: 2,
      thousandSeparated: true
    })}`)
    console.log(' \n')
    console.log(`  Timestamp ${STATE.timestamp.toLocaleString()}`);
    console.log(' \n')
    console.log(loader());
    console.log('')
  }
  await sleep(500);
  updateUI();
}

const priceFetcher = async () => {
  const ids = ['ethereum', 'bitcoin', ...Object.keys(holdings)].join('%2C');
  const data = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
  const json = await data.json();
  const result = {};
  Object.entries(json).map(([key, { usd: price }]) => {
    result[key] = price;
  })
  setState({ prices: result })
  await sleep(10000);
  priceFetcher();
}

const informationFetcher = async () => {
  const ids = Object.keys(holdings);
  ids.forEach(async (id, i) => {
    await sleep(i * sleep_interval);
    const data = await fetch(`https://api.coingecko.com/api/v3/coins/${id}`);
    const json = await data.json();
    const info = STATE.info || {};
    setState({ info: { [id]: json, ...info } });
  })
  await sleep(60 * 10 * 1000); // Run every 10 mins
  informationFetcher();
}

const historicalFetcher = async () => {
  await sleep(1000);
  const ids = Object.keys(holdings);
  ids.map(async (id, i) => {
    await sleep(i * sleep_interval);
    const data = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=30&interval=daily`);
    const json = await data.json();
    const historical = STATE.historical || {};
    setState({ historical: { [id]: json, ...historical } });
  });
}

const fiatCurrencyRatesFetcher = async () => {
  try {
    const currencyRatesEndpoint = `https://api.exchangeratesapi.io/latest?symbols=USD`;
    const response = await fetch(currencyRatesEndpoint);
    const json = await response.json();
    const rates = json.rates;
    fiatCurrencyRates = rates;
  } catch (error) {
    console.log(`Failed getting fiat currency rates from api.exchangeratesapi.io:`, error);
  }
}

try {
  const myHoldings = require('./holdings.js');
  holdings = myHoldings;
} catch (err) {
  console.log('Holdings file not found - using fallback')
}

fiatCurrencyRatesFetcher();
priceFetcher();
informationFetcher();
historicalFetcher();
updateUI();

