import { html, mount, signal, computed } from '../src/index.js';

window.addEventListener('DOMContentLoaded', () => {
    mount(html`<${App}/>`, document.body);
});

function App() {
    const city = signal("Cape Town");
    const rows = signal([]);

    const addCity = () => {
        const name = city.get().trim();
        if (!name) return;

        const entry = { city: name, temp: signal("…"), desc: signal("loading") };
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

    const removeCity = (name) => rows.set(rows.get().filter(r => r.city !== name));

    return html`
        <div>
            <input
                value=${city.get()}
                placeholder="Enter a city"
                ${{ oninput: e => city.set(e.target.value) }}
            />
            <button ${{ onclick: addCity }}>Add City</button>
            <${WorldWeather} ${{ rows, removeCity }}/>
        </div>
    `;
}

function WorldWeather({ rows, removeCity }) {
    const rowEls = computed(() =>
        rows.get().map(entry => html`<${CityWeather} ${{ entry, removeCity }}/>`)
    );

    return html`
        <table>
            <thead>
                <tr>
                    <th>City</th>
                    <th>Temp</th>
                    <th>Conditions</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${rowEls}</tbody>
        </table>
    `;
}

function CityWeather({ entry, removeCity }) {
    return html`
        <tr>
            <td>${entry.city}</td>
            <td>${entry.temp}</td>
            <td>${entry.desc}</td>
            <td><button ${{ onclick: () => removeCity(entry.city) }}>✕</button></td>
        </tr>
    `;
}
