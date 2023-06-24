const SpifyDbUser = require("../models/SpifyDbUser")
const bcrypt = require("bcryptjs");
const ldap = require("ldapjs");
const util = require("util");
const SpifyConfigVerify = require("./SpifyConfigVerify");
const { randomUUID } = require("crypto");

const LDAP = async (username, password) => {
    let config = SpifyConfigVerify(true);
    const authenticate = (ldapConnection) => {
        return new Promise((resolve) => {
            let filter = config.ldap.filter;
                let dn = `${filter.dn}=${username},${filter.base_dn}`;
                ldapConnection.bind(dn, password, async (err) => {
                    if (err) resolve({ status: false });
                    else {
                        /* Authentication Successful */
                        let loginUser = {};
                        let ldapUser = await SpifyDbUser.findOne({ username: 'ldapcontroller' });
                        let emailArray = 
                            filter.base_dn
                            .substr(filter.base_dn.search("DC"))
                            .split(",");

                        /* Try to Get User's Name From LDAP */
                        ldapConnection.search(filter.base_dn, { filter: `(${filter.dn}=${username})`, scope: 'one', attributes: filter.nameKey }, (err, res) => {
                            if (err) resolve({ status: false });
                            else {
                                let fullName = username.charAt(0).toUpperCase() + username.substr(1);
                                res.on('searchEntry', (entry) => {
                                    if (entry.pojo.attributes.length > 0) {
                                        /* NameKey Exists with Content */
                                        fullName = entry.pojo.attributes[0].values[0];
                                    }

                                    /* Set Login User */
                                    loginUser.id = ldapUser._id;
                                    loginUser.email = `${username}@${emailArray.map((e) => (e.split("DC=")[1])).join(".")}`
                                    loginUser.fullName = fullName;

                                    resolve({ status: true, loginUser })
                                })
                            }
                        });
                    }
                })
        })
    };

    if (config.ldap) {
        /* Check if an LDAP Controller User Exists */
        let ldapUser = await SpifyDbUser.findOne({ username: 'ldapcontroller' });
        if (!ldapUser) {
            ldapUser = new SpifyDbUser({
                fullName: "LDAP Controller",
                username: "ldapcontroller",
                email: "ldapcontroller@spify.local",
                password: randomUUID()
            });

            await ldapUser.save();
        }

        let ldapConnection = ldap.createClient(config.ldap.connect);
        let authResponse = await authenticate(ldapConnection);

        /* Check Promise Status */
        if (authResponse.status == true) {
            return authResponse
        } else {
            return { status: false, message: "Couldn't Find User in Directory" }
        }
    }

    return { status: false }
}

const NATIVE = async (username, password) => {
    const loginUser = await SpifyDbUser.findOne({ username })
    if (!loginUser) return { message: "Couldn't find your Spify Account.", status: false }

    const passwordMatches = await bcrypt.compare(password, loginUser.password);
    if (!passwordMatches) return { message: "Wrong Password. <b>Forgot Password</b> helps you reset it.", status: false }

    return { status: true, loginUser }
}

module.exports = [LDAP, NATIVE];