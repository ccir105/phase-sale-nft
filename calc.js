var axios = require('axios');
const outGoingResults = [];
async function getTxs(user, contract) {
  let url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${contract}&address=${user}&page=1&offset=200&startblock=14359539&endblock=16811630&sort=desc&apikey=1E46ZC7H9TYX6QM4FUHPES85TQCKRR28AU`;

  const response = await axios.get(url);
  const result = response.data.result;
  return result.map((res) => {
    return {
      time: new Date(parseInt(res.timeStamp) * 1000).toDateString(),
      value: parseInt(res.value) / 10 ** parseInt(res.tokenDecimal),
      from: res.from.toLowerCase(),
      to: res.to.toLowerCase(),
      hash: res.hash,
      tokenName: res.tokenName,
    };
  });
}

function getIncomingOutGoing(results, user) {
  const incoming = results.filter((res) => res.to === user);
  const outgoing = results.filter((res) => res.to === '0xF31DCf3f480a2Fa25B73F9D522aF5f9B17DCE4dd'.toLowerCase());

  const incomingSum = incoming.reduce((accumulator, currentValue) => {
    return accumulator + currentValue.value;
  }, 0);

  const outgoingSum = outgoing.reduce((accumulator, currentValue) => {
    return accumulator + currentValue.value;
  }, 0);

  outGoingResults.push(...outgoing);

  console.log(`[${incoming[0].tokenName}]`, {incomingSum, outgoingSum});
}

async function init() {
  const user = '0x1e18f6f61dfb7426252a73a2f6226fec8fb256de';
  const results1 = await getTxs(user, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
  const results2 = await getTxs(user, '0xdac17f958d2ee523a2206206994597c13d831ec7');
  const results3 = await getTxs(user, '0x4fabb145d64652a948d72533023f6e7a623c7c53');

  getIncomingOutGoing(results1, user);
  getIncomingOutGoing(results2, user);
  getIncomingOutGoing(results3, user);

  require('fs').writeFileSync('outgoing.json', JSON.stringify(outGoingResults));
}

init();
