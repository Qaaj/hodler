# Hodler
CLI tool for checking portfolio performance, data fetched from [CoinGecko](https://www.coingecko.com/en) API.

## Howto

### Bootstrap project
1. Git clone/checkout
2. npm install
3. Portfolio configuration

### Portfolio configuration
1. Create a `./holdings.js` file in the project's root folder or in a custom folder location.
   If you're using a custom folder location, please refer to `Environment Configuration`. 
   

2. Add your portfolio configuration to your newly created `./holdings.js` file:
```
module.exports =  {
    'bitcoin': 1,
    'ethereum': 10,
}
```

> **TIP** 
> Use [Coingecko GET /coins/list](https://www.coingecko.com/api/documentations/v3#/coins/get_coins_list) to get ticker ID's 

### Environment configuration (optional)
1. To load your `holdings.js` file from a custom folder location, create a `.env` file in your project's root folder:
```
HOLDINGS_FILE_PATH=/Users/John/path_to_your_holding.js
```
