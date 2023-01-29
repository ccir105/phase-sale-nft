import {asciiToHex, toBN, toWei, rightPad} from "web3-utils";
import {BigNumber} from "ethers";

// @ts-ignore
const Utils = {

  toBytes32: (key: any) =>
    rightPad(asciiToHex(key), 64),

  toUnit: (amount: BigNumber | string) => toBN(toWei(amount.toString(), 'ether')),

  wait: (ms: number): Promise<void>  => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  configParser(configSource = process.env, type, key, defaultValue) {
    const val = configSource[key];

    function def(v) {
      return defaultValue === undefined ? v : defaultValue;
    }

    switch (type) {
      case 'string': {
        return val || def('');
      }

      case 'array': {
        return val ? val.split(',') : def([]);
      }

      case 'object': {
        return val ? JSON.parse(val) : def({});
      }

      case 'number': {
        if (!val) return def(0);

        const djs = parseInt(val);
        return djs;
      }

      case 'bool': {
        return val ? val === 'true' : def(false);
      }

      default: {
        throw new Error('Unknwon variable type');
      }
    }
  },

  validateString: <T extends string>(
      val: string,
      validValues: readonly string[],
  ): T => {
    const res = validValues.indexOf(val);
    if (res < 0) {
      throw Error(`${val} is not one of ${validValues}`);
    }
    return val as T;
  }
}

export default Utils;


