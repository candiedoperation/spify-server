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

const mongoose = require('mongoose');
const SpifyDatabaseRelationshipManager = require("../middleware/SpifyDatabaseRelationshipManager");

const SpifyDbLocation = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    ldap_groups: [{ type: String }],
    spify_daemons: [{
        type: String
    }],
    createdAt: {
        type: Date,
        default: Date.now()
    }
});

/* PreRemove Calls */
SpifyDbLocation.pre("remove", SpifyDatabaseRelationshipManager.locationPreRemove)

module.exports = mongoose.model("location", SpifyDbLocation);