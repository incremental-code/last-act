/**
 * Demo app exercising every feature of LastJS (see last.js).
 *
 * Layout: <App> holds a counter + theme in useState, publishes the theme through
 * a context Provider, and renders three self-contained demos below it:
 *   Demo 1 — conditional rendering keeps a hidden component's state
 *   Demo 2 — keyed list items keep their state across a reorder
 *   Demo 3 — useEffect with a setInterval and a cleanup function
 * Components are plain functions returning createElement(...) trees; hooks
 * (useState/useEffect/useContext) are called unconditionally at the top of each.
 */
import { createElement, useState, useEffect, createContext, useContext } from './last.js';
import { div, span, button, h1, h2, p, ul, li } from './html.js';

const lightTheme = `background-color: white; color: black;`;
const darkTheme  = `background-color: black; color: white;`;

const ThemeContext = createContext(lightTheme);

export const App = () => {
    const [count, setCount] = useState(0);
    const [theme, setTheme] = useState(lightTheme);

    useEffect(() => {
        document.title = `LastJS — count: ${count}`;
    }, [count]);

    return createElement(div, null,
        createElement(ThemeContext.Provider, { value: theme },
            createElement(Header, null, 'Example App'),
            createElement(span, null, count),
            createElement(Button, { setCount, count }),
            createElement(ThemeChanger, { theme: lightTheme, setTheme }),
            createElement(ThemeChanger, { theme: darkTheme,  setTheme }),
            createElement(ConditionalDemo),
            createElement(KeyedListDemo),
            createElement(EffectDemo),
        )
    );
};

const Header = ({ children }) => {
    const theme = useContext(ThemeContext);
    return createElement(div, { style: theme },
        createElement(h1, null, children)
    );
};

const Button = ({ setCount, count }) =>
    createElement(button, { onClick: () => setCount(count + 1) }, `Increment to ${count + 1}`);

const ThemeChanger = ({ theme, setTheme }) => {
    const currentTheme = useContext(ThemeContext);
    const next = currentTheme === lightTheme ? 'dark' : 'light';
    return createElement(button,
        { onClick: () => setTheme(currentTheme === lightTheme ? darkTheme : lightTheme) },
        `Change to ${next} theme`
    );
};

// ── Demo 1: Conditional rendering ────────────────────────────────────────────
// Shows that a conditionally rendered component keeps its own state when it
// reappears, and that the sibling component after it is unaffected.

const ConditionalCounter = () => {
    const [n, setN] = useState(0);
    return createElement(div, { style: 'padding:8px; background:#e8f4fd; border-radius:4px; margin:4px 0' },
        createElement(span, null, `Conditional count: ${n}  `),
        createElement(button, { onClick: () => setN(n + 1) }, '+1'),
    );
};

const StableCounter = () => {
    const [n, setN] = useState(0);
    return createElement(div, { style: 'padding:8px; background:#f0fdf4; border-radius:4px; margin:4px 0' },
        createElement(span, null, `Stable count: ${n}  `),
        createElement(button, { onClick: () => setN(n + 1) }, '+1'),
    );
};

const ConditionalDemo = () => {
    const [show, setShow] = useState(true);
    return createElement(div, { style: 'margin:16px 0; padding:12px; border:1px solid #ccc; border-radius:6px' },
        createElement(h2, null, 'Demo 1 — Conditional rendering'),
        createElement(p, null,
            'The blue counter is conditionally rendered. Hide it, increment the green counter, ' +
            'then show it again — the blue counter resumes from where it left off, and the green counter is unaffected.'
        ),
        // null placeholder keeps sibling index stable when ConditionalCounter is hidden
        show ? createElement(ConditionalCounter) : null,
        createElement(StableCounter),
        createElement(button, { onClick: () => setShow(!show) }, show ? 'Hide' : 'Show'),
    );
};

// ── Demo 2: Key-based list matching ──────────────────────────────────────────
// Shows that components matched by key carry their state even when the list
// is reordered.

const ListItem = ({ label }) => {
    const [n, setN] = useState(0);
    return createElement(li, { style: 'margin:4px 0' },
        createElement(span, null, `${label}: clicked ${n} times  `),
        createElement(button, { onClick: () => setN(n + 1) }, '+1'),
    );
};

const KeyedListDemo = () => {
    const [reversed, setReversed] = useState(false);
    const items = [
        { key: 'a', label: 'Item A' },
        { key: 'b', label: 'Item B' },
        { key: 'c', label: 'Item C' },
    ];
    const ordered = reversed ? [...items].reverse() : items;
    return createElement(div, { style: 'margin:16px 0; padding:12px; border:1px solid #ccc; border-radius:6px' },
        createElement(h2, null, 'Demo 2 — Key-based list matching'),
        createElement(p, null,
            'Increment some counters, then reverse the list. ' +
            'Each item keeps its own count because components are matched by key.'
        ),
        createElement(ul, null, ordered.map(({ key, label }) => createElement(ListItem, { key, label }))),
        createElement(button, { onClick: () => setReversed(!reversed) }, 'Reverse list'),
    );
};

// ── Demo 3: useEffect with cleanup ───────────────────────────────────────────
// Shows useEffect running on mount (empty deps), on every dep change, and
// cleaning up a setInterval when the effect re-runs or the component unmounts.

const EffectDemo = () => {
    const [running, setRunning] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [log, setLog]         = useState('(not started)');

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

    return createElement(div, { style: 'margin:16px 0; padding:12px; border:1px solid #ccc; border-radius:6px' },
        createElement(h2, null, 'Demo 3 — useEffect with cleanup'),
        createElement(p, null,
            'A setInterval is started when the timer runs and cleared when it pauses. ' +
            'The cleanup function fires before each re-run and on unmount.'
        ),
        createElement(p, null, `Elapsed: ${seconds}s`),
        createElement(p, null, `Effect log: ${log}`),
        createElement(button, { onClick: () => setRunning(!running) }, running ? 'Pause' : 'Start'),
        createElement(button, { onClick: () => { setRunning(false); setSeconds(0); } }, 'Reset'),
    );
};
