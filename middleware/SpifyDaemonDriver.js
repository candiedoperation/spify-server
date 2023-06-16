const axios = require("axios")

const get_status = async (endpoint) => {
    try {
        let status = await axios.get(`http://${endpoint}/api/status`);
        return status.data;
    } catch (err) {
        return {
            online: false
        }
    }
}

module.exports = { get_status }