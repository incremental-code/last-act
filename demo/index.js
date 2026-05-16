import { createElement, effect, onUnmount } from '../src/index.js';
import { Signal } from 'signal-polyfill';

window.addEventListener('DOMContentLoaded', () => {
    const app = createElement(App);
    document.body.appendChild(app);
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
    const tbody = createElement("tbody");
    const stop = effect(() => {
        const rowEls = rows.get().map(entry =>
            createElement(CityWeather, { entry, removeCity })
        );
        tbody.replaceChildren(...rowEls);
    });
    onUnmount(tbody, stop);

    return createElement("table", undefined,
        createElement("thead", undefined,
            createElement("tr", undefined,
                createElement("th", undefined, "City"),
                createElement("th", undefined, "Temp"),
                createElement("th", undefined, "Conditions"),
                createElement("th", undefined, ""),
            )
        ),
        tbody
    );
}

function CityWeather({ entry, removeCity }) {
    const tempTd = createElement("td");
    const descTd = createElement("td");
    const row = createElement("tr", undefined,
        createElement("td", undefined, entry.city),
        tempTd,
        descTd,
        createElement("td", undefined,
            createElement("button", { onclick: () => removeCity(entry.city) }, "✕")
        ),
    );
    onUnmount(row, effect(() => { tempTd.textContent = entry.temp.get(); }));
    onUnmount(row, effect(() => { descTd.textContent = entry.desc.get(); }));
    return row;
}