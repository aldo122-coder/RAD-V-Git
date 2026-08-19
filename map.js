/* =========================================================
   RAD-V GPS MAPPING
   =========================================================

   Sumber data:
   Google Spreadsheet RAD-V

   Kolom:
   Timestamp
   CPM
   uSv/h
   Longitude
   Latitude

   Spreadsheet ID:
   1xLhZmmkAYq8_xfaccntf8GUCx0XZZ8y9Rn7KZ0Ob_2U

   Sheet:
   data

   ========================================================= */


const SPREADSHEET_ID =
    "1xLhZmmkAYq8_xfaccntf8GUCx0XZZ8y9Rn7KZ0Ob_2U";

const SHEET_NAME = "data";

const REFRESH_INTERVAL = 10000; // 10 detik


/* =========================================================
   VARIABLE LEAFLET
========================================================= */

let radMap = null;

let routeLine = null;

let pointLayer = null;

let latestMarker = null;


/* =========================================================
   INIT MAP
========================================================= */

function initRadiationMap() {

    if (typeof L === "undefined") {

        console.error(
            "Leaflet belum dimuat."
        );

        return;
    }


    /* -----------------------------------------------------
       Buat peta
    ----------------------------------------------------- */

    radMap = L.map("radMap", {

        zoomControl: true,

        attributionControl: true

    }).setView(

        [-5.35853, 105.283272],

        17

    );


    /* -----------------------------------------------------
       OpenStreetMap
    ----------------------------------------------------- */

    L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            maxZoom: 20,

            minZoom: 3,

            attribution:
                "&copy; OpenStreetMap contributors",

            tileSize: 256

        }

    ).addTo(radMap);


    /* -----------------------------------------------------
       Layer marker
    ----------------------------------------------------- */

    pointLayer = L.layerGroup().addTo(radMap);


    /* -----------------------------------------------------
       Paksa Leaflet menghitung ukuran container
    ----------------------------------------------------- */

    setTimeout(function () {

        radMap.invalidateSize();

    }, 500);


    /* -----------------------------------------------------
       Load pertama
    ----------------------------------------------------- */

    loadRadiationMap();


    /* -----------------------------------------------------
       Update otomatis
    ----------------------------------------------------- */

    setInterval(

        loadRadiationMap,

        REFRESH_INTERVAL

    );
}


/* =========================================================
   GOOGLE GVIZ URL
========================================================= */

function getGvizUrl() {

    return (
        "https://docs.google.com/spreadsheets/d/" +
        SPREADSHEET_ID +
        "/gviz/tq?tqx=out:json&sheet=" +
        encodeURIComponent(SHEET_NAME)
    );
}


/* =========================================================
   NORMALIZE HEADER
========================================================= */

function normalizeHeader(value) {

    return String(value || "")

        .toLowerCase()

        .trim()

        .replace(/[^\w]/g, "");
}


/* =========================================================
   FIND COLUMN
========================================================= */

function findColumn(headers, aliases) {

    const normalizedHeaders =
        headers.map(normalizeHeader);


    /* -----------------------------------------------------
       Exact match
    ----------------------------------------------------- */

    for (const alias of aliases) {

        const normalizedAlias =
            normalizeHeader(alias);

        const index =
            normalizedHeaders.indexOf(
                normalizedAlias
            );

        if (index !== -1) {

            return index;
        }
    }


    /* -----------------------------------------------------
       Partial match
    ----------------------------------------------------- */

    for (
        let i = 0;
        i < normalizedHeaders.length;
        i++
    ) {

        for (const alias of aliases) {

            const normalizedAlias =
                normalizeHeader(alias);

            if (
                normalizedAlias &&
                normalizedHeaders[i].includes(
                    normalizedAlias
                )
            ) {

                return i;
            }
        }
    }


    return -1;
}


/* =========================================================
   PARSE GVIZ
========================================================= */

function parseGvizResponse(text) {

    const start =
        text.indexOf("{");

    const end =
        text.lastIndexOf("}");


    if (
        start === -1 ||
        end === -1
    ) {

        throw new Error(
            "Format data Google Spreadsheet tidak dikenali."
        );
    }


    return JSON.parse(

        text.substring(
            start,
            end + 1
        )

    );
}


/* =========================================================
   GET CELL VALUE
========================================================= */

function valueFromCell(row, index) {

    if (
        index < 0 ||
        !row.c ||
        !row.c[index]
    ) {

        return null;
    }


    return row.c[index].v;
}


/* =========================================================
   RADIATION LEVEL
========================================================= */

function radiationLevel(usv) {

    if (
        !Number.isFinite(usv)
    ) {

        return "unknown";
    }


    /*
       Ambang tampilan.

       Rendah  : < 0.3 μSv/h
       Sedang  : 0.3 - <1.0 μSv/h
       Tinggi  : >= 1.0 μSv/h

       Sesuaikan dengan kriteria penelitian
       jika diperlukan.
    */

    if (usv < 0.3) {

        return "safe";
    }


    if (usv < 1.0) {

        return "medium";
    }


    return "high";
}


/* =========================================================
   MARKER COLOR
========================================================= */

function markerColor(level) {

    if (level === "safe") {

        return "#22c55e";
    }


    if (level === "medium") {

        return "#f59e0b";
    }


    if (level === "high") {

        return "#ef4444";
    }


    return "#6b7280";
}


/* =========================================================
   CREATE MARKER
========================================================= */

function makeMarker(

    lat,
    lon,
    usv,
    cpm,
    isLatest

) {

    const level =
        radiationLevel(usv);


    const color =
        isLatest
            ? "#2563eb"
            : markerColor(level);


    const marker =
        L.circleMarker(

            [lat, lon],

            {

                radius:
                    isLatest
                        ? 9
                        : 5,

                color: color,

                weight:
                    isLatest
                        ? 3
                        : 1,

                fillColor: color,

                fillOpacity: 0.8

            }

        );


    marker.bindPopup(

        `
        <div style="min-width:180px">

            <b>☢️ RAD-V</b>

            <hr style="
                border:none;
                border-top:1px solid #ddd;
                margin:6px 0;
            ">

            Latitude:
            ${lat.toFixed(6)}
            <br>

            Longitude:
            ${lon.toFixed(6)}
            <br>

            μSv/h:
            ${
                Number.isFinite(usv)
                    ? usv.toFixed(4)
                    : "-"
            }

            <br>

            CPM:
            ${
                Number.isFinite(cpm)
                    ? cpm.toFixed(2)
                    : "-"
            }

            ${
                isLatest
                    ? "<br><b>🔵 POSISI TERBARU</b>"
                    : ""
            }

        </div>
        `
    );


    return marker;
}


/* =========================================================
   LOAD RADIATION MAP
========================================================= */

async function loadRadiationMap() {

    const info =
        document.getElementById(
            "mapInfo"
        );


    try {

        if (info) {

            info.textContent =
                "Mengambil data GPS...";
        }


        /* -------------------------------------------------
           Fetch Spreadsheet
        ------------------------------------------------- */

        const response =
            await fetch(

                getGvizUrl(),

                {
                    cache: "no-store"
                }

            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const text =
            await response.text();


        const data =
            parseGvizResponse(text);


        /* -------------------------------------------------
           Header Spreadsheet
        ------------------------------------------------- */

        const headers =
            data.table.cols.map(

                col =>
                    col.label ||
                    col.id ||
                    ""

            );


        console.log(
            "Header Spreadsheet:",
            headers
        );


        /* -------------------------------------------------
           Cari kolom
        ------------------------------------------------- */

        const timestampIndex =
            findColumn(

                headers,

                [
                    "timestamp",
                    "time",
                    "tanggal",
                    "waktu"
                ]

            );


        const cpmIndex =
            findColumn(

                headers,

                [
                    "cpm",
                    "counts per minute"
                ]

            );


        const usvIndex =
            findColumn(

                headers,

                [
                    "usv/h",
                    "usv",
                    "μsv/h",
                    "µsv/h",
                    "radiation"
                ]

            );


        const lonIndex =
            findColumn(

                headers,

                [
                    "longitude",
                    "lon",
                    "lng",
                    "longitude gps",
                    "gps longitude"
                ]

            );


        const latIndex =
            findColumn(

                headers,

                [
                    "latitude",
                    "lat",
                    "latitude gps",
                    "gps latitude"
                ]

            );


        console.log(
            "Timestamp:",
            timestampIndex
        );

        console.log(
            "CPM:",
            cpmIndex
        );

        console.log(
            "uSv/h:",
            usvIndex
        );

        console.log(
            "Longitude:",
            lonIndex
        );

        console.log(
            "Latitude:",
            latIndex
        );


        /* -------------------------------------------------
           Pastikan GPS ditemukan
        ------------------------------------------------- */

        if (
            latIndex === -1 ||
            lonIndex === -1
        ) {

            throw new Error(

                "Kolom Latitude/Longitude tidak ditemukan. " +

                "Pastikan header Spreadsheet adalah " +

                "Latitude dan Longitude."

            );
        }


        /* -------------------------------------------------
           Ambil seluruh titik
        ------------------------------------------------- */

        const points = [];


        const pointByRowIndex = {};


        for (

            let rowIndex = 0;

            rowIndex <
            data.table.rows.length;

            rowIndex++

        ) {

            const row =
                data.table.rows[rowIndex];


            const lat =
                Number(

                    valueFromCell(
                        row,
                        latIndex
                    )

                );


            const lon =
                Number(

                    valueFromCell(
                        row,
                        lonIndex
                    )

                );


            const usv =
                Number(

                    valueFromCell(
                        row,
                        usvIndex
                    )

                );


            const cpm =
                Number(

                    valueFromCell(
                        row,
                        cpmIndex
                    )

                );


            /* ------------------------------------------------
               Validasi koordinat
            ------------------------------------------------ */

            if (

                Number.isFinite(lat) &&

                Number.isFinite(lon) &&

                lat >= -90 &&
                lat <= 90 &&

                lon >= -180 &&
                lon <= 180 &&

                !(lat === 0 && lon === 0)

            ) {


                const point = {

                    lat: lat,

                    lon: lon,

                    usv:
                        Number.isFinite(usv)
                            ? usv
                            : NaN,

                    cpm:
                        Number.isFinite(cpm)
                            ? cpm
                            : NaN

                };


                points.push(point);


                pointByRowIndex[
                    rowIndex
                ] = point;

            }

        }


        window.radVPointByRowIndex =
            pointByRowIndex;


        /* =================================================
           UPDATE TABLE
        ================================================= */

        updateTableOnly(

            data,

            headers,

            latIndex,

            lonIndex,

            usvIndex,

            cpmIndex,

            points

        );


        /* =================================================
           TIDAK ADA DATA GPS
        ================================================= */

        if (points.length === 0) {

            if (info) {

                info.textContent =
                    "Belum ada koordinat GPS yang valid.";
            }


            return;
        }


        /* =================================================
           CLEAR LAYER LAMA
        ================================================= */

        pointLayer.clearLayers();


        if (routeLine) {

            radMap.removeLayer(
                routeLine
            );

            routeLine = null;
        }


        if (latestMarker) {

            radMap.removeLayer(
                latestMarker
            );

            latestMarker = null;
        }


        /* =================================================
           BUAT JALUR PERJALANAN
        ================================================= */

        const latLngs =
            points.map(

                point => [

                    point.lat,

                    point.lon

                ]

            );


        routeLine =
            L.polyline(

                latLngs,

                {

                    color: "#2563eb",

                    weight: 4,

                    opacity: 0.7,

                    lineJoin: "round",

                    lineCap: "round"

                }

            ).addTo(radMap);


        /* =================================================
           BUAT MARKER
        ================================================= */

        points.forEach(

            (point, index) => {

                const isLatest =
                    index ===
                    points.length - 1;


                const marker =
                    makeMarker(

                        point.lat,

                        point.lon,

                        point.usv,

                        point.cpm,

                        isLatest

                    );


                marker.addTo(
                    pointLayer
                );

            }

        );


        /* =================================================
           DATA TERBARU
        ================================================= */

        const latest =
            points[
                points.length - 1
            ];


        /* =================================================
           MARKER POSISI TERBARU
        ================================================= */

        latestMarker =
            L.circleMarker(

                [
                    latest.lat,
                    latest.lon
                ],

                {

                    radius: 14,

                    color: "#2563eb",

                    weight: 3,

                    fillColor: "#2563eb",

                    fillOpacity: 0.15

                }

            ).addTo(radMap);


        latestMarker.bindPopup(

            `
            <div style="min-width:180px">

                <b>🔵 POSISI TERBARU RAD-V</b>

                <hr style="
                    border:none;
                    border-top:1px solid #ddd;
                    margin:6px 0;
                ">

                Latitude:
                ${latest.lat.toFixed(6)}

                <br>

                Longitude:
                ${latest.lon.toFixed(6)}

                <br>

                μSv/h:
                ${
                    Number.isFinite(latest.usv)
                        ? latest.usv.toFixed(4)
                        : "-"
                }

                <br>

                CPM:
                ${
                    Number.isFinite(latest.cpm)
                        ? latest.cpm.toFixed(2)
                        : "-"
                }

            </div>
            `
        );


        /* =================================================
           UPDATE SENSOR CARD
        ================================================= */

        const latEl =
            document.getElementById(
                "latitude"
            );


        const lonEl =
            document.getElementById(
                "longitude"
            );


        const usvEl =
            document.getElementById(
                "usv"
            );


        const cpmEl =
            document.getElementById(
                "cpm"
            );


        if (latEl) {

            latEl.textContent =
                latest.lat.toFixed(6);
        }


        if (lonEl) {

            lonEl.textContent =
                latest.lon.toFixed(6);
        }


        if (
            usvEl &&
            Number.isFinite(latest.usv)
        ) {

            usvEl.textContent =
                latest.usv.toFixed(2);
        }


        if (
            cpmEl &&
            Number.isFinite(latest.cpm)
        ) {

            cpmEl.textContent =
                latest.cpm.toFixed(0);
        }


        /* =================================================
           FIT MAP
        ================================================= */

        if (
            !radMap._radVHasFitted
        ) {

            const bounds =
                L.latLngBounds(
                    latLngs
                );


            radMap.fitBounds(

                bounds,

                {

                    padding: [
                        40,
                        40
                    ],

                    maxZoom: 18

                }

            );


            radMap._radVHasFitted =
                true;
        }


        /* =================================================
           INVALIDATE SIZE
        ================================================= */

        setTimeout(

            function () {

                radMap.invalidateSize();

            },

            100

        );


        /* =================================================
           INFO MAP
        ================================================= */

        if (info) {

            info.textContent =

                `${points.length} titik GPS | ` +

                `Posisi terbaru: ` +

                `${latest.lat.toFixed(6)}, ` +

                `${latest.lon.toFixed(6)} | ` +

                `Update otomatis ` +

                `${REFRESH_INTERVAL / 1000} detik`;

        }


    } catch (error) {


        console.error(
            "RAD-V Mapping Error:",
            error
        );


        if (info) {

            info.textContent =

                "Gagal mengambil data. " +

                "Pastikan Spreadsheet dapat diakses publik.";

        }

    }

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    return String(
        value ?? ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   FORMAT CELL
========================================================= */

function formatCellValue(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    return String(value);
}


/* =========================================================
   RENDER TABLE
========================================================= */

function renderSpreadsheetTable(

    headers,

    rows,

    latIndex,

    lonIndex,

    usvIndex,

    cpmIndex,

    points

) {

    const head =
        document.getElementById(
            "radiationTableHead"
        );


    const body =
        document.getElementById(
            "radiationTableBody"
        );


    const info =
        document.getElementById(
            "tableInfo"
        );


    if (!head || !body) {

        return;
    }


    /* -----------------------------------------------------
       HEADER
    ----------------------------------------------------- */

    head.innerHTML = `

        <tr>

            <th>No.</th>

            ${

                headers.map(

                    header =>

                        `<th>
                            ${escapeHtml(
                                header || "-"
                            )}
                        </th>`

                ).join("")

            }

            <th>Peta</th>

        </tr>

    `;


    body.innerHTML = "";


    /* -----------------------------------------------------
       EMPTY
    ----------------------------------------------------- */

    if (!rows.length) {

        body.innerHTML = `

            <tr>

                <td
                    colspan="${headers.length + 2}"
                    class="table-empty"
                >

                    Belum ada data
                    pada Google Spreadsheet.

                </td>

            </tr>

        `;


        if (info) {

            info.textContent =
                "0 data";
        }


        return;
    }


    /* -----------------------------------------------------
       DATA ROW
    ----------------------------------------------------- */

    rows.forEach(

        (row, rowIndex) => {


            const lat =
                Number(

                    valueFromCell(
                        row,
                        latIndex
                    )

                );


            const lon =
                Number(

                    valueFromCell(
                        row,
                        lonIndex
                    )

                );


            const usv =
                Number(

                    valueFromCell(
                        row,
                        usvIndex
                    )

                );


            const cpm =
                Number(

                    valueFromCell(
                        row,
                        cpmIndex
                    )

                );


            const point =
                window.radVPointByRowIndex

                    ? window.radVPointByRowIndex[
                        rowIndex
                    ]

                    : null;


            const latestPoint =
                points.length

                    ? points[
                        points.length - 1
                    ]

                    : null;


            const isLatest =

                point &&
                latestPoint &&
                point === latestPoint;


            const level =
                radiationLevel(
                    usv
                );


            const tr =
                document.createElement(
                    "tr"
                );


            if (isLatest) {

                tr.classList.add(
                    "latest-row"
                );
            }


            /* ---------------------------------------------
               CELL DATA
            --------------------------------------------- */

            const values =
                headers.map(

                    (_, colIndex) => {


                        const value =
                            formatCellValue(

                                valueFromCell(
                                    row,
                                    colIndex
                                )

                            );


                        let className =
                            "";


                        if (
                            colIndex ===
                            usvIndex
                        ) {


                            if (
                                level ===
                                "safe"
                            ) {

                                className =
                                    "radiation-low";
                            }


                            if (
                                level ===
                                "medium"
                            ) {

                                className =
                                    "radiation-medium";
                            }


                            if (
                                level ===
                                "high"
                            ) {

                                className =
                                    "radiation-high";
                            }

                        }


                        return `

                            <td
                                class="${className}"
                            >

                                ${escapeHtml(
                                    value
                                )}

                            </td>

                        `;

                    }

                ).join("");


            /* ---------------------------------------------
               ROW
            --------------------------------------------- */

            tr.innerHTML = `

                <td>
                    ${rowIndex + 1}
                </td>

                ${values}

                <td>

                    ${
                        Number.isFinite(lat) &&
                        Number.isFinite(lon)

                        ?

                        `
                        <button
                            class="table-map-button"
                            type="button"
                        >
                            📍 LIHAT
                        </button>
                        `

                        :

                        "-"
                    }

                </td>

            `;


            /* ---------------------------------------------
               CLICK ROW
            --------------------------------------------- */

            tr.addEventListener(

                "click",

                function () {


                    if (

                        !Number.isFinite(lat) ||

                        !Number.isFinite(lon) ||

                        !radMap

                    ) {

                        return;
                    }


                    /* -------------------------------------
                       Fokus koordinat
                    ------------------------------------- */

                    radMap.setView(

                        [
                            lat,
                            lon
                        ],

                        Math.max(
                            radMap.getZoom(),
                            17
                        ),

                        {
                            animate: true
                        }

                    );


                    /* -------------------------------------
                       Marker sementara
                    ------------------------------------- */

                    const marker =
                        makeMarker(

                            lat,

                            lon,

                            Number.isFinite(usv)
                                ? usv
                                : NaN,

                            Number.isFinite(cpm)
                                ? cpm
                                : NaN,

                            isLatest

                        );


                    marker.addTo(
                        pointLayer
                    );


                    marker.openPopup();


                    /* -------------------------------------
                       Hapus marker setelah 4 detik
                    ------------------------------------- */

                    setTimeout(

                        function () {

                            if (
                                pointLayer.hasLayer(
                                    marker
                                )
                            ) {

                                pointLayer.removeLayer(
                                    marker
                                );
                            }

                        },

                        4000

                    );

                }

            );


            body.appendChild(
                tr
            );

        }

    );


    if (info) {

        info.textContent =

            `${rows.length} data | ` +

            `klik baris untuk melihat ` +

            `posisi pada peta`;

    }

}


/* =========================================================
   UPDATE TABLE
========================================================= */

function updateTableOnly(

    data,

    headers,

    latIndex,

    lonIndex,

    usvIndex,

    cpmIndex,

    points

) {

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


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(

    "DOMContentLoaded",

    function () {

        initRadiationMap();

    }

);
