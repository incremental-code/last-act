import { useState, useEffect, createContext, useContext } from './last.js';
import { div, span, button, h1, h2, p, ul, li } from './html.js';

const lightTheme = `background-color: white; color: black;`;
const darkTheme = `background-color: black; color: white;`;

const ThemeContext = createContext(lightTheme);

export const App = () => {
    const [count, setCount] = useState(0);
    const [theme, setTheme] = useState(lightTheme);

    useEffect(() => {
        document.title = `LastJS — count: ${count}`;
    }, [count]);

    return [div,, [
        [ThemeContext.Provider, { value: theme }, [
            [Header, null, 'Example App'],
            [span,, count],
            [Button, { setCount, count }],
            [ThemeChanger, { theme: lightTheme, setTheme }],
            [ThemeChanger, { theme: darkTheme, setTheme }],
            [ConditionalDemo],
            [KeyedListDemo],
            [EffectDemo],
        ]]
    ]];
};

const Header = ({ children }) => {
    const theme = useContext(ThemeContext);
    return [div, { style: theme }, [
        [h1, null, children]
    ]];
};

const Button = ({ setCount, count }) => {
    return [button, { onClick: () => setCount(count + 1) }, `Increment to ${count + 1}`];
};

const ThemeChanger = ({ theme, setTheme }) => {
    const currentTheme = useContext(ThemeContext);
    return [button, { onClick: () => setTheme(currentTheme === lightTheme ? darkTheme : lightTheme) }, `Change to ${currentTheme === lightTheme ? 'dark' : 'light'} theme`];
};

// ── Demo 1: Conditional rendering ────────────────────────────────────────────
// Shows that a conditionally rendered component keeps its own state when it
// reappears, and that the sibling component after it is unaffected.

const ConditionalCounter = () => {
    const [n, setN] = useState(0);
    return [div, { style: 'padding:8px; background:#e8f4fd; border-radius:4px; margin:4px 0' }, [
        [span,, `Conditional count: ${n}  `],
        [button, { onClick: () => setN(n + 1) }, '+1'],
    ]];
};

const StableCounter = () => {
    const [n, setN] = useState(0);
    return [div, { style: 'padding:8px; background:#f0fdf4; border-radius:4px; margin:4px 0' }, [
        [span,, `Stable count: ${n}  `],
        [button, { onClick: () => setN(n + 1) }, '+1'],
    ]];
};

const ConditionalDemo = () => {
    const [show, setShow] = useState(true);
    return [div, { style: 'margin:16px 0; padding:12px; border:1px solid #ccc; border-radius:6px' }, [
        [h2,, 'Demo 1 — Conditional rendering'],
        [p,, 'The blue counter is conditionally rendered. Hide it, increment the green counter, then show it again — the blue counter resumes from where it left off, and the green counter is unaffected.'],
        // null placeholder keeps sibling index stable when ConditionalCounter is hidden
        show ? [ConditionalCounter] : null,
        [StableCounter],
        [button, { onClick: () => setShow(!show) }, show ? 'Hide' : 'Show'],
    ]];
};

// ── Demo 2: Key-based list matching ──────────────────────────────────────────
// Shows that components matched by key carry their state even when the list
// is reordered.

const ListItem = ({ label }) => {
    const [n, setN] = useState(0);
    return [li, { style: 'margin:4px 0' }, [
        [span,, `${label}: clicked ${n} times  `],
        [button, { onClick: () => setN(n + 1) }, '+1'],
    ]];
};

const KeyedListDemo = () => {
    const [reversed, setReversed] = useState(false);
    const items = [
        { key: 'a', label: 'Item A' },
        { key: 'b', label: 'Item B' },
        { key: 'c', label: 'Item C' },
    ];
    const ordered = reversed ? [...items].reverse() : items;
    return [div, { style: 'margin:16px 0; padding:12px; border:1px solid #ccc; border-radius:6px' }, [
        [h2,, 'Demo 2 — Key-based list matching'],
        [p,, 'Increment some counters, then reverse the list. Each item keeps its own count because components are matched by key.'],
        [ul,, ordered.map(({ key, label }) => [ListItem, { key, label }])],
        [button, { onClick: () => setReversed(!reversed) }, 'Reverse list'],
    ]];
};

// ── Demo 3: useEffect with cleanup ───────────────────────────────────────────
// Shows useEffect running on mount (empty deps), on every dep change, and
// cleaning up a setInterval when the effect re-runs or the component unmounts.

const EffectDemo = () => {
    const [running, setRunning] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [log, setLog] = useState('(not started)');

    // Runs whenever `running` changes; cleans up the interval on each re-run.
    useEffect(() => {
        if (!running) return;
        const id = setInterval(() => setSeconds(s => s + 1), 1000);
        setLog('interval started');
        return () => {
            clearInterval(id);
            setLog('interval cleared');
        };
    }, [running]);

    return [div, { style: 'margin:16px 0; padding:12px; border:1px solid #ccc; border-radius:6px' }, [
        [h2,, 'Demo 3 — useEffect with cleanup'],
        [p,, 'A setInterval is started when the timer runs and cleared when it pauses. The cleanup function fires before each re-run and on unmount.'],
        [p,, `Elapsed: ${seconds}s`],
        [p,, `Effect log: ${log}`],
        [button, { onClick: () => setRunning(!running) }, running ? 'Pause' : 'Start'],
        [button, { onClick: () => { setRunning(false); setSeconds(0); } }, 'Reset'],
    ]];
};
