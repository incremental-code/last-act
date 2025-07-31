import { useState, createContext, useContext } from './last.js';
import { div, span, button, h1 } from './html.js';

const lightTheme = `background-color: white; color: black;`;
const darkTheme = `background-color: black; color: white;`;

const ThemeContext = createContext(lightTheme);

export const App = () => {
    const [count, setCount] = useState(0)

    return [div,, [
        [ThemeContext.Provider, { value: darkTheme }, [
            [Header, null, 'Example App'],
            [span,, count],
            [Button, { setCount, count }]
        ]],
        [ThemeContext.Provider, { value: lightTheme }, [
            [Header, null, 'Example App'],
            [span,, count],
            [Button, { setCount, count }]
        ]]
    ]]
}

const Header = ({ children }) => {
    const theme = useContext(ThemeContext);
    return [div, { style: theme}, [
        [h1, null, children]
    ]]
}

const Button = ({ setCount, count }) => {
    return [button, { onClick: () => setCount(count + 1) }, `Increment to ${count + 1}`]
}

