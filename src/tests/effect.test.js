import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Signal } from 'signal-polyfill';
import { effect } from '../effect.js';

const tick = () => new Promise(resolve => queueMicrotask(resolve));

describe('effect', () => {
    test('runs callback immediately on creation', () => {
        let ran = false;
        const stop = effect(() => { ran = true; });
        assert.equal(ran, true);
        stop();
    });

    test('re-runs callback when a tracked Signal changes', async () => {
        const sig = new Signal.State(1);
        const values = [];
        const stop = effect(() => { values.push(sig.get()); });
        sig.set(2);
        await tick();
        assert.deepEqual(values, [1, 2]);
        stop();
    });

    test('calls cleanup before re-running on signal change', async () => {
        const sig = new Signal.State(0);
        const log = [];
        const stop = effect(() => {
            sig.get();
            log.push('run');
            return () => log.push('cleanup');
        });
        sig.set(1);
        await tick();
        assert.deepEqual(log, ['run', 'cleanup', 'run']);
        stop();
    });

    test('stop prevents future re-runs after a signal change', async () => {
        const sig = new Signal.State(0);
        let count = 0;
        const stop = effect(() => { sig.get(); count++; });
        stop();
        sig.set(1);
        await tick();
        assert.equal(count, 1);
    });

    test('stop calls the current cleanup function', () => {
        let cleaned = false;
        const stop = effect(() => () => { cleaned = true; });
        stop();
        assert.equal(cleaned, true);
    });

    test('does not react to signals accessed after stop', async () => {
        const sig = new Signal.State('a');
        const seen = [];
        const stop = effect(() => { seen.push(sig.get()); });
        stop();
        sig.set('b');
        await tick();
        assert.deepEqual(seen, ['a']);
    });
});
