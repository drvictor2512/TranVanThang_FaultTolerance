const express = require('express');
const axios = require('axios');
const Bottleneck = require('bottleneck');
const pLimit = require('p-limit');
const promiseRetry = require('promise-retry');
const CircuitBreaker = require('opossum');

const app = express();
const port = process.env.PORT || 3000;
const SERVICE_B = process.env.SERVICE_B || 'http://localhost:3001';

const limiter = new Bottleneck({ minTime: 200 });

const bulkhead = pLimit(2);

async function callServiceB() {
    console.log('callServiceB: sending request to Service B');
    const res = await axios.get(`${SERVICE_B}/unstable`, { timeout: 2500 });
    console.log('callServiceB: received response from Service B');
    return res.data;
}

const breakerOptions = {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 8000,
};
const breaker = new CircuitBreaker(callServiceB, breakerOptions);

breaker.on('open', () => console.log('Circuit breaker: OPEN'));
breaker.on('halfOpen', () => console.log('Circuit breaker: HALF_OPEN'));
breaker.on('close', () => console.log('Circuit breaker: CLOSED'));

function resilientCall(id) {
    return bulkhead(() => limiter.schedule(() =>
        promiseRetry((retry, number) => {
            console.log(`[call ${id}] attempt ${number} -> firing breaker`);
            return breaker.fire().catch((err) => {
                console.log(`[call ${id}] error on attempt ${number}: ${err && err.message}`);
                if (number <= 2) {
                    console.log(`[call ${id}] retrying...`);
                    retry(err);
                }
                throw err;
            });
        }, { retries: 2 })
    ));
}

app.get('/', (req, res) => res.send('Service A: ready'));

app.get('/call', async (req, res) => {
    const count = parseInt(req.query.count || '10', 10);
    console.log(`/call received, count=${count}`);
    const tasks = [];
    for (let i = 0; i < count; i++) {
        tasks.push(
            resilientCall(i)
                .then((r) => ({ ok: true, result: r }))
                .catch((e) => ({ ok: false, error: e && e.message }))
        );
    }

    const results = await Promise.all(tasks);
    res.json({
        summary: {
            requested: count,
            breakerState: breaker.opened ? 'OPEN' : 'CLOSED',
        }, results
    });
});

app.listen(port, () => console.log(`Service A listening on ${port} -> calls ${SERVICE_B}`));
