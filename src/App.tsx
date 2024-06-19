import { WorkerContextProvider, useWorker } from './hooks/useWorker';

const Test = () => {
  const { callWorker } = useWorker();

  const sum = () => {
    // let total = 0;

    // for (let i = 0; i < 1000000000; i++) {
    //   total += i;
    // }

    // console.log('done: ', total);

    callWorker({
      funcName: 'sum',
      args: Array(1000000)
        .fill(0)
        .map((_, i) => i),
      cb: (total) => {
        console.log('done: ', total);
      },
      err: (e) => {
        console.error(e);
      },
    });
  };

  const log = () => {
    // for (let i = 0; i < 10000; i++) {
    //   console.log('test');
    // }
    // console.log('done');

    callWorker({
      funcName: 'log',
      args: Array(10000).fill('test'),
      cb: () => {
        console.log('done');
      },
      err: (e) => {
        console.error(e);
      },
    });
  };

  return (
    <div>
      <input type="text" />
      <button onClick={log}>Log</button>
      <button onClick={sum}>Sum</button>
    </div>
  );
};

function App() {
  return (
    <WorkerContextProvider workerPoolNum={2}>
      <Test />
    </WorkerContextProvider>
  );
}

export default App;

/**
 *
 *
 *
 */
