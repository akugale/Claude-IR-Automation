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

export const counterpartyTypeData = {
  code: `CP${Date.now().toString().slice(-6)}`,
  description: `Counterparty Type ${new Date().toISOString()}`,
};
