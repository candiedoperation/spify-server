/*
    Spify - Cross Platform Classroom Monitoring
    Copyright (C) 2023  Atheesh Thirumalairajan

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const fs = require("fs");
const uuid = require("uuid");

const SpifyConfigVerify = (get) => {
    /* Read Config File, if get is True we return the Data */
    try {
        let config = JSON.parse(fs.readFileSync("./config.json", 'utf8'));
        if (uuid.validate(config.serverid) == false) {
            config.serverid = uuid.v4();
            fs.writeFileSync("./config.json", JSON.stringify(config));
        }

        if (get == true) return config;
        else return true;
    } catch(err) {
        console.log(err);
        return false;
    }
}

module.exports = SpifyConfigVerify;