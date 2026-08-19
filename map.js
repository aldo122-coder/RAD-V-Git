/*
 * RAD-V GPS MAPPING
 * Membaca koordinat Latitude/Longitude dari Google Spreadsheet
 * lalu menampilkannya sebagai marker + jalur perjalanan.
 *
 * Spreadsheet:
 * https://docs.google.com/spreadsheets/d/1xLhZmmkAYq8_xfaccntf8GUCx0XZZ8y9Rn7KZ0Ob_2U/
 *
 * Catatan:
 * - Sheet harus dapat dibaca oleh publik / "Publish to web".
 * - Nama sheet default: Sheet1. Jika berbeda, ubah SHEET_NAME.
 */

const SPREADSHEET_ID = "1xLhZmmkAYq8_xfaccntf8GUCx0XZZ8y9Rn7KZ0Ob_2U";
const SHEET_NAME = "data";
const REFRESH_INTERVAL = 10000; // 10 detik

let radMap = null;
let routeLine = null;
let pointLayer = null;
let latestMarker = null;

function initRadiationMap() {
    if (typeof L === "undefined") {
        console.error("Leaflet belum dimuat.");
        return;
    }

    radMap = L.map("radMap").setView([-5.4, 105.25], 15);

    setTimeout(() => {
    radMap.invalidateSize();
}, 500);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(radMap);

    pointLayer = L.layerGroup().addTo(radMap);

    loadRadiationMap();
    setInterval(loadRadiationMap, REFRESH_INTERVAL);
}

function getGvizUrl() {
    return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;
}

function normalizeHeader(value) {
    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[^\w]/g, "");
}

function findColumn(headers, aliases) {
    const normalized = headers.map(normalizeHeader);

    for (const alias of aliases) {
        const index = normalized.indexOf(normalizeHeader(alias));
        if (index !== -1) return index;
    }

    // Pencarian sebagian untuk variasi seperti "Latitude GPS"
    for (let i = 0; i < normalized.length; i++) {
        for (const alias of aliases) {
            const a = normalizeHeader(alias);
            if (a && normalized[i].includes(a)) return i;
        }
    }

    return -1;
}

function parseGvizResponse(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1) {
        throw new Error("Format data Google Spreadsheet tidak dikenali.");
    }

    return JSON.parse(text.substring(start, end + 1));
}

function valueFromCell(row, index) {
    if (index < 0 || !row.c || !row.c[index]) return null;
    return row.c[index].v;
}

function radiationLevel(usv) {
    if (!Number.isFinite(usv)) return "unknown";

    // Ambang tampilan dapat disesuaikan dengan kriteria penelitian.
    if (usv < 0.3) return "safe";
    if (usv < 1.0) return "medium";
    return "high";
}

function markerColor(level) {
    if (level === "safe") return "#22c55e";
    if (level === "medium") return "#f59e0b";
    if (level === "high") return "#ef4444";
    return "#6b7280";
}

function makeMarker(lat, lon, usv, cpm, isLatest) {
    const level = radiationLevel(usv);
    const color = isLatest ? "#2563eb" : markerColor(level);

    const marker = L.circleMarker([lat, lon], {
        radius: isLatest ? 9 : 5,
        color: color,
        weight: isLatest ? 3 : 1,
        fillColor: color,
        fillOpacity: 0.8
    });

    marker.bindPopup(`
        <div style="min-width:170px">
            <b>RAD-V</b><br>
            Latitude: ${lat.toFixed(6)}<br>
            Longitude: ${lon.toFixed(6)}<br>
            μSv/h: ${Number.isFinite(usv) ? usv.toFixed(3) : "-"}<br>
            CPM: ${Number.isFinite(cpm) ? cpm.toFixed(0) : "-"}
            ${isLatest ? "<br><b>● POSISI TERBARU</b>" : ""}
        </div>
    `);

    return marker;
}

async function loadRadiationMap() {
    const info = document.getElementById("mapInfo");

    try {
        info.textContent = "Mengambil data GPS...";

        const response = await fetch(getGvizUrl(), { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();
        const data = parseGvizResponse(text);

        const headers = data.table.cols.map(col => col.label || col.id);

        const latIndex = findColumn(headers, [
    "latitude",
    "lat",
    "latitude gps",
    "gps latitude"
]);

const lonIndex = findColumn(headers, [
    "longitude",
    "lon",
    "lng",
    "longitude gps",
    "gps longitude"
]);

const usvIndex = findColumn(headers, [
    "uSv/h",
    "usv/h",
    "usv",
    "μSv/h",
    "µSv/h",
    "radiation"
]);

const cpmIndex = findColumn(headers, [
    "CPM",
    "cpm",
    "counts per minute"
]);

        if (latIndex === -1 || lonIndex === -1) {
            throw new Error(
                "Kolom Latitude/Longitude tidak ditemukan. " +
                "Pastikan header Spreadsheet memakai Latitude dan Longitude."
            );
        }

        const points = [];
        const pointByRowIndex = {};

        for (let rowIndex = 0; rowIndex < data.table.rows.length; rowIndex++) {
            const row = data.table.rows[rowIndex];
            const lat = Number(valueFromCell(row, latIndex));
            const lon = Number(valueFromCell(row, lonIndex));
            const usv = Number(valueFromCell(row, usvIndex));
            const cpm = Number(valueFromCell(row, cpmIndex));

            if (
                Number.isFinite(lat) &&
                Number.isFinite(lon) &&
                lat >= -90 && lat <= 90 &&
                lon >= -180 && lon <= 180 &&
                !(lat === 0 && lon === 0)
            ) {
                const point = {
                    lat,
                    lon,
                    usv: Number.isFinite(usv) ? usv : NaN,
                    cpm: Number.isFinite(cpm) ? cpm : NaN
                };

                points.push(point);
                pointByRowIndex[rowIndex] = point;
            }
        }

        // Tampilkan seluruh isi Spreadsheet pada tabel, termasuk baris yang
        // belum mempunyai koordinat valid.
        window.radVPointByRowIndex = pointByRowIndex;

        updateTableOnly(
            data,
            headers,
            latIndex,
            lonIndex,
            usvIndex,
            cpmIndex,
            points
        );

        if (points.length === 0) {
            info.textContent = "Belum ada koordinat GPS yang valid.";
            return;
        }

        pointLayer.clearLayers();

        const latLngs = points.map(p => [p.lat, p.lon]);

        routeLine = L.polyline(latLngs, {
            color: "#2563eb",
            weight: 4,
            opacity: 0.7
        }).addTo(radMap);

        points.forEach((p, index) => {
            const marker = makeMarker(
                p.lat,
                p.lon,
                p.usv,
                p.cpm,
                index === points.length - 1
            );
            marker.addTo(pointLayer);
        });

        const latest = points[points.length - 1];

        if (latestMarker) {
            radMap.removeLayer(latestMarker);
        }

        latestMarker = L.circleMarker([latest.lat, latest.lon], {
            radius: 12,
            color: "#2563eb",
            weight: 3,
            fillColor: "#2563eb",
            fillOpacity: 0.15
        }).addTo(radMap);

        latestMarker.bindPopup(`
            <b>POSISI TERBARU RAD-V</b><br>
            Latitude: ${latest.lat.toFixed(6)}<br>
            Longitude: ${latest.lon.toFixed(6)}<br>
            μSv/h: ${Number.isFinite(latest.usv) ? latest.usv.toFixed(3) : "-"}<br>
            CPM: ${Number.isFinite(latest.cpm) ? latest.cpm.toFixed(0) : "-"}
        `);

        // Update kartu GPS pada dashboard menggunakan data terbaru.
        const latEl = document.getElementById("latitude");
        const lonEl = document.getElementById("longitude");
        const usvEl = document.getElementById("usv");
        const cpmEl = document.getElementById("cpm");

        if (latEl) latEl.textContent = latest.lat.toFixed(6);
        if (lonEl) lonEl.textContent = latest.lon.toFixed(6);
        if (usvEl && Number.isFinite(latest.usv)) usvEl.textContent = latest.usv.toFixed(2);
        if (cpmEl && Number.isFinite(latest.cpm)) cpmEl.textContent = latest.cpm.toFixed(0);

        // Fokus ke seluruh jalur jika baru pertama kali dimuat.
        if (!radMap._radVHasFitted) {
            radMap.fitBounds(L.latLngBounds(latLngs), {
                padding: [30, 30]
            });
            radMap._radVHasFitted = true;
        }

        info.textContent =
            `${points.length} titik GPS | Posisi terbaru: ` +
            `${latest.lat.toFixed(6)}, ${latest.lon.toFixed(6)} | ` +
            `Update otomatis ${REFRESH_INTERVAL / 1000} detik`;
    } catch (error) {
        console.error("RAD-V Mapping Error:", error);
        info.textContent =
            "Gagal mengambil data. Pastikan Spreadsheet dapat diakses publik.";
    }
}


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatCellValue(value) {
    if (value === null || value === undefined) return "";
    return String(value);
}

function renderSpreadsheetTable(headers, rows, latIndex, lonIndex, usvIndex, cpmIndex, points) {
    const head = document.getElementById("radiationTableHead");
    const body = document.getElementById("radiationTableBody");
    const info = document.getElementById("tableInfo");

    if (!head || !body) return;

    head.innerHTML = `
        <tr>
            <th>No.</th>
            ${headers.map(h => `<th>${escapeHtml(h || "-")}</th>`).join("")}
            <th>Peta</th>
        </tr>
    `;

    body.innerHTML = "";

    if (!rows.length) {
        body.innerHTML = `
            <tr>
                <td colspan="${headers.length + 2}" class="table-empty">
                    Belum ada data pada Google Spreadsheet.
                </td>
            </tr>
        `;
        info.textContent = "0 data";
        return;
    }

    rows.forEach((row, rowIndex) => {
        const lat = Number(valueFromCell(row, latIndex));
        const lon = Number(valueFromCell(row, lonIndex));
        const usv = Number(valueFromCell(row, usvIndex));
        const cpm = Number(valueFromCell(row, cpmIndex));
        const point = window.radVPointByRowIndex
            ? window.radVPointByRowIndex[rowIndex]
            : null;

        const latestPoint = points.length ? points[points.length - 1] : null;
        const isLatest = point && latestPoint &&
            point.lat === latestPoint.lat &&
            point.lon === latestPoint.lon &&
            point === latestPoint;

        const level = radiationLevel(usv);

        const tr = document.createElement("tr");
        if (isLatest) tr.classList.add("latest-row");

        const values = headers.map((_, colIndex) => {
            const value = formatCellValue(valueFromCell(row, colIndex));

            let className = "";
            if (colIndex === usvIndex) {
                if (level === "safe") className = "radiation-low";
                if (level === "medium") className = "radiation-medium";
                if (level === "high") className = "radiation-high";
            }

            return `<td class="${className}">${escapeHtml(value)}</td>`;
        }).join("");

        tr.innerHTML = `
            <td>${rowIndex + 1}</td>
            ${values}
            <td>
                ${Number.isFinite(lat) && Number.isFinite(lon)
                    ? '<button class="table-map-button">📍 LIHAT</button>'
                    : '-'}
            </td>
        `;

        tr.addEventListener("click", () => {
            if (!Number.isFinite(lat) || !Number.isFinite(lon) || !radMap) return;

            radMap.setView([lat, lon], Math.max(radMap.getZoom(), 17));

            const marker = makeMarker(
                lat,
                lon,
                Number.isFinite(usv) ? usv : NaN,
                Number.isFinite(cpm) ? cpm : NaN,
                isLatest
            );

            marker.addTo(pointLayer);
            marker.openPopup();

            setTimeout(() => {
                if (pointLayer.hasLayer(marker)) {
                    pointLayer.removeLayer(marker);
                }
            }, 4000);
        });

        body.appendChild(tr);
    });

    info.textContent =
        `${rows.length} data | klik baris untuk melihat posisi pada peta`;
}

function updateTableOnly(data, headers, latIndex, lonIndex, usvIndex, cpmIndex, points) {
    renderSpreadsheetTable(
        headers,
        data.table.rows,
        latIndex,
        lonIndex,
        usvIndex,
        cpmIndex,
        points
    );
}

document.addEventListener("DOMContentLoaded", initRadiationMap);
