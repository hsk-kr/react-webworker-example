const sum = (nums) => {
  let total = 0;
  for (const n of nums) {
    total += n;
  }

  return total;
};

const log = (values) => {
  for (const v of values) {
    console.log(v);
  }
};

onmessage = (e) => {
  try {
    let rst = [];

    switch (e.data.funcName) {
      case 'sum': {
        rst.push(sum(e.data.args));
        break;
      }
      case 'log':
        log(e.data.args);
        break;
      default:
        throw new Error('Called undefined function');
    }

    postMessage({ result: true, rst });
  } catch (e) {
    postMessage({ result: false, err: e });
  }
};
