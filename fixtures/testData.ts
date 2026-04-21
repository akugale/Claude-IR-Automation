export const users = {
  maker: {
    username: process.env.MAKER_USERNAME ?? 'maker.user',
    password: process.env.MAKER_PASSWORD ?? 'maker.password',
  },
  checker: {
    username: process.env.CHECKER_USERNAME ?? 'checker.user',
    password: process.env.CHECKER_PASSWORD ?? 'checker.password',
  },
};

const ts = Date.now();
const suffix = ts.toString().slice(-6);

export const counterpartyTypeData = {
  code: `CP${suffix}`,
  description: `Counterparty Type ${new Date(ts).toISOString()}`,
};

export const counterpartyTypeEditData = {
  code: `ED${suffix}`,
  description: `Edit Test ${new Date(ts).toISOString()}`,
  updatedDescription: `Updated Description ${new Date(ts).toISOString()}`,
};

export const counterpartyTypeDeleteData = {
  code: `DL${suffix}`,
  description: `Delete Test ${new Date(ts).toISOString()}`,
};
