function locationPreRemove(next) {
    let location = this;
    location.model('user').updateMany(
        {},
        { $pull: { "locations": location._id } },
        (err, effect) => {
            if (err) next (err)
            else {
                /* LOG Database Relationship Manager Effect */
                console.log(`SPY_GRBJ_CLN: LocPreRemove affected ${effect.modifiedCount} entries.`)

                /* Proceed to Remove Loc */
                next();
            }
        }
    );
}

module.exports = { locationPreRemove }