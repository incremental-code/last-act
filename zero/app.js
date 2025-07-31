import { useState, createContext, useContext } from './last.js';
import { div, span, button, h1 } from './html.js';

const lightTheme = `background-color: white; color: black;`;
const darkTheme = `background-color: black; color: white;`;

const ThemeContext = createContext(lightTheme);

export const App = () => {
    const [count, setCount] = useState(0)
    const [theme, setTheme] = useState(lightTheme);

    return [div,, [
        [ThemeContext.Provider, { value: theme }, [
            [Header, null, 'Example App'],
            [span,, count],
            [Button, { setCount, count }],
            [ThemeChanger, { theme: lightTheme, setTheme }],
            [ThemeChanger, { theme: darkTheme, setTheme }]
        ]]
    ]]
}

const Header = ({ children }) => {
    const theme = useContext(ThemeContext);

    return [div, { style: theme }, [
        [h1, null, children]
    ]]
}

const Button = ({ setCount, count }) => {
    return [button, { onClick: () => setCount(count + 1) }, `Increment to ${count + 1}`]
}

const ThemeChanger = ({ theme, setTheme }) => {
    const currentTheme = useContext(ThemeContext);

    return [button, { onClick: () => setTheme(currentTheme === lightTheme ? darkTheme : lightTheme) }, `Change to ${currentTheme === lightTheme ? 'dark' : 'light'} theme`]
}