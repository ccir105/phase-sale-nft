require('dotenv').config();

import getConfigObject from './common';

export default {
    ...getConfigObject(process.env),
};
