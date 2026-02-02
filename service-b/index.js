const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

app.get('/', (req, res) => res.send('Service B: healthy'));


app.get('/unstable', async (req, res) => {
    const r = Math.random();
    if (r < 0.25) {
        return res.json({ ok: true, mode: 'fast' });
    }

    if (r < 0.6) {
        await new Promise((s) => setTimeout(s, 1200));
        return res.json({ ok: true, mode: 'slow' });
    }

    res.status(500).json({ ok: false, error: 'random failure' });
});

app.get('/always-slow', async (req, res) => {
    await new Promise((s) => setTimeout(s, 3000));
    res.json({ ok: true, mode: 'very-slow' });
});

app.listen(port, () => console.log(`Service B listening on ${port}`));
