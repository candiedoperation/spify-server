const axios = require("axios")
const ws = require("ws");
const net = require("net");
const { isAuthorized, isAdministrator } = require("./SpifyDatabaseMiddleware");

const InitializeAPIMiddleware = (app, wss) => {
    wss.on('connection', (socket, req) => {
        /* Define Remote Endpoint */
        let endpoint;

        const destroyRemote = () => {
            if (endpoint) {
                endpoint.destroy();
            }
        }

        /* Process Errors and Disconnect */
        socket.on("error", destroyRemote);
        socket.on("close", destroyRemote);

        /* Process Events */
        socket.on('message', (message) => {
            if (message.toString().startsWith("SPIFY")) {
                let data_array = message.toString().split("\r\n");
                if (data_array[1] == "ENDPOINT") {
                    try {
                        /* Try Connecting to Endpoint */
                        endpoint = new net.Socket();
                        let tcp_address = data_array[2].split(":");
                        endpoint.connect(tcp_address[1], tcp_address[0])
                        
                        /* Message Event Listener */
                        endpoint.on("data", (remote_data) => {
                            socket.send(remote_data);
                        });

                        /* Remote Close Event Listener */
                        endpoint.on("close", () => {
                            socket.close(1000, "Remote Endpoint Closed The Connection")
                        });

                        /* Remote Errors Listener */
                        endpoint.on("error", () => {
                            socket.close(1011, "Remote Host Error Caught")
                        })
                    } catch (err) {
                        /* Close Connection with Server Error */
                        socket.close(1011, "Remote Host Connection Failed")
                    }
                }
            } else {
                if (endpoint) {
                    /* ECHO REQUEST IF ENDPOINT EXISTS */
                    endpoint.write(message)
                }
            }
        })
    });

    app.post('/api/daemondriver/online', isAuthorized, async (req, res) => {
        try {
            let endpoint = req.body.endpoint;
            let status = await axios.get(`http://${endpoint}/api/status`);
            res.status(200).json(status.data)
        } catch (err) {
            res.status(200).json({
                online: false
            })
        }
    });

    app.post('/api/daemondriver/session', isAuthorized, async (req, res) => {
        try {
            let endpoint = req.body.endpoint;
            let status = await axios.get(`http://${endpoint}/api/sessions`);
            res.status(200).json(status.data);
        } catch (err) {
            res.status(200).json({
                online: false
            });
        }
    });
}

const SpifyDaemonDriver = (app, wss) => {
    InitializeAPIMiddleware(app, wss);
}

module.exports = SpifyDaemonDriver;