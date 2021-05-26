module.exports = (sequelize, DataTypes) => {
    return sequelize.define('daily_cooldown', {
        name: {
            type: DataTypes.STRING,
            unique: true,
            primaryKey: true
        },
        timeUntilNextUse: {
            type: DataTypes.INTEGER,
            allowNull: false,
        }
    }, {
        timestamps: false,
    });
}