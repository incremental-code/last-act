import { createElement, mount } from '../src/index.js';
import { Signal } from 'signal-polyfill';

window.addEventListener('DOMContentLoaded', () => {
    const app = createElement(App);
    mount(app, document.body);
});

function App() {
    const city = new Signal.State("Cape Town");
    const rows = new Signal.State([]);

    const addCity = () => {
        const name = city.get().trim();
        if (!name) return;

        // Add a loading row immediately
        const entry = { city: name, temp: new Signal.State("…"), desc: new Signal.State("loading") };
        rows.set([...rows.get(), entry]);

        fetch(`https://wttr.in/${encodeURIComponent(name)}?format=j1`)
            .then(r => r.json())
            .then(data => {
                const c = data.current_condition[0];
                entry.temp.set(`${c.temp_F}°F`);
                entry.desc.set(c.weatherDesc[0].value);
            })
            .catch(() => {
                entry.temp.set("—");
                entry.desc.set("error");
            });
    };

    return createElement("div", undefined,
        createElement("input", {
            value: city.get(),
            placeholder: "Enter a city",
            oninput: e => city.set(e.target.value),
        }),
        createElement("button", { onclick: addCity }, "Add City"),
        createElement(WorldWeather, { rows, removeCity: name => rows.set(rows.get().filter(r => r.city !== name)) })
    );
}

function WorldWeather({ rows, removeCity }) {
    const rowEls = new Signal.Computed(() =>
        rows.get().map(entry => createElement(CityWeather, { entry, removeCity }))
    );

    return createElement("table", undefined,
        createElement("thead", undefined,
            createElement("tr", undefined,
                createElement("th", undefined, "City"),
                createElement("th", undefined, "Temp"),
                createElement("th", undefined, "Conditions"),
                createElement("th", undefined, ""),
            )
        ),
        createElement("tbody", undefined, rowEls)
    );
}

function CityWeather({ entry, removeCity }) {
    return createElement("tr", undefined,
        createElement("td", undefined, entry.city),
        createElement("td", undefined, entry.temp),
        createElement("td", undefined, entry.desc),
        createElement("td", undefined,
            createElement("button", { onclick: () => removeCity(entry.city) }, "✕")
        ),
    );
}