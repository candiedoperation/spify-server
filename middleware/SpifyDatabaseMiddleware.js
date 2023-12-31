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
const { check, validationResult } = require('express-validator');
const saltMiddleware = require('./SpifySaltMiddleware');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const SpifyDbUser = require("./../models/SpifyDbUser");
const SpifyDbLocation = require("./../models/SpifyDbLocation");
const SpifyAuthenticationMethods = require('./SpifyAuthenticationMethods');

const isAuthorized = (req, res, next) => {
    try {
        res.decodedToken = parseJwtToken(req.cookies.jwtToken);
        next();
    } catch (err) {
        if (err.message === 'jwt must be provided')
            return res.status(401).json({ message: 'Unauthenticated', status: false });
        else if (err.message === "invalid token")
            return res.status(401).json({ message: 'Authentication Token is Invalid' });
        else
            res.status(500).json({
                error: err,
                message: 'SPY_VERIFY_AUTH: Internal Server Error'
            });
    }
}

const isAdministrator = (req, res, next) => {
    next();
}

const msecOf = (duration) => {
    switch (duration.charAt(duration.length - 1)) {
        case 'd':
            return (+duration.slice(0, -1)) * 86400000;
        default:
            return undefined;
    }
}

const parseJwtToken = (token) => {
    try {
        const decodedToken = jwt.verify(token, saltMiddleware.saltKey)
        return (decodedToken)
    } catch (err) {
        throw err;
    }
}

const InitializeAPIMiddleware = (app, config) => {
    const createSpifyUser = async (spifydbuser) => {
        try {
            const salt = await bcrypt.genSalt(saltMiddleware.saltRounds);
            spifydbuser.password = await bcrypt.hash(spifydbuser.password, salt);
            return await spifydbuser.save();
        } catch (err) {
            throw err;
        }
    }

    const createAdminIfNotExists = async () => {
        const admin = await SpifyDbUser.findOne({ username: 'admin' });
        if (!admin) {
            try {
                let user = await createSpifyUser(
                    new SpifyDbUser({
                        fullName: "Administrator",
                        username: "admin",
                        email: "admin@spify.local",
                        password: "admin12345"
                    })
                );

                console.log(user)
            } catch (err) {
                /* Log Error */
                console.log(`SPY_ADM_INT: InitAdministrator Create Failed ${err}`);
            }
        }
    }

    /* Create Admin User if it does not Exist */
    createAdminIfNotExists();

    app.post("/api/locations/list", isAuthorized, async (req, res) => {
        try {
            let locations = await SpifyDbLocation.find({}).select("name spify_daemons ldap_groups");
            res.status(200).send(locations);
        } catch (err) {
            res.status(500).send("SPY_LOC_LIST: Internal Server Error");
        }
    });

    app.post("/api/locations/daemons", isAuthorized, async (req, res) => {
        try {
            let location = await SpifyDbLocation.findById(req.body.loc_id).select("-_id spify_daemons");
            res.status(200).send(location.spify_daemons);
        } catch (err) {
            res.status(500).send("SPY_LOC_DAEL: Internal Server Error");
        }
    });

    app.post("/api/locations/create", [check("name", "Name is Empty").notEmpty()], isAuthorized, isAdministrator, async(req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            })
        }
        
        try {
            let new_location = new SpifyDbLocation({
                name: req.body.name,
                ldap_groups: (req.body.ldapGroups) ? req.body.ldapGroups : [],
                spify_daemons: []
            });

            await new_location.save();
            res.status(200).json({ status: true });
        } catch (err) {
            res.status(500).send("SPY_LOC_CRET: Internal Server Error");
        }
    });

    app.post("/api/locations/delete", isAuthorized, isAdministrator, async (req, res) => {
        try {
            /* Check for LocID */
            if (!req.body.loc_id) res.status(400).json({ message: "LOC_ID is Empty" });

            await SpifyDbLocation.findByIdAndRemove(req.body.loc_id);
            res.status(200).json({ status: true });
        } catch (err) {
            res.status(500).send("SPY_LOC_LIST: Internal Server Error");
        }
    });

    app.post(
        "/api/locations/add_daemon", 
        check("host", "Hostname/IP Address is Empty").notEmpty(), 
        isAuthorized, isAdministrator, 
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    errors: errors.array()
                })
            }
            
            try {
                let location = await SpifyDbLocation.findById(req.body.loc_id);
                location.spify_daemons.push(req.body.host);

                /* Save Document */
                await location.save();
                res.status(200).json({ status: true });
            } catch (err) {
                console.log(err);
                res.status(500).send("SPY_LOC_DAE+: Internal Server Error");
            }
        }
    );

    app.post(
        "/api/locations/delete_daemon", 
        [
            check("daemon_id", "DaemonID is Empty").notEmpty(),
            check("loc_id", "LocID is Empty").notEmpty()
        ], 
        isAuthorized, isAdministrator, 
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    errors: errors.array()
                })
            }
            
            try {
                await SpifyDbLocation.findByIdAndUpdate(
                    req.body.loc_id,
                    { $pull: { spify_daemons: req.body.daemon_id } }
                );
                
                /* Send Response, if success */
                res.status(200).json({ status: true });
            } catch (err) {
                console.log(err);
                res.status(500).send("SPY_LOC_DAE+: Internal Server Error");
            }
        }
    );

    app.post('/api/auth/verify', (req, res) => {
        const jwtToken = req.cookies.jwtToken;
        if (!jwtToken)
            return res.status(401).json({ message: 'Unauthenticated', status: false });

        try {
            let decodedToken = parseJwtToken(jwtToken);
            res.status(200).json({ ...decodedToken, status: true });
        } catch (err) {
            res.status(401).json({
                message: 'Authentication Token is Invalid'
            });
        }
    });

    app.post('/api/auth/logout', (req, res) => {
        res
        .status(200)
        .cookie("jwtToken", "", { httpOnly: true, maxAge: 0, secure: true, sameSite: 'none' })
        .json({ status: true })
    });

    app.post('/api/auth/login', [
        check("username", "Username is Invalid").notEmpty(),
        check("password", "Password is Invalid").isLength({ min: 8 })
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            })
        }

        try {
            /* Define Authentication State */
            let auth = { status: false };

            for (let i = 0; i < SpifyAuthenticationMethods.length; i++) {
                let authenticate = SpifyAuthenticationMethods[i];
                auth = await authenticate(req.body.username, req.body.password);
                if (auth.status == true) break;
            }

            if (auth.status == true && auth.loginUser) {
                let loginUser = auth.loginUser;
                const jwtPayload = {
                    id: loginUser.id,
                    email: loginUser.email,
                    name: loginUser.fullName
                }
    
                jwt.sign(
                    jwtPayload,
                    saltMiddleware.saltKey,
                    { expiresIn: '3d' },
                    (err, jwtToken) => {
                        if (err) throw (err)
                        res
                            .status(200)
                            .cookie("jwtToken", jwtToken, { httpOnly: true, maxAge: msecOf('3d').toString(), secure: true, sameSite: 'none' })
                            .json({ status: true })
                    }
                )
            } else {
                /* Send Response */
                res.status(401).json(auth);
            }
        } catch (err) {
            res.status(500).json({
                error: err,
                message: 'SPY_USR_LOGIN: Internal Server Error'
            });
        }
    });    
}

const SpifyDatabaseMiddleware = async (app, config) => {
    try {
        await mongoose.connect(config.mongourl);
        console.log("Connected to Mongo Database Server");
        InitializeAPIMiddleware(app, config);
    } catch(err) {
        console.log(`Connection to ${config.mongourl} failed`);
        throw err;
    }
}

module.exports = { SpifyDatabaseMiddleware, isAdministrator, isAuthorized };