import { WorkerContextProvider, useWorker } from './hooks/useWorker';

const Test = () => {
  const { callWorker } = useWorker();

  const sum = () => {
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
    callWorker({
      funcName: 'log',
      args: Array(1000000).fill('test'),
      cb: () => {
        console.log('done');
      },
      err: (e) => {
        console.error(e);
      },
    });
  };

  const logWithoutWorker = () => {
    for (let i = 0; i < 1000000; i++) {
      console.log('test');
    }
    console.log('done');
  };

  return (
    <div>
      <input type="text" />
      <button onClick={log}>Log</button>
      <button onClick={sum}>Sum</button>
      <button onClick={logWithoutWorker}>Log Without Worker</button>
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
