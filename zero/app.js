import { createRoot, useState } from './last.js';

const App = () => {
    const [count, setCount] = useState(0)

    return ['div', null, [
        ['span', null, count],
        [Button, { setCount, count }]
    ]]
}

const Button = ({ setCount, count }) => {
    return ['button', { onClick: () => setCount(count + 1) }, 'Increment to ' + (count + 1)]
}

const rootOne = createRoot(document.querySelector('#root-one'));
const rootTwo = createRoot(document.querySelector('#root-two'));

rootOne.render(App, {});
rootTwo.render(App, {});
