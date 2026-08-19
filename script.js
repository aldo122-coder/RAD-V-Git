// ==========================================
// MQTT
// ==========================================

const MQTT_HOST =
    "68417029aa9e4dffb745d0d102bef6be.s1.eu.hivemq.cloud";

const MQTT_PORT = 8884;

const MQTT_USERNAME = "radv";

const MQTT_PASSWORD =
    "122130148";

const CONTROL_TOPIC =
    "rc/control";

const SWITCH1_TOPIC =
    "rc/switch1";

const SWITCH2_TOPIC =
    "rc/switch2";


let mqttClient = null;

let activeControl = null;


// ==========================================
// CONNECT MQTT
// ==========================================

function connectMQTT() {

    const mqttURL =
        `wss://${MQTT_HOST}:${MQTT_PORT}/mqtt`;


    const options = {

        username: MQTT_USERNAME,

        password: MQTT_PASSWORD,

        connectTimeout: 5000,

        reconnectPeriod: 3000,

        clean: true
    };


    console.log(
        "Menghubungkan MQTT..."
    );


    mqttClient =
        mqtt.connect(
            mqttURL,
            options
        );


    mqttClient.on(
        "connect",
        function () {

            console.log(
                "MQTT Connected"
            );


            const status =
                document.getElementById(
                    "systemStatus"
                );


            if (status) {

                status.innerText =
                    "MQTT ONLINE";
            }
        }
    );


    mqttClient.on(
        "error",
        function (error) {

            console.error(
                "MQTT ERROR:",
                error
            );
        }
    );


    mqttClient.on(
        "close",
        function () {

            const status =
                document.getElementById(
                    "systemStatus"
                );


            if (status) {

                status.innerText =
                    "MQTT OFFLINE";
            }
        }
    );
}


// ==========================================
// PUBLISH MQTT
// ==========================================

function sendMQTT(
    topic,
    message
) {

    if (
        !mqttClient ||
        !mqttClient.connected
    ) {

        console.log(
            "MQTT belum terhubung"
        );

        return;
    }


    mqttClient.publish(
        topic,
        message,
        {
            qos: 0,
            retain: false
        }
    );


    console.log(
        "MQTT SEND:",
        topic,
        message
    );
}


// ==========================================
// TEKAN TOMBOL
// ==========================================

function pressControl(
    command,
    event
) {

    if (event) {

        event.preventDefault();
    }


    // Mencegah perintah berulang
    if (
        activeControl === command
    ) {

        return;
    }


    activeControl = command;


    sendMQTT(
        CONTROL_TOPIC,
        command
    );


    // Tampilan tombol
    const buttons =
        document.querySelectorAll(
            ".control-btn"
        );


    buttons.forEach(
        button => {

            button.classList.remove(
                "active"
            );
        }
    );


    if (event) {

        event.currentTarget.classList.add(
            "active"
        );
    }


    const commandDisplay =
        document.getElementById(
            "command"
        );


    if (commandDisplay) {

        commandDisplay.innerText =
            command;
    }
}


// ==========================================
// LEPAS TOMBOL
// ==========================================

function releaseControl(
    event
) {

    if (event) {

        event.preventDefault();
    }


    // Kalau tidak sedang menekan
    if (
        activeControl === null
    ) {

        return;
    }


    sendMQTT(
        CONTROL_TOPIC,
        "STOP"
    );


    activeControl = null;


    const buttons =
        document.querySelectorAll(
            ".control-btn"
        );


    buttons.forEach(
        button => {

            button.classList.remove(
                "active"
            );
        }
    );


    const commandDisplay =
        document.getElementById(
            "command"
        );


    if (commandDisplay) {

        commandDisplay.innerText =
            "STOP";
    }
}


// ==========================================
// RTB
// ==========================================

function sendRTB() {

    // RTB hanya sekali tekan

    sendMQTT(
        CONTROL_TOPIC,
        "RTB"
    );


    const commandDisplay =
        document.getElementById(
            "command"
        );


    if (commandDisplay) {

        commandDisplay.innerText =
            "RTB";
    }
}


// ==========================================
// SWITCH 1
// ==========================================

function switch1Jalan() {

    sendMQTT(
        SWITCH1_TOPIC,
        "JALAN"
    );
}


function switch1Stop() {

    sendMQTT(
        SWITCH1_TOPIC,
        "STOP"
    );
}


// ==========================================
// SWITCH 2
// ==========================================

function switch2Mengukur() {

    sendMQTT(
        SWITCH2_TOPIC,
        "MENGUKUR"
    );
}


function switch2Selesai() {

    sendMQTT(
        SWITCH2_TOPIC,
        "SELESAI"
    );
}


// ==========================================
// MQTT START
// ==========================================

connectMQTT();