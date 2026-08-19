/* =========================================================
   RAD-V MAP.JS
   LEAFLET + GOOGLE APPS SCRIPT
========================================================= */


/* =========================================================
   KONFIGURASI
========================================================= */

// MASUKKAN URL GOOGLE APPS SCRIPT KAMU
const SCRIPT_URL =
    "MASUKKAN_URL_GAS_KAMU_DI_SINI";


/* =========================================================
   VARIABEL GLOBAL
========================================================= */

let radMap = null;

let radiationMarkers = [];

let latestMarker = null;

let mapInitialized = false;


/* =========================================================
   DEFAULT POSITION
========================================================= */

const DEFAULT_LATITUDE = -5.362586;

const DEFAULT_LONGITUDE = 105.300656;

const DEFAULT_ZOOM = 15;


/* =========================================================
   INIT MAP
========================================================= */

function initRadMap() {

    const mapElement =
        document.getElementById("radMap");


    if (!mapElement) {

        console.error(
            "ERROR: #radMap tidak ditemukan."
        );

        return;
    }


    /*
       Cegah map dibuat dua kali.
    */

    if (radMap !== null) {

        setTimeout(() => {

            radMap.invalidateSize(true);

        }, 100);

        return;
    }


    /*
       Cek Leaflet
    */

    if (typeof L === "undefined") {

        console.error(
            "ERROR: Leaflet belum dimuat."
        );

        return;
    }


    /* =====================================================
       BUAT MAP
    ===================================================== */

    radMap = L.map(
        "radMap",
        {

            center: [
                DEFAULT_LATITUDE,
                DEFAULT_LONGITUDE
            ],

            zoom: DEFAULT_ZOOM,

            zoomControl: true,

            attributionControl: true,

            preferCanvas: true,

            zoomAnimation: true,

            fadeAnimation: true,

            markerZoomAnimation: true
        }
    );


    /* =====================================================
       TILE OPENSTREETMAP
    ===================================================== */

    const osmLayer =
        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {

                maxZoom: 19,

                minZoom: 3,

                tileSize: 256,

                updateWhenIdle: true,

                updateWhenZooming: false,

                keepBuffer: 2,

                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
            }
        );


    osmLayer.addTo(radMap);


    /* =====================================================
       MAP READY
    ===================================================== */

    radMap.whenReady(function () {

        setTimeout(function () {

            radMap.invalidateSize(true);

        }, 100);

        setTimeout(function () {

            radMap.invalidateSize(true);

        }, 500);

        setTimeout(function () {

            radMap.invalidateSize(true);

        }, 1000);

    });


    mapInitialized = true;


    console.log(
        "RAD-V Leaflet Map berhasil diinisialisasi."
    );
}


/* =========================================================
   FIX MAP SIZE
========================================================= */

function fixMapSize() {

    if (!radMap) {
        return;
    }


    setTimeout(function () {

        radMap.invalidateSize(true);

    }, 50);


    setTimeout(function () {

        radMap.invalidateSize(true);

    }, 300);


    setTimeout(function () {

        radMap.invalidateSize(true);

    }, 800);
}


/* =========================================================
   GET VALUE
========================================================= */

function getValue(
    row,
    keys
) {

    for (
        let i = 0;
        i < keys.length;
        i++
    ) {

        const key = keys[i];

        if (
            row &&
            row[key] !== undefined &&
            row[key] !== null &&
            row[key] !== ""
        ) {

            return row[key];

        }

    }

    return null;
}


/* =========================================================
   GET LATITUDE
========================================================= */

function getLatitude(row) {

    /*
       Format object
    */

    let value =
        getValue(
            row,
            [
                "Latitude",
                "latitude",
                "LATITUDE",
                "Lat",
                "lat"
            ]
        );


    /*
       Jika data berupa array:
       Timestamp, CPM, uSv/h, Longitude, Latitude
    */

    if (
        value === null &&
        Array.isArray(row)
    ) {

        value = row[4];

    }


    return parseFloat(value);
}


/* =========================================================
   GET LONGITUDE
========================================================= */

function getLongitude(row) {

    let value =
        getValue(
            row,
            [
                "Longitude",
                "longitude",
                "LONGITUDE",
                "Lng",
                "lng",
                "lon"
            ]
        );


    /*
       Array:
       Timestamp, CPM, uSv/h, Longitude, Latitude
    */

    if (
        value === null &&
        Array.isArray(row)
    ) {

        value = row[3];

    }


    return parseFloat(value);
}


/* =========================================================
   GET USV
========================================================= */

function getUSV(row) {

    let value =
        getValue(
            row,
            [
                "uSv/h",
                "uSv",
                "usv",
                "USV",
                "Usv",
                "uSV"
            ]
        );


    /*
       Array:
       Timestamp, CPM, uSv/h, Longitude, Latitude
    */

    if (
        value === null &&
        Array.isArray(row)
    ) {

        value = row[2];

    }


    return parseFloat(value);
}


/* =========================================================
   GET CPM
========================================================= */

function getCPM(row) {

    let value =
        getValue(
            row,
            [
                "CPM",
                "cpm",
                "Cpm"
            ]
        );


    if (
        value === null &&
        Array.isArray(row)
    ) {

        value = row[1];

    }


    return parseFloat(value);
}


/* =========================================================
   GET TIMESTAMP
========================================================= */

function getTimestamp(row) {

    let value =
        getValue(
            row,
            [
                "Timestamp",
                "timestamp",
                "TIME",
                "time",
                "Date",
                "date"
            ]
        );


    if (
        value === null &&
        Array.isArray(row)
    ) {

        value = row[0];

    }


    return value;
}


/* =========================================================
   RADIASI LEVEL
========================================================= */

function getRadiationLevel(usv) {

    if (!Number.isFinite(usv)) {

        return "low";

    }


    /*
       Sesuaikan threshold dengan
       sistem RAD-V kamu.
    */

    if (usv < 0.3) {

        return "low";

    }


    if (usv < 1.0) {

        return "medium";

    }


    return "high";
}


/* =========================================================
   RADIASI COLOR
========================================================= */

function getRadiationColor(usv) {

    const level =
        getRadiationLevel(usv);


    if (level === "high") {

        return "#ef4444";

    }


    if (level === "medium") {

        return "#f59e0b";

    }


    return "#22c55e";
}


/* =========================================================
   CLEAR MARKERS
========================================================= */

function clearMarkers() {

    if (!radMap) {
        return;
    }


    radiationMarkers.forEach(
        function (marker) {

            radMap.removeLayer(
                marker
            );

        }
    );


    radiationMarkers = [];


    if (latestMarker) {

        radMap.removeLayer(
            latestMarker
        );

        latestMarker = null;

    }
}


/* =========================================================
   ADD RADIATION MARKER
========================================================= */

function addRadiationMarker(
    row,
    isLatest
) {

    if (!radMap) {
        return;
    }


    const latitude =
        getLatitude(row);

    const longitude =
        getLongitude(row);

    const usv =
        getUSV(row);

    const cpm =
        getCPM(row);

    const timestamp =
        getTimestamp(row);


    /*
       Validasi koordinat
    */

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {

        console.warn(
            "Koordinat tidak valid:",
            row
        );

        return;

    }


    /*
       Jangan tampilkan 0,0
    */

    if (
        latitude === 0 ||
        longitude === 0
    ) {

        return;

    }


    /* =====================================================
       MARKER TERBARU
    ===================================================== */

    if (isLatest) {

        latestMarker =
            L.circleMarker(
                [
                    latitude,
                    longitude
                ],
                {

                    radius: 9,

                    color: "#ffffff",

                    weight: 3,

                    fillColor: "#2563eb",

                    fillOpacity: 1,

                    pane: "markerPane"
                }
            );


        latestMarker.addTo(
            radMap
        );


        latestMarker.bindPopup(
            `
            <div>
                <strong>📍 POSISI TERBARU</strong>

                <br><br>

                <strong>Timestamp:</strong>
                ${timestamp ?? "-"}

                <br>

                <strong>CPM:</strong>
                ${
                    Number.isFinite(cpm)
                        ? cpm.toFixed(2)
                        : "-"
                }

                <br>

                <strong>Radiasi:</strong>
                ${
                    Number.isFinite(usv)
                        ? usv.toFixed(4)
                        : "-"
                }
                µSv/h

                <br>

                <strong>Latitude:</strong>
                ${latitude.toFixed(6)}

                <br>

                <strong>Longitude:</strong>
                ${longitude.toFixed(6)}
            </div>
            `
        );


        return;
    }


    /* =====================================================
       MARKER RADIASI
    ===================================================== */

    const color =
        getRadiationColor(usv);


    const marker =
        L.circleMarker(
            [
                latitude,
                longitude
            ],
            {

                radius: 6,

                color: "#ffffff",

                weight: 1.5,

                fillColor: color,

                fillOpacity: 0.9
            }
        );


    marker.addTo(
        radMap
    );


    marker.bindPopup(
        `
        <div>

            <strong>DATA RAD-V</strong>

            <br><br>

            <strong>Timestamp:</strong>
            ${timestamp ?? "-"}

            <br>

            <strong>CPM:</strong>
            ${
                Number.isFinite(cpm)
                    ? cpm.toFixed(2)
                    : "-"
            }

            <br>

            <strong>Radiasi:</strong>
            ${
                Number.isFinite(usv)
                    ? usv.toFixed(4)
                    : "-"
            }
            µSv/h

            <br>

            <strong>Latitude:</strong>
            ${latitude.toFixed(6)}

            <br>

            <strong>Longitude:</strong>
            ${longitude.toFixed(6)}

        </div>
        `
    );


    radiationMarkers.push(
        marker
    );
}


/* =========================================================
   UPDATE MAP
========================================================= */

function updateRadMap(data) {

    if (!radMap) {

        initRadMap();

    }


    if (!Array.isArray(data)) {

        console.error(
            "Data map bukan array:",
            data
        );

        return;

    }


    /*
       Jika kosong
    */

    if (data.length === 0) {

        console.warn(
            "Tidak ada data RAD-V."
        );

        return;

    }


    clearMarkers();


    const validPoints = [];


    /* =====================================================
       CARI SEMUA KOORDINAT VALID
    ===================================================== */

    data.forEach(
        function (row) {

            const lat =
                getLatitude(row);

            const lng =
                getLongitude(row);


            if (
                Number.isFinite(lat) &&
                Number.isFinite(lng) &&
                lat !== 0 &&
                lng !== 0
            ) {

                validPoints.push(
                    [
                        lat,
                        lng
                    ]
                );

            }

        }
    );


    console.log(
        "Jumlah koordinat valid:",
        validPoints.length
    );


    /* =====================================================
       BUAT MARKER
    ===================================================== */

    /*
       Cari data valid terakhir,
       bukan sekadar data terakhir.
    */

    let latestValidIndex = -1;


    for (
        let i = data.length - 1;
        i >= 0;
        i--
    ) {

        const lat =
            getLatitude(
                data[i]
            );

        const lng =
            getLongitude(
                data[i]
            );


        if (
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            lat !== 0 &&
            lng !== 0
        ) {

            latestValidIndex = i;

            break;

        }

    }


    data.forEach(
        function (row, index) {

            const isLatest =
                index ===
                latestValidIndex;


            addRadiationMarker(
                row,
                isLatest
            );

        }
    );


    /* =====================================================
       FIT MAP
    ===================================================== */

    if (
        validPoints.length > 0
    ) {

        const bounds =
            L.latLngBounds(
                validPoints
            );


        radMap.fitBounds(
            bounds,
            {

                paddingTopLeft: [
                    40,
                    40
                ],

                paddingBottomRight: [
                    40,
                    40
                ],

                maxZoom: 17,

                animate: false
            }
        );

    }


    /* =====================================================
       FIX SIZE
    ===================================================== */

    fixMapSize();
}


/* =========================================================
   NORMALIZE RESPONSE GAS
========================================================= */

function normalizeData(result) {

    /*
       Format:
       [
         {...},
         {...}
       ]
    */

    if (
        Array.isArray(result)
    ) {

        return result;

    }


    /*
       Format:
       {
           data: [...]
       }
    */

    if (
        result &&
        Array.isArray(
            result.data
        )
    ) {

        return result.data;

    }


    /*
       Format:
       {
           rows: [...]
       }
    */

    if (
        result &&
        Array.isArray(
            result.rows
        )
    ) {

        return result.rows;

    }


    /*
       Format:
       {
           values: [...]
       }
    */

    if (
        result &&
        Array.isArray(
            result.values
        )
    ) {

        return result.values;

    }


    return [];
}


/* =========================================================
   LOAD DATA
========================================================= */

async function loadMapData() {

    if (
        !SCRIPT_URL ||
        SCRIPT_URL ===
        "MASUKKAN_URL_GAS_KAMU_DI_SINI"
    ) {

        console.warn(
            "SCRIPT_URL belum diisi."
        );

        return;

    }


    try {

        console.log(
            "Mengambil data RAD-V..."
        );


        const response =
            await fetch(
                SCRIPT_URL +
                "?t=" +
                Date.now(),
                {

                    method: "GET",

                    cache: "no-store"
                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                "HTTP " +
                response.status
            );

        }


        const result =
            await response.json();


        console.log(
            "Response GAS:",
            result
        );


        const data =
            normalizeData(
                result
            );


        console.log(
            "Jumlah data:",
            data.length
        );


        updateRadMap(
            data
        );

    }
    catch (error) {

        console.error(
            "Gagal mengambil data RAD-V:",
            error
        );

    }
}


/* =========================================================
   REFRESH BUTTON
========================================================= */

function refreshRadMap() {

    loadMapData();

}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "DOM RAD-V siap."
        );


        /*
           Pastikan Leaflet tersedia
        */

        if (
            typeof L === "undefined"
        ) {

            console.error(
                "Leaflet tidak tersedia. Pastikan leaflet.js dimuat sebelum map.js."
            );

            return;

        }


        /*
           INIT MAP
        */

        initRadMap();


        /*
           DATA PERTAMA
        */

        loadMapData();


        /*
           UPDATE OTOMATIS
           SETIAP 10 DETIK
        */

        setInterval(
            function () {

                loadMapData();

            },
            10000
        );


        /*
           RESIZE WINDOW
        */

        window.addEventListener(
            "resize",
            function () {

                fixMapSize();

            }
        );

    }
);
