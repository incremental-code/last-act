import { createElement, Signal, computed } from '../zero.js';

window.addEventListener('DOMContentLoaded', () => {
    const app = createElement(App);
    document.body.appendChild(app);
});

function App() {
    const city = new Signal("Cape Town");
    const isLoading = new Signal(false);
    const temperature = new Signal(null);

    const getWeather = () => {
        isLoading.set(true);
        fetch(`https://wttr.in/${city.get()}?format=j1`)
            .then(response => response.json())
            .then(data => {
                temperature.set(data.current_condition[0].temp_F);
                isLoading.set(false);
            });
    }

    return createElement("div", undefined, 
        createElement("input", { placeholder: "Enter your city", onchange: e => city.set(e.target.value) }),
        createElement("button", { onclick: getWeather }, "Get Weather"),
        createElement(Weather, { isLoading, city, temperature })
    );
}

function Weather({ isLoading, city, temperature }) {
    return createElement("div", undefined,
        createElement("h2", undefined, city),
        computed(() => isLoading.get() ? "Loading..." : temperature.get() ? `Temperature: ${temperature.get()}°F` : "No data"),
    );
}