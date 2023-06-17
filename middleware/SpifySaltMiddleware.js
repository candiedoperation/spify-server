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

const saltRounds = 6; //Change in Production
const saltKey = "spify-salt-key" //Change in Production
const isProd = false; //Change in Production
const prodxCORSOrigin = ['https://3000.local.atheesh.org:3000', 'https://10.0.0.110:3000', 'http://localhost:3000', undefined]
const prodCORSOrigin = ['https://10.0.0.110:3000']
const corsOrigin = (isProd === false) ? prodxCORSOrigin : prodCORSOrigin;

module.exports = { saltRounds, saltKey, isProd, corsOrigin };