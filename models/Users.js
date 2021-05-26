module.exports = (sequelize, DataTypes) => {
    return sequelize.define('users', {
        user_id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        balance: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false,
        },
        /*
        donateLimit: {
            type: DataTypes.INTEGER,
            defaultValue: 100,
        },
        donated: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        receiveLimit: {
            type: DataTypes.INTEGER,
            defaultValue: 500,
        },
        received: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        */
    }, {
        timestamps: false,
    });
};