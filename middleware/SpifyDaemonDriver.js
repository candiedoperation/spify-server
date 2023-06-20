const axios = require("axios")
const ws = require("ws");
const crypto = require('crypto');
const net = require("net");
const https = require('https');
const { isAuthorized, isAdministrator } = require("./SpifyDatabaseMiddleware");
const SpifyConfigVerify = require("./SpifyConfigVerify");

const InitializeAPIMiddleware = (app, wss) => {
    /* Get Server ID From Config FIle */
    let server_id = SpifyConfigVerify(true).serverid;

    /* Serve Requests */
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

    /* Axios HTTPS Agent */
    const axiosAgent = new https.Agent({ rejectUnauthorized: false });

    app.get('/api/daemondriver/serverid', isAuthorized, isAdministrator, async (req, res) => {
        let server_id = SpifyConfigVerify(true).serverid;
        let hasher = crypto.createHash("sha256");
        
        /* Start Hash Process */
        server_id = hasher.update(server_id, 'utf-8');
        server_id = hasher.digest("hex");
        
        res.status(200).json({ serverid: server_id })
    });

    app.post('/api/daemondriver/screenshot', isAuthorized, async (req, res) => {
        try {
            let endpoint = req.body.endpoint;
            let status = await axios.get(
                `https://${endpoint}/api/screenshot`, 
                { httpsAgent: axiosAgent, responseType: 'arraybuffer', headers: { pairkey: server_id } }
            );
            
            /* Send Response */
            res.status(200).type("png").send(status.data)
        } catch (err) {
            res.status(500).json({
                error: err
            })
        }
    });

    app.post('/api/daemondriver/online', isAuthorized, async (req, res) => {
        try {
            let endpoint = req.body.endpoint;
            let status = await axios.get(
                `http://${endpoint}/api/status`, 
                { httpsAgent: axiosAgent, headers: { pairkey: server_id } }
            );

            /* Send Response */
            res.status(200).json(status.data)
        } catch (err) {
            let errorCode = 0;
            if (err.response) errorCode = err.response.status;
            
            res.status(200).json({
                errorCode,
                online: false
            })
        }
    });

    app.post('/api/daemondriver/session', isAuthorized, async (req, res) => {
        try {
            let endpoint = req.body.endpoint;
            let status = await axios.get(
                `http://${endpoint}/api/sessions`, 
                { httpsAgent: axiosAgent, headers: { pairkey: server_id } }
            );

            /* Send Response */
            res.status(200).json(status.data);
        } catch (err) {
            res.status(200).json({
                online: false
            });
        }
    });

    app.post('/api/daemondriver/power/:action', isAuthorized, async (req, res) => {
        try {
            let endpoint = req.body.endpoint;
            await axios.get(
                `https://${endpoint}/api/power/${req.params.action}`, 
                { httpsAgent: axiosAgent, headers: { pairkey: server_id } }
            );

            /* Send Response */
            res.status(200).json({ status: true });
        } catch (err) {
            res.status(500).json({ error: err });
        }
    });
}

const SpifyDaemonDriver = (app, wss) => {
    InitializeAPIMiddleware(app, wss);
}

module.exports = SpifyDaemonDriver;