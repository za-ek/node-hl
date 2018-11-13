const fs = require('fs');
const request = require('request');

const microtime = () => process.hrtime()[0] * 1000000000 + process.hrtime()[1];
const startTime = microtime();

const runThread = (url, intent, id) => {
  request.get({url, time: true}, (err, response) => {
    if(err) {
      serverPool.list[id].push(null);
    } else {
      serverPool.list[id].push(response.elapsedTime);
    }

    if(intent > 1) {
      runThread(url, intent - 1, id);
    } else {
      finishServer(id);
    }
  });
};

const serverPool = {
  list: {},
  activeCount: 0
};

const startServer = (config) => {
  let id = Math.random().toString(36).substring(2, 15)
    + Math.random().toString(36).substring(2, 15);

  serverPool.list[id] = [];
  serverPool.activeCount++;

  runThread(config.url, config.intents, id);
};

/**
 * Stop server
 * @param id
 */
const finishServer = (id) => {
  let index = null;
  serverPool.activeCount--;

  if(serverPool.activeCount === 0) {
    serverFinished();
  }
  return ; /*
  for( let k in serverPool.list ) {
    if(k === id) {
      serverPool.activeCount--;

      if(serverPool.activeCount === 0) {
        serverFinished();
      }
    }
  }
  */
};

const serverFinished = () => {
  let c = 0, m = 0, t = 0, items = [];
  for( let k in serverPool.list ) {
    serverPool.list[k].forEach((v) => {
      if( v !== null) {
        c++;
        t += v;
        items.push(v);
      } else {
        m++;
      }
    });
  }

  drawChart(items);

  console.log(`Requests: ${c}/${c+m}, avg: ${Math.round(t/c)} ms, max: ${Math.max(...items)} ms, min: ${Math.min(...items)} ms`);
  console.log(`Requests per second: ~${Math.round(1000000000*c/(microtime() - startTime))}`);
  console.log(`Total time: ${Math.round((microtime() - startTime) / 1000000)} ms`);
};

const args = process.argv.slice(2);
if(args.length >= 1) {
  const threads = (args[1]) ? args[1] : 16;
  const intents = (args[2]) ? args[2] : 30;
  for ( let i = 0; i < threads; i += 1) {
    startServer({url: args[0], intents});
  }
} else {
  console.log('No url provided');
}

const drawChart = (items) => {
  const max = Math.max(...items), min = Math.min(...items);
  const intervalCount = 20;
  let interval = (max - min) / intervalCount;
  let intervalItems = [];
  for( let i = 0; i <= intervalCount; i++ ) {
    intervalItems.push([]);
  }

  let s = [];
  items.forEach((v, k) => {
    if(v === null) {
      intervalItems[intervalCount].push(v);
    }
    for (let i = 1; i <= intervalCount; i += 1) {
      if( v <= (min + (interval * i))) {
        s.push(i - 1);
        intervalItems[i - 1].push(v);
        break;
      }
    }
  });

  let maxLength = 0;
  intervalItems.forEach(
    (v) => maxLength = ( v.length > maxLength ) ? v.length : maxLength
  );

  console.log(
    'time'.padStart(30),
    '%'.padStart(5),
    'req'.padStart(7)
  );
  let percent = 0;
  for (let i = 0; i <= intervalCount; i += 1) {
    percent += 100 * intervalItems[i].length / items.length;
    let label = `${Math.round(min + (interval*i))} - ${Math.round(min + (interval*(i+1)))} ms`;
    if(i === intervalCount) {
      label = '---';
    }
    console.log(
      label.padStart(30, ' '),
      `${Math.round(percent)}%`.padStart(5, ' '),
      `${intervalItems[i].length}`.padStart(7, ' '),
      '#'.repeat(Math.ceil((intervalItems[i].length / maxLength)*32))
    );
  }

  // console.log(intervalItems);

};
